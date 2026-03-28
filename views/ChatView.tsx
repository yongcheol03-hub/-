import React, { useState, useRef, useEffect } from 'react';
import { Send, ImagePlus, X, Loader2, User, Bot } from 'lucide-react';
import { generateTextResponse } from '../services/geminiService';
import { ChatMessage } from '../types';
import ReactMarkdown from 'react-markdown';

const ChatView: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: "안녕하세요! Gemini Studio 채팅입니다. 무엇이든 물어보시거나, 이미지를 업로드하여 분석을 요청해보세요.",
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        // Remove data URL prefix for API logic, keep for preview
        const base64Data = base64String.split(',')[1];
        setSelectedImage(base64Data);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !selectedImage) || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      image: selectedImage ? `data:image/jpeg;base64,${selectedImage}` : undefined,
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    const currentImage = selectedImage;
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsLoading(true);

    try {
      const responseText = await generateTextResponse(userMsg.text, currentImage || undefined);
      
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "죄송합니다. 오류가 발생했습니다. 다시 시도해주세요.",
        isError: true,
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 relative">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-4 max-w-3xl mx-auto ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'model' && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary-500 to-purple-500 flex items-center justify-center shrink-0">
                <Bot size={16} className="text-white" />
              </div>
            )}

            <div className={`flex flex-col gap-2 max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              {msg.image && (
                <img 
                  src={msg.image} 
                  alt="User upload" 
                  className="max-w-xs md:max-w-sm rounded-lg border border-slate-700 shadow-md"
                />
              )}
              <div
                className={`px-5 py-3 rounded-2xl text-sm md:text-base leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary-600 text-white rounded-tr-none'
                    : msg.isError 
                      ? 'bg-red-900/50 text-red-200 border border-red-800'
                      : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
                }`}
              >
                 <ReactMarkdown 
                    components={{
                        code(props) {
                            const {children, className, ...rest} = props;
                            return <code className={`${className} bg-black/30 rounded px-1`} {...rest}>{children}</code>
                        }
                    }}
                 >
                    {msg.text}
                 </ReactMarkdown>
              </div>
            </div>

            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
                <User size={16} className="text-slate-300" />
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-4 max-w-3xl mx-auto">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary-500 to-purple-500 flex items-center justify-center shrink-0 animate-pulse">
              <Bot size={16} className="text-white" />
            </div>
            <div className="bg-slate-800/50 px-4 py-3 rounded-2xl rounded-tl-none">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-slate-900 border-t border-slate-800">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto relative">
          {selectedImage && (
            <div className="absolute bottom-full mb-2 left-0 bg-slate-800 p-2 rounded-lg border border-slate-700 flex items-start gap-2 shadow-lg">
              <img 
                src={`data:image/jpeg;base64,${selectedImage}`} 
                alt="Preview" 
                className="h-20 w-auto rounded object-cover" 
              />
              <button
                type="button"
                onClick={() => {
                    setSelectedImage(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="p-1 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
          )}
          
          <div className="flex gap-2 items-end bg-slate-950 p-2 rounded-xl border border-slate-700 focus-within:border-primary-500 transition-colors">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-3 text-slate-400 hover:text-primary-400 hover:bg-slate-900 rounded-lg transition-colors"
              title="Upload Image"
            >
              <ImagePlus size={20} />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />
            
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="메시지를 입력하세요... (이미지 분석 가능)"
              className="flex-1 bg-transparent text-white placeholder-slate-500 resize-none py-3 focus:outline-none max-h-32 min-h-[48px]"
              rows={1}
            />
            
            <button
              type="submit"
              disabled={isLoading || (!input.trim() && !selectedImage)}
              className="p-3 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors shadow-lg shadow-primary-900/20"
            >
              {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatView;