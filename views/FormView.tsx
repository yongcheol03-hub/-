
import React, { useState, useRef, useEffect } from 'react';
import { Camera, FileSpreadsheet, Send, Save, Download, FileCheck, Trash2, X, Aperture, ImagePlus, RotateCcw, Maximize, FolderOpen, Upload, Scan } from 'lucide-react';
import { RawDataForm, INITIAL_FORM_DATA, AttachedImage } from '../types';
import JSZip from 'jszip';
import OCRModal from '../components/OCRModal';

const LabelCell = ({ children }: { children?: React.ReactNode }) => (
  <div className="bg-gray-100 p-2 text-center text-sm font-bold border border-gray-400 flex items-center justify-center break-keep">
    {children}
  </div>
);

const InputCell = ({ 
  value, 
  onChange, 
  type = "text",
  placeholder = "",
  textSize = "text-[11px]",
  onScan
}: { 
  value: string; 
  onChange: (val: string) => void;
  type?: string;
  placeholder?: string;
  textSize?: string;
  onScan?: () => void;
}) => {
  const [inputType, setInputType] = useState(type === 'date' ? 'text' : type);

  return (
  <div className="border border-gray-400 p-0.5 bg-yellow-50 flex items-center gap-0.5 min-h-[38px]">
    <input
      type={inputType}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={(e) => {
        if (type === 'date') setInputType('date');
      }}
      onBlur={(e) => {
        if (type === 'date') setInputType('text');
      }}
      placeholder={placeholder}
      className={`flex-1 min-w-0 h-full px-0.5 py-1 text-center focus:outline-none focus:bg-white ${textSize} font-bold bg-transparent tracking-tighter`}
    />
    {onScan && (
      <button 
        onClick={(e) => {
          e.preventDefault();
          onScan();
        }}
        className="shrink-0 p-1 bg-blue-600 text-white rounded shadow-sm active:scale-90 transition-all flex items-center justify-center"
        title="OCR 스캔"
      >
        <Scan size={14} strokeWidth={3} />
      </button>
    )}
  </div>
  );
};

const FormView: React.FC = () => {
  const [siteData, setSiteData] = useState<{ [key: number]: RawDataForm }>({
    1: { ...INITIAL_FORM_DATA },
    2: { ...INITIAL_FORM_DATA },
    3: { ...INITIAL_FORM_DATA },
    4: { ...INITIAL_FORM_DATA },
    5: { ...INITIAL_FORM_DATA },
  });
  
  const [activeSite, setActiveSite] = useState<number>(1);
  const [showCamera, setShowCamera] = useState(false);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [ocrTarget, setOcrTarget] = useState<keyof RawDataForm | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadFileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (showCamera && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [showCamera, cameraStream]);

  useEffect(() => {
    return () => {
        stopCamera();
    };
  }, []);

  const startCamera = async () => {
      setIsCameraLoading(true);
      setCameraError(null);
      try {
          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
              throw new Error("브라우저가 카메라 기능을 지원하지 않거나 보안 환경(HTTPS)이 아닙니다.");
          }
          const stream = await navigator.mediaDevices.getUserMedia({
              video: { 
                  facingMode: 'environment',
                  width: { ideal: 1920 },
                  height: { ideal: 1080 }
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
          } else if (err.message) {
              message = err.message;
          }
          setCameraError(message);
      } finally {
          setIsCameraLoading(false);
      }
  };

  const stopCamera = () => {
      if (cameraStream) {
          cameraStream.getTracks().forEach(track => track.stop());
          setCameraStream(null);
      }
      if (videoRef.current) {
          videoRef.current.srcObject = null;
      }
      setShowCamera(false);
  };

  const capturePhoto = () => {
      if (videoRef.current && cameraStream && showCamera) {
          const video = videoRef.current;
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
              
              const timestamp = new Date().toLocaleTimeString('ko-KR', { hour12: false }).replace(/:/g, '');
              const newImage: AttachedImage = {
                  name: `SITE${activeSite}_${timestamp}.jpg`,
                  dataUrl: dataUrl
              };
              
              setSiteData(prev => ({
                  ...prev,
                  [activeSite]: {
                      ...prev[activeSite],
                      attachedImages: [...prev[activeSite].attachedImages, newImage]
                  }
              }));
              
              const flash = document.createElement('div');
              flash.className = 'fixed inset-0 bg-white z-[60] animate-out fade-out duration-300 pointer-events-none';
              document.body.appendChild(flash);
              setTimeout(() => flash.remove(), 300);
          }
      }
  };

  const currentData = siteData[activeSite];

  const handleInputChange = (key: keyof RawDataForm, value: string) => {
    setSiteData(prev => ({
      ...prev,
      [activeSite]: {
        ...prev[activeSite],
        [key]: value
      }
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files) as File[];
      const newImages: AttachedImage[] = [];
      let processedCount = 0;

      files.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          newImages.push({
            name: file.name,
            dataUrl: reader.result as string
          });
          processedCount++;
          
          if (processedCount === files.length) {
             setSiteData(prev => ({
                ...prev,
                [activeSite]: {
                  ...prev[activeSite],
                  attachedImages: [...prev[activeSite].attachedImages, ...newImages] 
                }
             }));
          }
        };
        reader.readAsDataURL(file);
      });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const clearImages = (e: React.MouseEvent) => {
      e.stopPropagation();
      if(window.confirm(`SITE ${activeSite}의 모든 사진을 삭제하시겠습니까?`)) {
          setSiteData(prev => ({
              ...prev,
              [activeSite]: {
                  ...prev[activeSite],
                  attachedImages: []
              }
          }));
      }
  };

  const removeSpecificImage = (index: number) => {
      setSiteData(prev => {
          const newImages = [...prev[activeSite].attachedImages];
          newImages.splice(index, 1);
          return {
              ...prev,
              [activeSite]: {
                  ...prev[activeSite],
                  attachedImages: newImages
              }
          };
      });
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getSafeString = (str?: string) => str?.trim() || 'null';
  
  const getCsvFileName = (data: RawDataForm, index: number) => {
    return `SITE${index}_${getSafeString(data.receptionNumber)}_${getSafeString(data.inspectEndDate)}_${getSafeString(data.model)}_${getSafeString(data.serialNumber)}.csv`;
  };

  const generateCsvContent = (data: RawDataForm) => {
    const { attachedImages, ...csvData } = data;
    const headers = Object.keys(csvData).join(',');
    const values = Object.values(csvData).map(v => typeof v === 'string' ? v.replace(/,/g, ' ') : v).join(',');
    return "\uFEFF" + headers + "\n" + values;
  };

  const dataURLtoBlob = (dataurl: string): Blob => {
      const arr = dataurl.split(',');
      const mimeMatch = arr[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : 'image/png';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while(n--){
          u8arr[n] = bstr.charCodeAt(n);
      }
      return new Blob([u8arr], {type:mime});
  }

  const downloadImagesAsZip = async (data: RawDataForm, index: number) => {
     if (data.attachedImages.length === 0) return;
     const zip = new JSZip();
     data.attachedImages.forEach((img, idx) => {
         const blob = dataURLtoBlob(img.dataUrl);
         zip.file(`${idx+1}_${img.name}`, blob);
     });
     const content = await zip.generateAsync({ type: "blob" });
     downloadBlob(content, `SITE${index}_Images.zip`);
  };

  const handleExportExcel = async () => {
    const csvContent = generateCsvContent(currentData);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, getCsvFileName(currentData, activeSite));

    if (currentData.attachedImages.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 500)); 
        await downloadImagesAsZip(currentData, activeSite);
    }
  };

  const handleGlobalExport = async () => {
    const csvZip = new JSZip();
    for (let i = 1; i <= 5; i++) {
      const data = siteData[i];
      csvZip.file(getCsvFileName(data, i), generateCsvContent(data));
      if (data.attachedImages.length > 0) {
          await downloadImagesAsZip(data, i);
          await new Promise(r => setTimeout(r, 300));
      }
    }
    const content = await csvZip.generateAsync({ type: "blob" });
    downloadBlob(content, `전체_RAW_DATA.zip`);
  };

  // 신규: 임시 저장 파일 생성 기능
  const handleTempSave = () => {
    const dataStr = JSON.stringify(siteData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const timestamp = new Date().toISOString().replace(/[:T]/g, '_').split('.')[0];
    downloadBlob(blob, `현장데이터_백업_${timestamp}.json`);
    alert('임시 저장 파일이 생성되었습니다. 다운로드 폴더를 확인하세요.');
  };

  // 신규: 임시 저장 파일 불러오기 기능
  const handleTempLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        // 간단한 유효성 검사 (1번 사이트 데이터가 있는지 확인)
        if (json[1] && json[1].testLocation !== undefined) {
          setSiteData(json);
          alert('데이터를 성공적으로 불러왔습니다.');
        } else {
          throw new Error('Invalid Format');
        }
      } catch (err) {
        alert('올바른 백업 파일이 아닙니다.');
      }
    };
    reader.readAsText(file);
    if (loadFileInputRef.current) loadFileInputRef.current.value = '';
  };

  const handleScanClick = (target: keyof RawDataForm) => {
    stopCamera();
    setOcrTarget(target);
  };

  return (
    <div className="flex flex-col h-full font-sans bg-white text-slate-900 relative">
      
      {/* OCR Modal */}
      {ocrTarget && (
        <OCRModal 
          onClose={() => setOcrTarget(null)}
          onResult={(text) => {
            handleInputChange(ocrTarget, text);
            setOcrTarget(null);
          }}
        />
      )}

      {/* Camera Error Guide Modal */}
      {cameraError && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
                  <div className="p-6 space-y-4">
                      <div className="flex flex-col items-center gap-3 text-center">
                          <div className="p-3 bg-red-50 rounded-full">
                              <X className="w-8 h-8 text-red-500" />
                          </div>
                          <h3 className="text-lg font-bold text-slate-800">카메라 오류</h3>
                          <p className="text-sm text-slate-600 leading-relaxed">
                              {cameraError}
                          </p>
                      </div>

                      <div className="bg-slate-50 p-4 rounded-xl space-y-3">
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">해결 방법</h4>
                          <ul className="text-xs text-slate-600 space-y-2 list-disc list-inside">
                              <li>주소창 왼쪽의 <strong>자물쇠 아이콘</strong>을 클릭하여 카메라 권한을 '허용'으로 설정하세요.</li>
                              <li>브라우저 설정에서 이 사이트의 카메라 접근을 허용했는지 확인하세요.</li>
                              <li>다른 앱에서 카메라를 사용 중인지 확인하세요.</li>
                              <li>문제가 지속되면 <strong>'새 창에서 열기'</strong> 버튼을 눌러보세요.</li>
                          </ul>
                      </div>
                  </div>
                  
                  <div className="p-4 border-t bg-slate-50 flex flex-col gap-2">
                      <button 
                          onClick={() => window.open(window.location.href, '_blank')}
                          className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                      >
                          <Maximize size={18} />
                          새 창에서 열기
                      </button>
                      <button 
                          onClick={() => setCameraError(null)}
                          className="w-full py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors"
                      >
                          닫기
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Fullscreen Camera UI */}
      {showCamera && (
          <div className="fixed inset-0 z-50 bg-black flex flex-col animate-in fade-in duration-300">
              <div className="flex justify-between items-center p-4 text-white bg-black/40 backdrop-blur-sm">
                  <div className="flex flex-col">
                    <span className="font-bold text-lg">현장 촬영 모드</span>
                    <span className="text-xs text-blue-400">SITE {activeSite} 에 저장됩니다</span>
                  </div>
                  <button onClick={stopCamera} className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                      <X size={28} />
                  </button>
              </div>

              <div className="flex-1 relative bg-slate-900 flex items-center justify-center overflow-hidden">
                  <video
                      ref={videoRef}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-full object-contain"
                  />
                  <div className="absolute inset-0 border-[40px] border-black/20 pointer-events-none flex items-center justify-center">
                      <div className="w-full max-w-sm aspect-video border-2 border-dashed border-white/30 rounded-lg flex items-center justify-center">
                         <Maximize className="text-white/20" size={48} />
                      </div>
                  </div>
                  {isCameraLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black">
                          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                  )}
              </div>

              <div className="h-40 bg-black flex flex-col items-center justify-center gap-4 pb-8">
                  <div className="flex items-center gap-12">
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="p-4 bg-white/10 rounded-full text-white hover:bg-white/20"
                      >
                          <ImagePlus size={28} />
                      </button>
                      
                      <button 
                          onClick={capturePhoto}
                          className="w-24 h-24 rounded-full bg-white flex items-center justify-center active:scale-90 transition-transform border-8 border-gray-600"
                      >
                          <div className="w-16 h-16 rounded-full border-4 border-black bg-white"></div>
                      </button>

                      <button 
                          onClick={() => { stopCamera(); startCamera(); }}
                          className="p-4 bg-white/10 rounded-full text-white hover:bg-white/20"
                      >
                          <RotateCcw size={28} />
                      </button>
                  </div>
                  <span className="text-white/50 text-sm">첨부된 사진: {currentData.attachedImages.length}개</span>
              </div>
          </div>
      )}

      <header className="border-b shadow-sm sticky top-0 z-20 bg-white border-gray-300">
        <div className="p-4 flex items-center justify-between">
             <h1 className="text-lg md:text-xl font-black tracking-tighter text-gray-900 truncate">
                RAW DATA 관리 시스템
            </h1>
            <button 
                onClick={startCamera}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-full font-bold shadow-lg shadow-blue-200 active:scale-95 transition-all"
            >
                <Camera size={20} />
                <span>카메라 활성화</span>
            </button>
        </div>
        
        <div className="grid grid-cols-5 bg-gray-50 border-t">
            {[1, 2, 3, 4, 5].map(num => (
                <button
                    key={num}
                    onClick={() => setActiveSite(num)}
                    className={`py-3 text-sm font-bold border-b-4 transition-all ${
                        activeSite === num 
                        ? 'bg-white text-blue-700 border-blue-600' 
                        : 'text-gray-400 border-transparent'
                    }`}
                >
                    SITE {num}
                </button>
            ))}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 bg-gray-100">
        <div className="max-w-md mx-auto bg-white border-2 border-black p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
             <div className="mb-3 flex flex-col gap-2 bg-blue-50 p-2 border-b-2 border-blue-200">
                <div className="flex justify-between items-center">
                    <span className="font-bold text-blue-800 text-xs">SITE {activeSite} 정보 입력</span>
                    {currentData.attachedImages.length > 0 && (
                      <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-bold">
                        사진 {currentData.attachedImages.length}
                      </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-blue-900 shrink-0">시험장소:</span>
                    <div className="flex-1 flex items-center bg-white border border-blue-300 rounded-sm px-1">
                        <input 
                            type="text"
                            className="flex-1 px-1 py-1.5 text-sm font-bold focus:outline-none"
                            placeholder="장소를 입력하세요 (예: 거실, 사무실)"
                            value={currentData.testLocation}
                            onChange={(e) => handleInputChange('testLocation', e.target.value)}
                        />
                        <button 
                            onClick={() => handleScanClick('testLocation')}
                            className="shrink-0 p-1.5 bg-blue-600 text-white rounded shadow-sm active:scale-90 transition-all flex items-center justify-center"
                            title="OCR 스캔"
                        >
                            <Scan size={14} strokeWidth={3} />
                        </button>
                    </div>
                </div>
             </div>

            <div className="border-2 border-gray-400 mb-4">
                <div className="grid grid-cols-4">
                    <LabelCell>접수번호</LabelCell>
                    <div className="col-span-3 border border-gray-400 p-1 bg-yellow-50 flex items-center gap-1">
                        <input 
                            type="text" 
                            className="flex-1 h-full p-2 focus:outline-none focus:bg-white bg-transparent font-bold text-lg"
                            placeholder="번호 입력"
                            value={currentData.receptionNumber}
                            onChange={(e) => handleInputChange('receptionNumber', e.target.value)}
                        />
                        <button 
                            onClick={() => handleScanClick('receptionNumber')}
                            className="shrink-0 p-2 bg-blue-600 text-white rounded shadow-md active:scale-90 transition-all flex items-center justify-center"
                            title="OCR 스캔"
                        >
                            <Scan size={20} strokeWidth={3} />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-4 border-t border-gray-400">
                    <LabelCell>시작일</LabelCell>
                    <InputCell type="date" value={currentData.inspectStartDate} onChange={(v) => handleInputChange('inspectStartDate', v)} onScan={() => handleScanClick('inspectStartDate')} />
                    <LabelCell>종료일</LabelCell>
                    <InputCell type="date" value={currentData.inspectEndDate} onChange={(v) => handleInputChange('inspectEndDate', v)} onScan={() => handleScanClick('inspectEndDate')} />

                    <LabelCell>모델</LabelCell>
                    <InputCell value={currentData.model} onChange={(v) => handleInputChange('model', v)} onScan={() => handleScanClick('model')} />
                    <LabelCell>제조번호</LabelCell>
                    <InputCell value={currentData.serialNumber} onChange={(v) => handleInputChange('serialNumber', v)} onScan={() => handleScanClick('serialNumber')} />

                    <LabelCell>스팬필름</LabelCell>
                    <InputCell type="number" value={currentData.spanFilm} onChange={(v) => handleInputChange('spanFilm', v)} onScan={() => handleScanClick('spanFilm')} />
                    <LabelCell>중간필름</LabelCell>
                    <InputCell type="number" value={currentData.midFilm} onChange={(v) => handleInputChange('midFilm', v)} onScan={() => handleScanClick('midFilm')} />

                    <LabelCell>스팬1</LabelCell>
                    <InputCell type="number" value={currentData.span1} onChange={(v) => handleInputChange('span1', v)} onScan={() => handleScanClick('span1')} />
                    <LabelCell>유량</LabelCell>
                    <InputCell type="number" value={currentData.flowRate} onChange={(v) => handleInputChange('flowRate', v)} onScan={() => handleScanClick('flowRate')} />

                    <LabelCell>반복1</LabelCell>
                    <InputCell type="number" value={currentData.repeat1} onChange={(v) => handleInputChange('repeat1', v)} onScan={() => handleScanClick('repeat1')} />
                    <LabelCell>직선성</LabelCell>
                    <InputCell type="number" value={currentData.linearity} onChange={(v) => handleInputChange('linearity', v)} onScan={() => handleScanClick('linearity')} />

                    <LabelCell>반복2</LabelCell>
                    <InputCell type="number" value={currentData.repeat2} onChange={(v) => handleInputChange('repeat2', v)} onScan={() => handleScanClick('repeat2')} />
                    <LabelCell>공시험1</LabelCell>
                    <InputCell type="number" value={currentData.blank1} onChange={(v) => handleInputChange('blank1', v)} onScan={() => handleScanClick('blank1')} />

                    <LabelCell>반복3</LabelCell>
                    <InputCell type="number" value={currentData.repeat3} onChange={(v) => handleInputChange('repeat3', v)} onScan={() => handleScanClick('repeat3')} />
                    <LabelCell>공시험2</LabelCell>
                    <InputCell type="number" value={currentData.blank2} onChange={(v) => handleInputChange('blank2', v)} onScan={() => handleScanClick('blank2')} />

                    <LabelCell>스팬2</LabelCell>
                    <InputCell type="number" value={currentData.span2} onChange={(v) => handleInputChange('span2', v)} onScan={() => handleScanClick('span2')} />
                    <LabelCell>공시험3</LabelCell>
                    <InputCell type="number" value={currentData.blank3} onChange={(v) => handleInputChange('blank3', v)} onScan={() => handleScanClick('blank3')} />
                </div>
            </div>

            <div className="space-y-3">
                <div className="flex gap-2">
                    <button 
                        onClick={startCamera}
                        className="flex-1 bg-gray-800 text-white font-bold py-4 border-2 border-black flex flex-col items-center justify-center gap-1 active:scale-95 transition-all"
                    >
                        <Camera size={24} />
                        <span className="text-xs">직접 촬영</span>
                    </button>
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 bg-yellow-400 text-black font-bold py-4 border-2 border-black flex flex-col items-center justify-center gap-1 active:scale-95 transition-all"
                    >
                        <ImagePlus size={24} />
                        <span className="text-xs">앨범 선택</span>
                    </button>
                </div>
                
                <input type="file" ref={fileInputRef} accept="image/*" multiple className="hidden" onChange={handleFileUpload} />

                <button 
                    onClick={handleExportExcel}
                    className="w-full bg-orange-500 text-white font-black py-5 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-3 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
                >
                    <FileSpreadsheet size={28} />
                    <span className="text-lg uppercase tracking-tighter">Export Excel & Images</span>
                </button>

                {currentData.attachedImages.length > 0 && (
                    <div className="mt-4 pt-4 border-t-2 border-gray-100 animate-in slide-in-from-top duration-300">
                        <div className="flex items-center justify-between mb-3 px-1">
                            <span className="text-sm font-black text-gray-700 flex items-center gap-2">
                                <FileCheck size={16} className="text-blue-600" />
                                첨부 사진 미리보기 ({currentData.attachedImages.length})
                            </span>
                            <button 
                                onClick={clearImages}
                                className="text-[10px] font-bold text-red-500 hover:bg-red-50 px-2 py-1 rounded border border-red-100 transition-colors"
                            >
                                전체 삭제
                            </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2 pb-2">
                            {currentData.attachedImages.map((img, idx) => (
                                <div key={idx} className="relative aspect-square border-2 border-gray-200 bg-gray-50 rounded-md overflow-hidden group">
                                    <img 
                                        src={img.dataUrl} 
                                        alt={`preview-${idx}`} 
                                        className="w-full h-full object-cover"
                                    />
                                    <button 
                                        onClick={() => removeSpecificImage(idx)}
                                        className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full hover:bg-red-600 transition-colors"
                                    >
                                        <X size={12} />
                                    </button>
                                    <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-[8px] text-white px-1 py-0.5 truncate font-mono">
                                        {img.name}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
      </main>

      <footer className="p-4 bg-white border-t-4 border-black space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <button
              onClick={handleTempSave}
              className="py-4 bg-green-500 text-white border-2 border-black font-black flex items-center justify-center gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-green-600 active:shadow-none active:translate-y-[2px]"
          >
              <Save size={20} />
              <span className="text-sm">임시 데이터 저장</span>
          </button>
          
          <button
              onClick={() => loadFileInputRef.current?.click()}
              className="py-4 bg-purple-500 text-white border-2 border-black font-black flex items-center justify-center gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-purple-600 active:shadow-none active:translate-y-[2px]"
          >
              <FolderOpen size={20} />
              <span className="text-sm">데이터 불러오기</span>
          </button>
          <input 
            type="file" 
            ref={loadFileInputRef} 
            accept=".json" 
            className="hidden" 
            onChange={handleTempLoad} 
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
            <button 
                onClick={handleGlobalExport}
                className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-3 rounded border-2 border-black flex items-center justify-center gap-2 text-sm"
            >
                <Download size={18} />
                전체 출력
            </button>
            <button className="bg-blue-800 hover:bg-blue-900 text-white font-bold py-3 rounded border-2 border-black flex items-center justify-center gap-2 text-sm">
                <Send size={18} />
                전체 전송
            </button>
        </div>
      </footer>
    </div>
  );
};

export default FormView;
