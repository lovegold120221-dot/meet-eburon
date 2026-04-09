
import React from 'react';
import { Caption, ListenPreference } from '../types';
import { Settings, Info } from 'lucide-react';

interface TranslatorPanelProps {
  captions: Caption[];
  listenPreference: ListenPreference;
  onPreferenceChange: (pref: ListenPreference) => void;
  isContinuous: boolean;
  onContinuousToggle: () => void;
}

const TranslatorPanel: React.FC<TranslatorPanelProps> = ({
  captions,
  listenPreference,
  onPreferenceChange,
  isContinuous,
  onContinuousToggle,
}) => {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [captions]);

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Info className="w-5 h-5 text-blue-400" />
          Live Captions
        </h2>
        <div className="flex items-center gap-4 bg-slate-800/50 p-1.5 rounded-xl border border-slate-700">
          <button
            onClick={() => onPreferenceChange('raw')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              listenPreference === 'raw' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            RAW
          </button>
          <button
            onClick={() => onPreferenceChange('translated')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              listenPreference === 'translated' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            TRANSLATED
          </button>
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 bg-slate-900/50 rounded-2xl border border-slate-800 overflow-y-auto p-6 space-y-4 scroll-smooth min-h-[400px]"
      >
        {captions.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 italic">
            Waiting for audio...
          </div>
        ) : (
          captions.map((cap) => (
            <div key={cap.id} className="animate-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-xs text-blue-400 uppercase tracking-wider">{cap.speakerName}</span>
                <span className="text-[10px] text-slate-500">{new Date(cap.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <p className={`text-lg leading-relaxed ${cap.isFinal ? 'text-slate-200' : 'text-slate-500 italic'}`}>
                {cap.text}
              </p>
            </div>
          ))
        )}
      </div>

      <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="w-5 h-5 text-slate-400" />
          <div>
            <p className="text-sm font-semibold text-slate-200">Continuous Listening</p>
            <p className="text-xs text-slate-500">Auto-play translated voice in sequence</p>
          </div>
        </div>
        <button
          onClick={onContinuousToggle}
          title={isContinuous ? 'Disable continuous listening' : 'Enable continuous listening'}
          className={`w-12 h-6 rounded-full transition-colors relative ${
            isContinuous ? 'bg-blue-600' : 'bg-slate-600'
          }`}
        >
          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
            isContinuous ? 'left-7' : 'left-1'
          }`} />
        </button>
      </div>
    </div>
  );
};

export default TranslatorPanel;
