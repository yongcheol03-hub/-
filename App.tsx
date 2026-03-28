
import React, { useState } from 'react';
import FormView from './views/FormView';
import { Lock, ShieldCheck, HelpCircle, X, Smartphone, Share, Menu, PlusSquare, Code } from 'lucide-react';
import { downloadSourceCode } from './utils/projectBackup';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '1004') {
      setIsAuthenticated(true);
      setError(false);
    } else {
      setError(true);
      setPassword('');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 relative">
        <div className="w-full max-w-sm bg-white shadow-2xl rounded-2xl p-8 border border-slate-200 relative z-10">
          <div className="flex flex-col items-center gap-4 mb-8">
            <div className="p-5 bg-blue-50 rounded-full ring-1 ring-blue-100">
                <Lock className="w-10 h-10 text-blue-600" />
            </div>
            <div className="text-center space-y-1">
              <h1 className="text-2xl font-bold text-slate-800">보안 접속</h1>
              <p className="text-slate-500 text-sm">KTL 환경기기센터 실내공기질</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(false);
                }}
                placeholder="비밀번호 4자리"
                className={`w-full px-4 py-4 rounded-xl border-2 text-center text-2xl font-bold tracking-[0.5em] transition-all focus:outline-none placeholder:tracking-normal placeholder:text-lg placeholder:font-normal placeholder:text-slate-400
                  ${error 
                    ? 'border-red-300 bg-red-50 focus:border-red-500 text-red-600' 
                    : 'border-slate-200 bg-slate-50 focus:border-blue-500 focus:bg-white text-slate-800'
                  }`}
                autoFocus
                maxLength={4}
              />
              {error && (
                <p className="text-red-500 text-xs text-center font-bold animate-pulse">
                  비밀번호가 올바르지 않습니다.
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-lg font-bold rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98]"
            >
              접속하기
            </button>
          </form>
          
          <div className="mt-8 flex flex-col items-center gap-3">
             <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                <ShieldCheck size={14} />
                <span>Secure Application Gate</span>
            </div>
            
            <button 
                onClick={() => setShowInstallGuide(true)}
                className="w-full text-sm text-slate-600 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all"
            >
                <HelpCircle size={18} />
                <span>앱 설치 방법 (홈 화면 추가)</span>
            </button>

            <button 
                onClick={downloadSourceCode}
                className="w-full text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-50 border border-transparent hover:border-slate-200 flex items-center justify-center gap-2 px-4 py-2 rounded-xl transition-all"
            >
                <Code size={16} />
                <span>개발자용 소스코드 다운로드 (.zip)</span>
            </button>
          </div>
        </div>

        {/* Install Guide Modal */}
        {showInstallGuide && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white rounded-2xl w-full max-w-sm max-h-[80vh] overflow-y-auto shadow-2xl">
                    <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
                        <h3 className="font-bold text-lg flex items-center gap-2">
                            <Smartphone size={20} className="text-blue-600"/>
                            앱 설치 가이드
                        </h3>
                        <button onClick={() => setShowInstallGuide(false)} className="p-1 hover:bg-slate-100 rounded-full">
                            <X size={24} className="text-slate-500" />
                        </button>
                    </div>
                    
                    <div className="p-5 space-y-6">
                        {/* Android Guide */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-green-700 font-bold border-b border-green-100 pb-1">
                                <span>Android (삼성 갤럭시 등)</span>
                            </div>
                            <ol className="text-sm text-slate-600 space-y-2 list-decimal list-inside marker:font-bold marker:text-green-600">
                                <li><strong>Chrome</strong> 브라우저로 접속합니다.</li>
                                <li>우측 상단 <strong>점 3개 메뉴 <Menu size={12} className="inline"/></strong>를 누릅니다.</li>
                                <li><strong>"홈 화면에 추가"</strong> 또는 <strong>"앱 설치"</strong>를 선택합니다.</li>
                                <li>추가 버튼을 누르면 바탕화면에 아이콘이 생성됩니다.</li>
                            </ol>
                        </div>

                        {/* iOS Guide */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-slate-800 font-bold border-b border-slate-100 pb-1">
                                <span>iOS (아이폰)</span>
                            </div>
                            <ol className="text-sm text-slate-600 space-y-2 list-decimal list-inside marker:font-bold marker:text-slate-800">
                                <li><strong>Safari</strong> 브라우저로 접속합니다. (크롬 불가)</li>
                                <li>하단 중앙의 <strong>공유 버튼 <Share size={12} className="inline"/></strong>을 누릅니다.</li>
                                <li>스크롤을 아래로 내려 <strong>"홈 화면에 추가" <PlusSquare size={12} className="inline"/></strong>를 누릅니다.</li>
                                <li>우측 상단 '추가'를 누르면 완료됩니다.</li>
                            </ol>
                        </div>

                        <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-700 leading-relaxed">
                            <strong>💡 설치하면 좋은 점</strong><br/>
                            주소창 없이 넓은 화면으로 사용할 수 있으며, 바탕화면 아이콘으로 빠르게 접속할 수 있습니다.
                        </div>
                    </div>
                    
                    <div className="p-4 border-t bg-slate-50 sticky bottom-0">
                        <button 
                            onClick={() => setShowInstallGuide(false)}
                            className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors"
                        >
                            확인했습니다
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center">
      <div className="w-full max-w-md md:max-w-2xl lg:max-w-4xl bg-white shadow-2xl overflow-hidden min-h-screen flex flex-col">
        <FormView />
      </div>
    </div>
  );
};

export default App;
