import React, { useState, useRef, useEffect } from 'react';
import { AppMode, RoomState, Language, LANGUAGES, AudioSource, EmotionType, EMOTION_COLORS } from '../types';
import { ChevronDown, Mic, Hand, X, Lock, Play, Share2, LogOut, ChevronUp, Volume2, Loader2, Globe, Sparkles } from 'lucide-react';

interface TranslatorDockProps {
  mode: AppMode;
  roomState: RoomState;
  selectedLanguage: Language; // Restored
  myUserId: string;
  onSpeakToggle: () => void;
  onListenToggle: () => void; // Restored
  onLanguageChange: (lang: Language) => void; // Restored
  onRaiseHand: () => void;
  audioData?: Uint8Array;
  audioSource?: AudioSource;
  onAudioSourceToggle?: () => void;
  liveStreamText?: string;
  translatedStreamText?: string;
  isTtsLoading?: boolean;
  emotion?: EmotionType;
  onJoin?: (meetingId: string) => void;
  meetingId?: string | null;
  onInvite?: () => void;
  isSignedIn: boolean;
  onAuthToggle: (meetingId?: string) => void;
  isMinimized: boolean;
  onMinimizeToggle: () => void;
  transcriptionEngine?: 'webspeech' | 'deepgram' | 'gemini';
  onEngineChange?: (engine: 'webspeech' | 'deepgram' | 'gemini') => void;
  audioDevices?: MediaDeviceInfo[];
  selectedDeviceId?: string;
  onDeviceIdChange?: (deviceId: string) => void;
  audioOutputDevices?: MediaDeviceInfo[];
  selectedOutputDeviceId?: string;
  onOutputDeviceIdChange?: (deviceId: string) => void;
}

const AudioVisualizer: React.FC<{ data: Uint8Array; colorClass?: string }> = ({ data, colorClass = 'bg-white' }) => {
  if (!data || data.length === 0) return null;
  const barsArr = Array.from(data.slice(3, 11));
  const hasSignal = barsArr.some((v: number) => v > 4);
  if (!hasSignal) return null;

  return (
    <div className="flex items-center gap-[1.5px] h-3 ml-2.5">
      {barsArr.map((val, i) => (
        <Bar key={i} val={val} colorClass={colorClass} />
      ))}
    </div>
  );
};

const Bar: React.FC<{ val: number; colorClass: string }> = ({ val, colorClass }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const height = Math.max(2, (val / 255) * 14);
  const opacity = 0.3 + (val / 255) * 0.7;

  React.useLayoutEffect(() => {
    if (ref.current) {
      ref.current.style.height = `${height}px`;
      ref.current.style.opacity = `${opacity}`;
    }
  }, [height, opacity]);

  return <div ref={ref} className={`w-[1.8px] ${colorClass} rounded-full transition-all duration-100 ease-out`} />;
};

const TranslatorDock: React.FC<TranslatorDockProps> = ({
  mode,
  roomState,
  selectedLanguage,
  myUserId,
  onSpeakToggle,
  onListenToggle,
  onLanguageChange,
  onRaiseHand,
  onJoin,
  meetingId,
  onInvite,
  isSignedIn,
  onAuthToggle,
  isMinimized,
  onMinimizeToggle,
  liveStreamText,
  // New props
  audioData,
  audioSource,
  onAudioSourceToggle,
  translatedStreamText,
  isTtsLoading,
  emotion,
  transcriptionEngine = 'webspeech',
  onEngineChange,
  audioDevices = [],
  selectedDeviceId = '',
  onDeviceIdChange,
  audioOutputDevices = [],
  selectedOutputDeviceId = '',
  onOutputDeviceIdChange
}) => {
  const [meetingIdInput, setMeetingIdInput] = React.useState(meetingId || '');
  const [isLangOpen, setIsLangOpen] = React.useState(false);
  const [isDeviceOpen, setIsDeviceOpen] = React.useState(false);
  
  // Update local input if external meetingId changes
  React.useEffect(() => {
    if (meetingId) setMeetingIdInput(meetingId);
  }, [meetingId]);

  const handleStart = () => {
    if (isSignedIn && onJoin && meetingIdInput.trim()) {
      onJoin(meetingIdInput.trim());
    } else if (!isSignedIn && meetingIdInput.trim()) {
       onAuthToggle(meetingIdInput.trim());
    } else if (!isSignedIn) {
       onAuthToggle(); 
    }
  };
  const isSomeoneElseSpeaking = roomState.activeSpeaker && roomState.activeSpeaker.userId !== myUserId;
  const isMeSpeaking = mode === 'speaking';
  const isListening = mode === 'listening';
  
  const myQueuePosition = roomState.raiseHandQueue.findIndex(q => q.userId === myUserId);
  const isQueued = myQueuePosition !== -1;

  // Language Dropdown Logic
  const langMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
        setIsLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <>
      {/* Minimize/Restore Toggle Tab */}
      <div className={`fixed top-0 left-1/2 -translate-x-1/2 z-[60] transition-all duration-300 ${isMinimized ? 'translate-y-0' : 'translate-y-[60px]'}`}>
        <button
          onClick={onMinimizeToggle}
          title={isMinimized ? "Show Toolbar" : "Hide Toolbar"}
          className="bg-[#1a2333] hover:bg-[#25324a] text-slate-400 hover:text-white rounded-b-lg px-3 py-1 border-x border-b border-white/5 shadow-lg transition-colors flex items-center justify-center"
        >
          {isMinimized ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      <header 
        className={`fixed top-0 left-0 right-0 h-[60px] bg-[#1a2333]/95 backdrop-blur-2xl border-b border-white/5 z-50 flex items-center justify-center px-4 transition-transform duration-300 ${isMinimized ? '-translate-y-full' : 'translate-y-0'}`} 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-stretch h-full w-full max-w-5xl">
        
        {/* Speak Now Button */}
        <div className="relative flex-1 flex items-stretch border-r border-white/5">
          <button
            onClick={onSpeakToggle}
            disabled={!!(isSomeoneElseSpeaking && !isMeSpeaking)}
            className={`flex-1 flex items-center justify-center gap-3 px-4 transition-all disabled:opacity-30 ${
              isMeSpeaking ? 'bg-red-500/90 text-white animate-live-pulse' : 'hover:bg-white/5 text-slate-300'
            }`}
          >
            {isMeSpeaking ? <X className="w-4 h-4" /> : (isSomeoneElseSpeaking ? <Lock className="w-4 h-4 opacity-40" /> : <Mic className="w-4 h-4" />)}
            <span className="font-bold text-[16px] tracking-tight">Speak Now</span>
          </button>

          {/* Device Selection Toggle */}
          <button
            onClick={() => setIsDeviceOpen(!isDeviceOpen)}
            className={`px-3 hover:bg-white/5 text-slate-400 border-l border-white/5 flex items-center justify-center transition-colors ${isDeviceOpen ? 'bg-white/5' : ''}`}
            title="Audio Input Settings"
          >
            <ChevronDown className={`w-3 h-3 transition-transform ${isDeviceOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Device Dropdown */}
          {isDeviceOpen && (
            <div className="absolute top-[65px] left-0 right-0 bg-[#1a2333]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-[100] min-w-[240px]">
              <div className="p-2 flex flex-col gap-1">
                <div className="px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/5 mb-1 flex items-center justify-between">
                  <span>Microphone Source</span>
                  <Sparkles className="w-3 h-3 text-emerald-500/50" />
                </div>
                {audioDevices.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-slate-400 italic">No devices found</div>
                ) : (
                  audioDevices.map((device) => (
                    <button
                      key={device.deviceId}
                      onClick={() => {
                        onDeviceIdChange?.(device.deviceId);
                        setIsDeviceOpen(false);
                      }}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                        selectedDeviceId === device.deviceId 
                        ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20' 
                        : 'hover:bg-white/5 text-slate-300'
                      }`}
                    >
                      <Mic className={`w-3.5 h-3.5 ${selectedDeviceId === device.deviceId ? 'text-emerald-400' : 'text-slate-500'}`} />
                      <span className="text-xs font-medium truncate flex-1">{device.label || `Microphone ${device.deviceId.slice(0, 5)}...`}</span>
                      {selectedDeviceId === device.deviceId && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />}
                    </button>
                  ))
                )}
                
                {/* Output Device Selection */}
                <div className="px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-t border-b border-white/5 my-1 flex items-center justify-between">
                  <span>Speaker Output</span>
                  <Volume2 className="w-3 h-3 text-emerald-500/50" />
                </div>
                {audioOutputDevices.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-slate-400 italic">No output devices found</div>
                ) : (
                  audioOutputDevices.map((device) => (
                    <button
                      key={device.deviceId}
                      onClick={() => {
                        onOutputDeviceIdChange?.(device.deviceId);
                        setIsDeviceOpen(false);
                      }}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                        selectedOutputDeviceId === device.deviceId 
                        ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20' 
                        : 'hover:bg-white/5 text-slate-300'
                      }`}
                    >
                      <Volume2 className={`w-3.5 h-3.5 ${selectedOutputDeviceId === device.deviceId ? 'text-emerald-400' : 'text-slate-500'}`} />
                      <span className="text-xs font-medium truncate flex-1">{device.label || `Speaker ${device.deviceId.slice(0, 5)}...`}</span>
                      {selectedOutputDeviceId === device.deviceId && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />}
                    </button>
                  ))
                )}

                {/* Visualizer inside dropdown when speaking */}
                {isMeSpeaking && audioData && (
                  <div className="mt-1 px-3 py-2 bg-black/20 rounded-lg flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Input Signal</span>
                    <AudioVisualizer data={audioData} colorClass="bg-emerald-400" />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Listen Translation Button & Language Selector */}
        <div className="relative flex-1 flex flex-col items-stretch border-r border-white/5 group">
             {/* Main Listen Button */}
            <div className="flex-1 flex items-stretch">
                <button
                    onClick={onListenToggle}
                    className={`flex-1 flex items-center justify-center gap-3 px-4 transition-all ${
                    isListening ? 'bg-emerald-500/10 text-emerald-400' : 'hover:bg-white/5 text-slate-300'
                    }`}
                >
                    {isListening ? <Volume2 className="w-4 h-4 animate-pulse" /> : <Globe className="w-4 h-4" />}
                    <span className="font-bold text-[16px] tracking-tight">Listen Translation</span>
                </button>
                
                {/* Engine Toggle */}
                <button
                    onClick={() => {
                        if (transcriptionEngine === 'webspeech') onEngineChange?.('deepgram');
                        else if (transcriptionEngine === 'deepgram') onEngineChange?.('gemini');
                        else onEngineChange?.('webspeech');
                    }}
                    className={`px-3 hover:bg-white/5 border-l border-white/5 flex items-center justify-center transition-colors ${
                        transcriptionEngine === 'gemini' ? 'text-emerald-400' : (transcriptionEngine === 'deepgram' ? 'text-purple-400' : 'text-slate-400')
                    }`}
                    title={`Engine: ${transcriptionEngine === 'gemini' ? 'Eburon Live' : (transcriptionEngine === 'deepgram' ? 'Eburon Pro' : 'Eburon Standard')}`}
                >
                    <span className="text-[10px] font-bold tracking-wider mr-1 uppercase">
                        {transcriptionEngine === 'gemini' ? 'LIVE' : (transcriptionEngine === 'deepgram' ? 'PRO' : 'STD')}
                    </span>
                    <Sparkles className={`w-3 h-3 ${transcriptionEngine !== 'webspeech' ? 'fill-current' : ''}`} />
                </button>

                {/* Language Trigger */}
                <button
                    onClick={() => setIsLangOpen(!isLangOpen)}
                    className="px-3 hover:bg-white/5 text-slate-400 border-l border-white/5 flex items-center justify-center transition-colors"
                    title="Select Language"
                >
                    <span className="mr-2 text-xs font-medium">{selectedLanguage.flag}</span>
                    <ChevronDown className={`w-3 h-3 transition-transform ${isLangOpen ? 'rotate-180' : ''}`} />
                </button>
            </div>

             {/* Language Dropdown - "Below the listen translation" */}
             {isLangOpen && (
                <div ref={langMenuRef} className="absolute top-[65px] left-0 right-0 bg-[#1a2333]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-[100] max-h-[60vh] overflow-y-auto">
                     {/* Search or Categories could go here, but implementing flat list for now */}
                     <div className="p-2 grid grid-cols-1 gap-0.5">
                        {LANGUAGES.map((lang) => (
                             <button
                                key={lang.code}
                                onClick={() => {
                                    onLanguageChange(lang);
                                    setIsLangOpen(false);
                                }}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                                    selectedLanguage.code === lang.code 
                                    ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20' 
                                    : 'hover:bg-white/5 text-slate-300'
                                }`}
                             >
                                <span className="text-xl">{lang.flag}</span>
                                <span className="text-sm font-medium">{lang.name}</span>
                                {selectedLanguage.code === lang.code && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                             </button>
                        ))}
                     </div>
                </div>
             )}
        </div>

        {/* Raise Hand Queue */}
        <button
          onClick={onRaiseHand}
          disabled={isMeSpeaking}
          className={`flex-1 flex items-center justify-center gap-3 px-4 transition-all disabled:opacity-20 ${
            isQueued ? 'bg-amber-600/90 text-white' : 'hover:bg-white/5 text-slate-300'
          }`}
        >
          <Hand className={`w-4 h-4 ${isQueued ? 'animate-bounce' : ''}`} />
          <span className="font-bold text-[16px] tracking-tight">{isQueued ? 'Queued' : 'Queue'}</span>
        </button>

        {/* Meeting ID Input & Join */}
        <div className="flex items-center border-l border-white/5 h-full">
          <input 
            type="text" 
            value={meetingIdInput}
            onChange={(e) => setMeetingIdInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleStart()}
            placeholder={isSignedIn ? "Switch Room ID" : "Join Room ID"}
            className="w-32 bg-transparent text-slate-200 text-sm font-semibold px-4 focus:outline-none placeholder:text-slate-600 h-full text-center"
          />
          {meetingIdInput !== meetingId && (
            <button 
              onClick={handleStart} 
              title={isSignedIn ? "Switch Room" : "Join Room"}
              className="h-full px-3 text-emerald-400 hover:bg-emerald-500/10 transition-colors"
            >
              <Play className="w-3 h-3 fill-current" />
            </button>
          )}
        </div>

        {/* Start/Stop Toggle Button */}
        <button
          onClick={() => isSignedIn ? onAuthToggle() : handleStart()}
          className={`flex-1 flex items-center justify-center gap-3 px-4 transition-all border-l border-white/5 ${
            isSignedIn 
              ? 'hover:bg-red-500/10 text-red-400' 
              : 'hover:bg-emerald-500/10 text-emerald-400'
          }`}
        >
          {isSignedIn ? <LogOut className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
          <span className="font-bold text-[16px] tracking-tight">{isSignedIn ? 'Stop' : (meetingIdInput ? 'Join' : 'Start')}</span>
        </button>

        {/* Share Button */}
        {isSignedIn && (
          <button
            onClick={onInvite}
            title={meetingId ? `Share Meeting: ${meetingId}` : 'Share Meeting'}
            className="flex-1 flex items-center justify-center gap-3 px-4 transition-all hover:bg-emerald-500/10 text-emerald-400 border-l border-white/5"
          >
            <Share2 className="w-4 h-4" />
            <span className="font-bold text-[16px] tracking-tight">Share</span>
          </button>
        )}
      </div>
      </header>
    </>
  );
};

export default TranslatorDock;
