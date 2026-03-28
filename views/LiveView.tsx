import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Radio, Volume2, AlertTriangle, Activity } from 'lucide-react';
import { getLiveClient } from '../services/geminiService';
import { createPcmBlob, decodeAudioData, base64ToUint8Array } from '../services/audioUtils';
import { LiveServerMessage, Modality } from '@google/genai';

const LiveView: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false); // Model speaking
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');

  // Audio Context Refs
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const outputNodeRef = useRef<GainNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  // Session Logic
  const sessionPromiseRef = useRef<Promise<any> | null>(null);

  const cleanupAudio = () => {
    if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current.onaudioprocess = null;
    }
    if (sourceRef.current) sourceRef.current.disconnect();
    if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    if (inputContextRef.current) inputContextRef.current.close();
    if (outputContextRef.current) outputContextRef.current.close();
    
    // Stop all playing audio
    activeSourcesRef.current.forEach(source => {
        try { source.stop(); } catch(e) {}
    });
    activeSourcesRef.current.clear();

    inputContextRef.current = null;
    outputContextRef.current = null;
    streamRef.current = null;
    sessionPromiseRef.current = null;
    nextStartTimeRef.current = 0;
  };

  const stopSession = () => {
    // There is no explicit "close" on the session promise wrapper easily accessible
    // But we can stop sending audio and close contexts.
    // The Live API relies on the connection. 
    // Since we don't have the `session` object stored globally, we rely on cleanup.
    cleanupAudio();
    setIsActive(false);
    setStatus('disconnected');
    setIsSpeaking(false);
  };

  const startSession = async () => {
    setError(null);
    setStatus('connecting');

    try {
      const ai = getLiveClient();
      
      // Initialize Audio Contexts
      inputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      outputNodeRef.current = outputContextRef.current.createGain();
      outputNodeRef.current.connect(outputContextRef.current.destination);

      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Establish Connection
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
            },
            systemInstruction: "You are a helpful, witty, and concise AI assistant. Respond in Korean.",
        },
        callbacks: {
            onopen: () => {
                console.log("Live Session Opened");
                setStatus('connected');
                setIsActive(true);

                // Start Input Streaming
                if (!inputContextRef.current || !streamRef.current) return;
                
                sourceRef.current = inputContextRef.current.createMediaStreamSource(streamRef.current);
                processorRef.current = inputContextRef.current.createScriptProcessor(4096, 1, 1);
                
                processorRef.current.onaudioprocess = (e) => {
                    const inputData = e.inputBuffer.getChannelData(0);
                    const pcmBlob = createPcmBlob(inputData);
                    
                    sessionPromise.then(session => {
                        session.sendRealtimeInput({ media: pcmBlob });
                    });
                };

                sourceRef.current.connect(processorRef.current);
                processorRef.current.connect(inputContextRef.current.destination);
            },
            onmessage: async (message: LiveServerMessage) => {
                 // Handle Audio Output
                 const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                 if (base64Audio && outputContextRef.current && outputNodeRef.current) {
                    setIsSpeaking(true);
                    
                    // Sync time
                    nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputContextRef.current.currentTime);
                    
                    const audioBuffer = await decodeAudioData(
                        base64ToUint8Array(base64Audio),
                        outputContextRef.current,
                        24000,
                        1
                    );

                    const source = outputContextRef.current.createBufferSource();
                    source.buffer = audioBuffer;
                    source.connect(outputNodeRef.current);
                    
                    source.onended = () => {
                        activeSourcesRef.current.delete(source);
                        if (activeSourcesRef.current.size === 0) {
                            setIsSpeaking(false);
                        }
                    };

                    source.start(nextStartTimeRef.current);
                    activeSourcesRef.current.add(source);
                    nextStartTimeRef.current += audioBuffer.duration;
                 }

                 // Handle Interruption
                 if (message.serverContent?.interrupted) {
                     console.log("Interrupted");
                     activeSourcesRef.current.forEach(s => s.stop());
                     activeSourcesRef.current.clear();
                     setIsSpeaking(false);
                     nextStartTimeRef.current = 0;
                 }
            },
            onclose: () => {
                console.log("Live Session Closed");
                setStatus('disconnected');
                setIsActive(false);
            },
            onerror: (err) => {
                console.error("Live Session Error", err);
                setError("연결 오류가 발생했습니다.");
                stopSession();
            }
        }
      });
      
      sessionPromiseRef.current = sessionPromise;

    } catch (err) {
      console.error(err);
      setError("마이크 권한이 필요하거나 연결에 실패했습니다.");
      setStatus('disconnected');
    }
  };

  useEffect(() => {
    return () => {
        cleanupAudio();
    };
  }, []);

  return (
    <div className="flex flex-col h-full bg-slate-950 items-center justify-center p-6 relative overflow-hidden">
      {/* Background Ambience */}
      <div className={`absolute inset-0 transition-opacity duration-1000 ${isActive ? 'opacity-100' : 'opacity-20'}`}>
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-900/20 blur-[120px] rounded-full animate-pulse-slow"></div>
         {isSpeaking && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-purple-600/20 blur-[100px] rounded-full animate-pulse"></div>
         )}
      </div>

      <div className="z-10 flex flex-col items-center gap-8 max-w-md w-full">
        <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
                <Radio className={`${isActive ? 'text-red-500 animate-pulse' : 'text-slate-600'}`} />
                Gemini Live Voice
            </h2>
            <p className="text-slate-400">
                실시간으로 대화하세요. 언제든지 말을 끊고 다시 질문할 수 있습니다.
            </p>
        </div>

        {/* Visualizer Circle */}
        <div className="relative">
            <div className={`w-48 h-48 rounded-full border-4 flex items-center justify-center transition-all duration-500 ${
                status === 'connected' 
                ? isSpeaking ? 'border-purple-500 shadow-[0_0_50px_rgba(168,85,247,0.4)] scale-110' : 'border-primary-500 shadow-[0_0_30px_rgba(59,130,246,0.3)]'
                : 'border-slate-800 bg-slate-900'
            }`}>
                {status === 'connecting' ? (
                    <div className="w-12 h-12 border-4 border-slate-600 border-t-primary-500 rounded-full animate-spin"></div>
                ) : isActive ? (
                    <div className="flex gap-1.5 items-center h-12">
                         {/* Fake Waveform Animation */}
                         {[1,2,3,4,5].map(i => (
                             <div key={i} className={`w-2 bg-white rounded-full transition-all duration-100 ${isSpeaking ? 'animate-[bounce_0.5s_infinite]' : 'h-2'}`} style={{ height: isSpeaking ? Math.random() * 40 + 10 : 8, animationDelay: `${i * 0.1}s` }}></div>
                         ))}
                    </div>
                ) : (
                    <MicOff size={48} className="text-slate-700" />
                )}
            </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-4 w-full">
            {error && (
                <div className="flex items-center gap-2 text-red-400 bg-red-950/50 p-3 rounded-lg border border-red-900 justify-center">
                    <AlertTriangle size={18} />
                    <span className="text-sm">{error}</span>
                </div>
            )}
            
            <button
                onClick={isActive ? stopSession : startSession}
                disabled={status === 'connecting'}
                className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-3 shadow-lg ${
                    isActive 
                    ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-900/30' 
                    : 'bg-primary-600 hover:bg-primary-500 text-white shadow-primary-900/30'
                }`}
            >
                {isActive ? (
                    <>
                        <MicOff /> End Conversation
                    </>
                ) : (
                    <>
                        <Mic /> Start Conversation
                    </>
                )}
            </button>
            
            <div className="flex justify-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1"><Activity size={12}/> Low Latency</span>
                <span className="flex items-center gap-1"><Volume2 size={12}/> Natural Voice</span>
            </div>
        </div>
      </div>
    </div>
  );
};

export default LiveView;