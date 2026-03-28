import React from 'react';
import { MessageSquare, Image as ImageIcon, Mic, Sparkles } from 'lucide-react';
import { AppMode } from '../types';

interface SidebarProps {
  currentMode: AppMode;
  onModeChange: (mode: AppMode) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentMode, onModeChange }) => {
  const navItems = [
    { id: AppMode.CHAT, icon: MessageSquare, label: 'Chat & Vision' },
    { id: AppMode.IMAGE, icon: ImageIcon, label: 'Image Studio' },
    { id: AppMode.LIVE, icon: Mic, label: 'Live Voice' },
  ];

  return (
    <div className="w-20 md:w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-full shrink-0 transition-all duration-300">
      <div className="p-6 flex items-center justify-center md:justify-start gap-3 border-b border-slate-800">
        <Sparkles className="w-8 h-8 text-primary-500" />
        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-500 to-purple-400 hidden md:block">
          Gemini Studio
        </span>
      </div>

      <nav className="flex-1 py-6 px-3 space-y-2">
        {navItems.map((item) => {
          const isActive = currentMode === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onModeChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${
                isActive
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-900/20'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon className={`w-6 h-6 ${isActive ? 'text-white' : 'group-hover:text-primary-400'}`} />
              <span className="font-medium hidden md:block">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800 hidden md:block">
        <div className="text-xs text-slate-500 text-center">
          Powered by Google Gemini 2.5
        </div>
      </div>
    </div>
  );
};

export default Sidebar;