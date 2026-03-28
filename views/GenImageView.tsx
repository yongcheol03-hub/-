import React, { useState } from 'react';
import { Sparkles, Download, Loader2, AlertCircle } from 'lucide-react';
import { generateImage } from '../services/geminiService';
import { GeneratedImage } from '../types';

const GenImageView: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<GeneratedImage | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const base64Url = await generateImage(prompt);
      setGeneratedImage({
        id: Date.now().toString(),
        url: base64Url,
        prompt: prompt,
        createdAt: Date.now(),
      });
    } catch (err) {
      setError("이미지를 생성하는 도중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 p-6 md:p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-white">Image Studio</h1>
          <p className="text-slate-400">Gemini의 상상력으로 이미지를 만들어보세요.</p>
        </div>

        {/* Input Section */}
        <div className="bg-slate-900 p-2 rounded-2xl border border-slate-800 shadow-xl">
          <form onSubmit={handleGenerate} className="flex flex-col md:flex-row gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="예: '사이버펑크 서울의 밤거리, 네온 사인, 비 내리는 거리'"
              className="flex-1 bg-slate-950 text-white placeholder-slate-500 px-6 py-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all border border-slate-800"
            />
            <button
              type="submit"
              disabled={isGenerating || !prompt.trim()}
              className="bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary-900/20"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="animate-spin" />
                  <span>생성 중...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>생성하기</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Result Section */}
        <div className="min-h-[400px] flex items-center justify-center">
          {error && (
            <div className="flex flex-col items-center gap-3 text-red-400 bg-red-950/30 p-6 rounded-2xl border border-red-900/50">
              <AlertCircle size={32} />
              <p>{error}</p>
            </div>
          )}

          {!generatedImage && !isGenerating && !error && (
            <div className="text-center text-slate-600 space-y-4">
              <div className="w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center mx-auto border border-slate-800">
                <Sparkles size={40} className="text-slate-700" />
              </div>
              <p>프롬프트를 입력하여 이미지를 생성하세요</p>
            </div>
          )}

          {isGenerating && (
             <div className="flex flex-col items-center gap-4">
                <div className="relative w-24 h-24">
                    <div className="absolute inset-0 border-4 border-slate-800 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <p className="text-slate-400 animate-pulse">Gemini가 그림을 그리고 있습니다...</p>
             </div>
          )}

          {generatedImage && (
            <div className="w-full animate-in fade-in zoom-in duration-500">
              <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-2xl">
                <div className="aspect-square w-full relative group overflow-hidden rounded-xl bg-black">
                  <img
                    src={generatedImage.url}
                    alt={generatedImage.prompt}
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                    <a
                      href={generatedImage.url}
                      download={`gemini-generated-${generatedImage.createdAt}.png`}
                      className="p-3 bg-white text-black rounded-full hover:scale-110 transition-transform"
                      title="Download"
                    >
                      <Download size={24} />
                    </a>
                  </div>
                </div>
                <div className="mt-4 px-2">
                    <p className="text-sm text-slate-400 font-mono">Prompt:</p>
                    <p className="text-white mt-1">{generatedImage.prompt}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GenImageView;