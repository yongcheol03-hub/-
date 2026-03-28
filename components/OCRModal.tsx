
import React, { useState, useRef, useEffect } from 'react';
import { Camera, ImagePlus, X, Check, Crop, Loader2, RotateCcw } from 'lucide-react';
import { performOCR } from '../services/geminiService';

interface OCRModalProps {
  onClose: () => void;
  onResult: (text: string) => void;
  initialImage?: string;
}

const OCRModal: React.FC<OCRModalProps> = ({ onClose, onResult, initialImage }) => {
  const [step, setStep] = useState<'select' | 'crop' | 'loading' | 'confirm'>(initialImage ? 'crop' : 'select');
  const [image, setImage] = useState<string | null>(initialImage || null);
  const [extractedValue, setExtractedValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cropRect, setCropRect] = useState({ x: 50, y: 50, width: 200, height: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragType, setDragType] = useState<'move' | 'resize' | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    if (showCamera && cameraStream) {
      const timer = setTimeout(() => {
        if (videoRef.current) {
          const video = videoRef.current;
          video.srcObject = cameraStream;
          video.play().catch(err => {
            console.error("Video play error:", err);
          });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [showCamera, cameraStream]);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  // Load image once and set canvas size
  useEffect(() => {
    if (step === 'crop' && image) {
      const img = new Image();
      img.onload = () => {
        imgRef.current = img;
        const container = containerRef.current;
        if (!container) return;
        
        const maxWidth = container.clientWidth - 32; // padding
        const maxHeight = container.clientHeight - 32;
        
        let width = img.width;
        let height = img.height;
        
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
        
        setCanvasSize({ width, height });
        // Initial crop rect centered
        setCropRect({
          x: width * 0.05,
          y: height * 0.35,
          width: width * 0.9,
          height: height * 0.3
        });
      };
      img.src = image;
    } else {
      imgRef.current = null;
    }
  }, [step, image]);

  // Draw loop
  useEffect(() => {
    if (step === 'crop' && canvasRef.current && imgRef.current && canvasSize.width > 0) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const draw = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(imgRef.current!, 0, 0, canvas.width, canvas.height);

        // Dimmed overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.beginPath();
        ctx.rect(0, 0, canvas.width, canvas.height);
        ctx.rect(cropRect.x, cropRect.y, cropRect.width, cropRect.height);
        ctx.fill('evenodd');

        // Crop border
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 4;
        ctx.strokeRect(cropRect.x, cropRect.y, cropRect.width, cropRect.height);

        // Corner handles
        ctx.fillStyle = '#3b82f6';
        const hSize = 16;
        // Bottom-right handle
        ctx.fillRect(cropRect.x + cropRect.width - hSize/2, cropRect.y + cropRect.height - hSize/2, hSize, hSize);
        // Top-left handle
        ctx.fillRect(cropRect.x - hSize/2, cropRect.y - hSize/2, hSize, hSize);
        
        // Guide text in box
        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('인식 범위 (드래그하여 조절)', cropRect.x + cropRect.width/2, cropRect.y - 8);
      };

      draw();
    }
  }, [step, cropRect, canvasSize]);

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (step !== 'crop') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const handleSize = 30; // Larger hit area for mobile
    
    // Check resize (bottom-right or top-left)
    const isBR = x > cropRect.x + cropRect.width - handleSize && x < cropRect.x + cropRect.width + handleSize &&
                 y > cropRect.y + cropRect.height - handleSize && y < cropRect.y + cropRect.height + handleSize;
    
    const isTL = x > cropRect.x - handleSize && x < cropRect.x + handleSize &&
                 y > cropRect.y - handleSize && y < cropRect.y + handleSize;

    const isMove = x > cropRect.x && x < cropRect.x + cropRect.width &&
                   y > cropRect.y && y < cropRect.y + cropRect.height;

    if (isBR) {
      setDragType('resize');
      setIsDragging(true);
      setDragStart({ x, y });
    } else if (isTL) {
      // For simplicity, we just move or resize from BR in this basic impl, 
      // but let's allow moving if not resizing
      setDragType('move');
      setIsDragging(true);
      setDragStart({ x, y });
    } else if (isMove) {
      setDragType('move');
      setIsDragging(true);
      setDragStart({ x, y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || !canvasRef.current) return;
    if ('touches' in e) {
        // Prevent scrolling while dragging on mobile
        if (e.cancelable) e.preventDefault();
    }

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const dx = x - dragStart.x;
    const dy = y - dragStart.y;

    if (dragType === 'move') {
      setCropRect(prev => ({
        ...prev,
        x: Math.max(0, Math.min(canvas.width - prev.width, prev.x + dx)),
        y: Math.max(0, Math.min(canvas.height - prev.height, prev.y + dy))
      }));
    } else if (dragType === 'resize') {
      setCropRect(prev => ({
        ...prev,
        width: Math.max(40, Math.min(canvas.width - prev.x, prev.width + dx)),
        height: Math.max(20, Math.min(canvas.height - prev.y, prev.height + dy))
      }));
    }

    setDragStart({ x, y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragType(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImage(ev.target?.result as string);
        setStep('crop');
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("브라우저가 카메라 기능을 지원하지 않거나 보안 환경(HTTPS)이 아닙니다.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      setCameraStream(stream);
      setShowCamera(true);
    } catch (err: any) {
      console.error(err);
      let message = "카메라를 시작할 수 없습니다.";
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        message = "카메라 권한이 거부되었습니다. 브라우저 설정에서 카메라 권한을 허용해주세요.";
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        message = "카메라 장치를 찾을 수 없습니다.";
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        message = "카메라가 이미 다른 앱에서 사용 중이거나 하드웨어 오류가 발생했습니다.";
      } else if (err.message) {
        message = err.message;
      }
      setError(message);
      setShowCamera(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && cameraStream) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);
      setImage(canvas.toDataURL('image/jpeg'));
      
      // Stop camera
      cameraStream.getTracks().forEach(t => t.stop());
      setCameraStream(null);
      setShowCamera(false);
      setStep('crop');
    }
  };

  const processOCR = async () => {
    if (!image || !canvasRef.current) return;
    
    // 1. Capture the canvas and crop data IMMEDIATELY before state changes
    const canvas = canvasRef.current;
    const currentCropRect = { ...cropRect };
    
    try {
      // 2. Prepare the cropped image data BEFORE changing state
      const tempCanvas = document.createElement('canvas');
      const img = new Image();
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error("이미지를 로드할 수 없습니다."));
        img.src = image;
      });

      if (canvas.width === 0 || canvas.height === 0) {
          throw new Error("캔버스 크기가 유효하지 않습니다.");
      }

      // Calculate source coordinates based on canvas scale
      const scaleX = img.width / canvas.width;
      const scaleY = img.height / canvas.height;

      tempCanvas.width = Math.max(1, currentCropRect.width * scaleX);
      tempCanvas.height = Math.max(1, currentCropRect.height * scaleY);
      const tempCtx = tempCanvas.getContext('2d');
      
      if (!tempCtx) throw new Error("캔버스 컨텍스트를 생성할 수 없습니다.");

      tempCtx.drawImage(
        img,
        currentCropRect.x * scaleX,
        currentCropRect.y * scaleY,
        currentCropRect.width * scaleX,
        currentCropRect.height * scaleY,
        0,
        0,
        tempCanvas.width,
        tempCanvas.height
      );

      const croppedBase64 = tempCanvas.toDataURL('image/jpeg', 0.9);

      // 3. NOW set loading state
      setStep('loading');
      setError(null);

      // 4. Perform OCR
      const result = await performOCR(croppedBase64);
      
      if (!result) {
          throw new Error("텍스트를 추출하지 못했습니다. 다른 영역을 선택해 보세요.");
      }

      setExtractedValue(result);
      setStep('confirm');
    } catch (err: any) {
      console.error('OCR Process Error:', err);
      setError(err.message || '알 수 없는 오류가 발생했습니다.');
      setStep('crop');
    }
  };

  const handleConfirm = () => {
    onResult(extractedValue);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center lg:p-4 animate-in fade-in duration-200">
      {showCamera ? (
        <div className="fixed inset-0 bg-black z-[110] animate-in zoom-in-95 duration-300 overflow-hidden">
          {/* Full Screen Video Container */}
          <div className="absolute inset-0 bg-black flex items-center justify-center overflow-hidden">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="w-full h-full object-contain" 
            />
            
            {/* Camera Guide Overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-full h-full flex flex-col">
                <div className="flex-1 bg-black/40"></div>
                <div className="h-48 flex">
                  <div className="flex-1 bg-black/40"></div>
                  <div className="w-80 border-2 border-dashed border-white/80 rounded-xl relative shadow-[0_0_0_100vmax_rgba(0,0,0,0.4)]">
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-sm text-white font-bold whitespace-nowrap bg-blue-600 px-4 py-1.5 rounded-full shadow-xl">
                      글자를 이 박스 안에 맞춰주세요
                    </div>
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl-lg"></div>
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr-lg"></div>
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl-lg"></div>
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-white rounded-br-lg"></div>
                  </div>
                  <div className="flex-1 bg-black/40"></div>
                </div>
                <div className="flex-1 bg-black/40"></div>
              </div>
            </div>

            {/* Top Right Close Button */}
            <div className="absolute top-0 left-0 right-0 p-6 z-[120] flex justify-end bg-gradient-to-b from-black/60 to-transparent">
              <button 
                onClick={() => {
                  if (cameraStream) {
                    cameraStream.getTracks().forEach(t => t.stop());
                    setCameraStream(null);
                  }
                  setShowCamera(false);
                }}
                className="p-3 bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors backdrop-blur-md border border-white/10"
              >
                <X size={28} />
              </button>
            </div>
          </div>

          {/* Floating Bottom Control Bar - Absolute positioned to stay above browser UI */}
          <div className="absolute bottom-10 left-0 right-0 z-[130] flex flex-col items-center gap-6">
            <div className="flex items-center justify-center gap-12 md:gap-24">
              <button 
                onClick={() => {
                  if (cameraStream) {
                    cameraStream.getTracks().forEach(t => t.stop());
                    setCameraStream(null);
                  }
                  setShowCamera(false);
                }}
                className="flex flex-col items-center gap-2 text-white/80 hover:text-white transition-all active:scale-90"
              >
                <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center border border-white/20 backdrop-blur-xl shadow-xl">
                  <RotateCcw size={32} />
                </div>
                <span className="text-xs font-black shadow-sm">다시시도</span>
              </button>
  
              <button 
                onClick={capturePhoto}
                className="group relative flex items-center justify-center"
              >
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-white p-2 shadow-[0_0_50px_rgba(255,255,255,0.3)] active:scale-90 transition-all">
                  <div className="w-full h-full rounded-full border-4 border-slate-900 flex items-center justify-center bg-slate-50">
                     <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-blue-600/20 animate-pulse"></div>
                  </div>
                </div>
                <span className="absolute -bottom-8 text-white text-xs font-black tracking-widest bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">SHOOT</span>
              </button>
  
              <button 
                onClick={() => {
                  if (cameraStream) {
                    cameraStream.getTracks().forEach(t => t.stop());
                    setCameraStream(null);
                  }
                  setShowCamera(false);
                }}
                className="flex flex-col items-center gap-2 text-white/80 hover:text-white transition-all active:scale-90"
              >
                <div className="w-16 h-16 rounded-full bg-red-600/20 flex items-center justify-center border border-red-500/30 backdrop-blur-xl shadow-xl">
                  <X size={32} className="text-red-500" />
                </div>
                <span className="text-xs font-black shadow-sm">닫기</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white w-full h-[100dvh] lg:rounded-2xl lg:w-full lg:max-w-4xl lg:h-[80vh] lg:max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
          <div className="p-4 border-b flex items-center justify-between bg-slate-50 shrink-0 h-16">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Crop size={20} className="text-blue-600" />
              OCR 값 읽기
            </h3>
            <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
              <X size={24} className="text-slate-500" />
            </button>
          </div>

          <div className="flex-1 min-h-0 relative bg-slate-100 overflow-hidden" ref={containerRef}>
            {step === 'select' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
                <div className="flex flex-col gap-4 w-full max-w-md">
                  <button 
                    onClick={startCamera}
                    className="flex items-center justify-center gap-3 py-6 bg-blue-600 text-white rounded-2xl font-bold shadow-lg hover:bg-blue-700 transition-all active:scale-95"
                  >
                    <Camera size={32} />
                    <div className="text-left">
                      <div className="text-lg">카메라로 촬영</div>
                      <div className="text-xs font-normal opacity-80">기기 카메라를 사용하여 직접 촬영</div>
                    </div>
                  </button>
                  
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center gap-3 py-6 bg-white text-slate-800 border-2 border-slate-200 rounded-2xl font-bold hover:bg-slate-50 transition-all active:scale-95"
                  >
                    <ImagePlus size={32} className="text-blue-600" />
                    <div className="text-left">
                      <div className="text-lg">앨범에서 선택</div>
                      <div className="text-xs font-normal text-slate-500">저장된 사진 불러오기</div>
                    </div>
                  </button>
                  <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleFileSelect} />
                </div>
              </div>
            )}

            {step === 'crop' && image && (
              <div className="relative cursor-crosshair touch-none flex items-center justify-center w-full h-full p-4">
                <canvas 
                  ref={canvasRef}
                  width={canvasSize.width}
                  height={canvasSize.height}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onTouchStart={handleMouseDown}
                  onTouchMove={handleMouseMove}
                  onTouchEnd={handleMouseUp}
                  className="shadow-2xl border border-slate-300 bg-white"
                  style={{
                      width: canvasSize.width,
                      height: canvasSize.height,
                      touchAction: 'none'
                  }}
                />
                <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-black/70 text-white text-[10px] px-3 py-1.5 rounded-full pointer-events-none whitespace-nowrap backdrop-blur-sm border border-white/20">
                  파란색 박스를 조절하여 읽을 범위를 선택하세요
                </div>
              </div>
            )}

            {step === 'loading' && (
              <div className="flex flex-col items-center gap-4">
                <Loader2 size={48} className="text-blue-600 animate-spin" />
                <div className="text-slate-600 font-medium">AI가 값을 읽고 있습니다...</div>
              </div>
            )}

            {error && step !== 'loading' && (
              <div className="absolute top-4 left-4 right-4 bg-red-50 border border-red-200 p-3 rounded-xl flex flex-col gap-2 animate-in slide-in-from-top duration-300 z-10">
                <div className="flex items-center gap-3">
                  <X size={18} className="text-red-500 shrink-0" />
                  <div className="text-xs text-red-600 font-medium flex-1">{error}</div>
                  <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
                    <X size={14} />
                  </button>
                </div>
                {error.includes('카메라') && (
                  <button 
                    onClick={startCamera}
                    className="text-[10px] bg-red-600 text-white py-1 px-3 rounded-lg font-bold self-end"
                  >
                    카메라 다시 시도
                  </button>
                )}
              </div>
            )}

            {step === 'confirm' && (
              <div className="flex flex-col items-center gap-6 p-8 w-full">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                  <Check size={40} />
                </div>
                <div className="text-center space-y-2">
                  <h4 className="text-xl font-bold text-slate-800">값 추출 완료</h4>
                  <p className="text-slate-500">추출된 값이 맞는지 확인하고 수정할 수 있습니다.</p>
                </div>
                <div className="w-full space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">추출된 값</label>
                  <input 
                    type="text" 
                    value={extractedValue}
                    onChange={(e) => setExtractedValue(e.target.value)}
                    className="w-full p-4 bg-slate-50 border-2 border-blue-100 rounded-2xl text-2xl font-bold text-center text-blue-600 focus:outline-none focus:border-blue-500 transition-all"
                    autoFocus
                  />
                </div>
              </div>
            )}
          </div>

          {step === 'crop' && (
            <div className="p-4 border-t bg-white flex gap-3">
              <button 
                onClick={() => setStep('select')}
                className="flex-1 py-3 border-2 border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50"
              >
                다시 선택
              </button>
              <button 
                onClick={processOCR}
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-200"
              >
                <Check size={20} />
                값 추출하기
              </button>
            </div>
          )}
          {step === 'confirm' && (
            <div className="p-4 border-t bg-white flex gap-3">
              <button 
                onClick={() => setStep('crop')}
                className="flex-1 py-4 border-2 border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50"
              >
                다시 시도
              </button>
              <button 
                onClick={handleConfirm}
                className="flex-1 py-4 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-200"
              >
                확인 및 입력
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OCRModal;
