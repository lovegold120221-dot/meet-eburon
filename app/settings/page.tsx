'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Settings, 
  Mic, 
  Globe, 
  Volume2, 
  ArrowLeft,
  ChevronRight,
  Shield,
  Zap
} from 'lucide-react';
import styles from '@/styles/Eburon.module.css';
import { LANGUAGES } from '@/lib/orbit/types';

export default function SettingsPage() {
  const router = useRouter();
  const [selectedMic, setSelectedMic] = useState('');
  const [targetLang, setTargetLang] = useState('en');
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then(d => {
      setDevices(d.filter(device => device.kind === 'audioinput'));
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#070707] text-slate-100 font-plus-jakarta pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#070707]/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors border border-white/5"
            title="Go back"
            aria-label="Go back"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">System Settings</h1>
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mt-0.5">Configuration & Preferences</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-lime-500/10 border border-lime-500/20 rounded-full">
          <Zap size={12} className="text-lime-400" />
          <span className="text-[10px] font-bold text-lime-400 uppercase tracking-wider">Neural Satellite Online</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto mt-8 px-6 space-y-8">
        {/* Audio Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <Mic size={16} className="text-emerald-400" />
            </div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-300">Audio Configuration</h2>
          </div>
          
          <div className="bg-white/5 border border-white/5 rounded-2xl p-1 overflow-hidden">
            <div className="p-4 flex items-center justify-between group hover:bg-white/[0.02] transition-colors">
              <div className="space-y-1">
                <p className="text-sm font-medium">Input Device</p>
                <p className="text-xs text-slate-500">Select your primary microphone</p>
              </div>
              <div className="relative">
                <select
                  title="Select Audio Input Device"
                  aria-label="Select Audio Input Device"
                  className="appearance-none bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-2 pr-10 text-xs focus:border-lime-500/50 focus:ring-1 focus:ring-lime-500/20 outline-none transition-all cursor-pointer min-w-[200px]"
                  value={selectedMic}
                  onChange={(e) => setSelectedMic(e.target.value)}
                >
                  <option value="">Default System Device</option>
                  {devices.map(d => (
                    <option key={d.deviceId} value={d.deviceId}>{d.label || 'Microphone'}</option>
                  ))}
                </select>
                <ChevronRight size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none rotate-90" />
              </div>
            </div>
          </div>
        </section>

        {/* Translation Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
              <Globe size={16} className="text-blue-400" />
            </div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-300">Translation & Transcription</h2>
          </div>

          <div className="bg-white/5 border border-white/5 rounded-2xl p-1 overflow-hidden space-y-1">
            <div className="p-4 flex items-center justify-between group hover:bg-white/[0.02] transition-colors rounded-xl">
              <div className="space-y-1">
                <p className="text-sm font-medium">Target Language</p>
                <p className="text-xs text-slate-500">Output language for shared transcripts</p>
              </div>
              <div className="relative">
                <select
                  title="Select Target Language"
                  aria-label="Select Target Language"
                  className="appearance-none bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-2 pr-10 text-xs focus:border-lime-500/50 focus:ring-1 focus:ring-lime-500/20 outline-none transition-all cursor-pointer min-w-[200px]"
                  value={targetLang}
                  onChange={(e) => setTargetLang(e.target.value)}
                >
                  {LANGUAGES.map(l => (
                    <option key={l.code} value={l.code}>{l.flag} {l.name}</option>
                  ))}
                </select>
                <ChevronRight size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none rotate-90" />
              </div>
            </div>
          </div>
        </section>

        {/* TTS Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
              <Volume2 size={16} className="text-purple-400" />
            </div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-300">Neural Voice (TTS)</h2>
          </div>

          <div className="bg-white/5 border border-white/5 rounded-2xl p-1 overflow-hidden">
            <div className="p-4 flex items-center justify-between group hover:bg-white/[0.02] transition-colors">
              <div className="space-y-1">
                <p className="text-sm font-medium">Auto-Playback</p>
                <p className="text-xs text-slate-500">Play translated speech automatically</p>
              </div>
              <button
                title={ttsEnabled ? "Disable Text-to-Speech" : "Enable Text-to-Speech"}
                aria-pressed={ttsEnabled}
                onClick={() => setTtsEnabled(!ttsEnabled)}
                className={`w-12 h-6 rounded-full transition-all relative ${ttsEnabled ? 'bg-lime-500' : 'bg-white/10'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm ${ttsEnabled ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
          </div>
        </section>

        {/* Privacy Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
              <Shield size={16} className="text-rose-400" />
            </div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-300">Privacy & Security</h2>
          </div>

          <div className="bg-white/5 border border-white/5 rounded-2xl p-6 text-center space-y-4">
            <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
              Your audio and transcription data are processed using high-security models. Eburon Orbit employs enterprise-grade encryption for all real-time communication.
            </p>
            <div className="flex items-center justify-center gap-6">
              <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Encryption</span>
                <span className="text-xs font-semibold text-lime-500/80">AES-256</span>
              </div>
              <div className="w-px h-8 bg-white/5" />
              <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Protocol</span>
                <span className="text-xs font-semibold text-lime-500/80">WebRTC</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer Branding */}
      <footer className="fixed bottom-0 left-0 right-0 p-8 flex flex-col items-center pointer-events-none">
        <div className="flex items-center gap-2 opacity-20">
          <div className="w-1.5 h-1.5 rounded-full bg-lime-500" />
          <span className="text-[10px] uppercase tracking-[0.3em] font-bold">Eburon Orbit Systems</span>
        </div>
      </footer>
    </div>
  );
}
