'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getProjects, triggerScan } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Plus, MapPin, Building2, LayoutGrid, List, RefreshCw, ChevronRight, Trophy, BarChart3, Clock, CheckCircle2, X } from 'lucide-react';
import Link from 'next/link';

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dark, setDark] = useState(false);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [scanProgress, setScanProgress] = useState<number | null>(null);

  const playSound = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    } catch (e) {
      console.warn('Audio play failed', e);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadProjects = async () => {
    try {
      const data = await getProjects();
      setProjects(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) { router.replace('/login'); return; }
    if (!authLoading && user) {
      loadProjects();
      const check = () => setDark(localStorage.getItem('theme') === 'dark');
      check();
      const interval = setInterval(check, 500);
      return () => clearInterval(interval);
    }
  }, [authLoading, user]);

  const handleScan = async (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (scanProgress !== null) return; // Prevent multiple scans at once

    setScanProgress(5);
    
    // Simulate progress
    const interval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev === null) return null;
        if (prev >= 90) return 90; // hold at 90 until backend finishes
        return prev + Math.floor(Math.random() * 15) + 5;
      });
    }, 800);

    try {
      await triggerScan(id);

      // When backend is done
      clearInterval(interval);
      setScanProgress(100);

      // Hide bar after 1s and show toast/sound
      setTimeout(() => {
        setScanProgress(null);
        showToast('done check insight', 'success');
        playSound();
        loadProjects(); // Refresh data
      }, 1000);
      
    } catch (err) {
      clearInterval(interval);
      setScanProgress(null);
      showToast('Failed to start scan.', 'error');
    }
  };

  const t = {
    bg: dark ? '#1e140f' : '#fffdfc',
    card: dark ? '#2c1e16' : '#ffffff',
    border: dark ? '#473226' : '#e5d7d3',
    text: dark ? '#fefaf9' : '#2c1e16',
    sub: dark ? '#a88c80' : '#735f56',
    primary: '#c1121f',
    tagBg: dark ? '#3a211d' : '#fcecec',
  };

  if (authLoading || !user || loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <div className="loader" />
        <style>{`.loader{width:40px;height:40px;border:3px solid #c1121f;border-bottom-color:transparent;border-radius:50%;animation:spin 1s linear infinite;}@keyframes spin{to{transform:rotate(360deg);}}`}</style>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 md:p-10" style={{ backgroundColor: t.bg, minHeight: 'calc(100vh - 120px)' }}>
      
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '75px', right: '20px', zIndex: 1000,
          padding: '12px 20px', borderRadius: '12px',
          backgroundColor: toast.type === 'success' ? '#10b981' : '#ef4444',
          color: '#fff', fontWeight: 700, fontSize: '14px',
          display: 'flex', alignItems: 'center', gap: '10px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          animation: 'slideIn 0.3s ease-out',
        }}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <X size={18} />}
          {toast.message}
        </div>
      )}

      {/* Floating Progress Bar */}
      {scanProgress !== null && (
        <div style={{
          position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, width: '90%', maxWidth: '350px',
          backgroundColor: t.card, padding: '16px', borderRadius: '16px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)', border: `1px solid ${t.border}`,
          animation: 'slideDown 0.3s ease-out'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '12px', fontWeight: 800, color: t.text }}>
            <span>SCANNING IN PROGRESS...</span>
            <span style={{ color: t.primary }}>{scanProgress > 100 ? 100 : scanProgress}%</span>
          </div>
          <div style={{ width: '100%', height: '6px', backgroundColor: dark ? '#2e3044' : '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${scanProgress > 100 ? 100 : scanProgress}%`, height: '100%', background: 'linear-gradient(90deg, #c1121f, #f77f00)', transition: 'width 0.4s ease-out' }} />
          </div>
        </div>
      )}

      <div className="hidden sm:flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-black m-0 tracking-tight" style={{ color: t.text }}>Dashboard</h1>
          <p className="text-sm mt-1" style={{ color: t.sub }}>Monitor your local search visibility.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/projects/new" className="hidden sm:flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white no-underline shadow-lg" style={{ background: 'linear-gradient(135deg, #c1121f, #f77f00)', boxShadow: '0 4px 14px rgba(193,18,31,0.25)' }}>
            <Plus size={20} strokeWidth={3} /> <span>New Tracker</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
        {projects.map((p) => {
          const hasScan = !!p.latest_scan;
          const rank = hasScan ? p.latest_scan.rankings[0]?.rank : null;
          let rankBg = dark ? '#13151f' : '#f9fafb';
          let innerTextColor = t.text;
          let innerSubColor = t.sub;

          return (
            <Link href={`/projects/${p.id}`} key={p.id} style={{ textDecoration: 'none' }}>
              <div style={{
                backgroundColor: t.card, borderRadius: '20px', border: `1px solid ${t.border}`,
                transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'pointer',
              }} className="project-card p-3 sm:p-6 flex flex-col gap-3 sm:gap-5 w-full">
                <div className="flex justify-between items-start">
                  <div className="flex gap-2 sm:gap-3 items-center min-w-0">
                    <div className="flex-shrink-0 flex items-center justify-center rounded-lg sm:rounded-xl w-8 h-8 sm:w-11 sm:h-11" style={{ backgroundColor: t.tagBg, color: t.primary }}>
                      <Trophy className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="min-w-0 overflow-hidden">
                      <h2 className="m-0 text-sm sm:text-base font-extrabold truncate" style={{ color: t.text }}>{p.name}</h2>
                      <span className="flex items-center gap-1 mt-1 text-[10px] sm:text-xs truncate" style={{ color: t.sub }}>
                        <MapPin className="w-3 h-3 flex-shrink-0" /> <span className="truncate">{p.location}</span>
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => handleScan(e, p.id)}
                    aria-label="Refresh scan" title="Refresh scan"
                    className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl border flex-shrink-0"
                    style={{ border: `1px solid ${t.border}`, backgroundColor: 'transparent', color: t.sub, cursor: 'pointer' }}
                  >
                    <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2 text-[10px] sm:text-[13px] truncate" style={{ color: t.sub }}>
                  <Building2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" /> <span className="font-semibold truncate">{p.business_name}</span>
                </div>

                <div className="flex justify-between items-center rounded-xl p-2 sm:p-4 border transition-colors" style={{ backgroundColor: dark ? '#13151f' : '#f9fafb', border: `1px solid ${t.border}` }}>
                  <div>
                    <span className="text-[9px] sm:text-[11px] font-extrabold tracking-widest" style={{ color: t.sub }}>PEAK RANK</span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      {hasScan ? (
                        <><span className="text-lg sm:text-2xl font-black" style={{ color: t.text }}>{rank || '10+'}</span><span className="text-[10px] sm:text-[13px] font-semibold" style={{ color: t.sub }}>/10</span></>
                      ) : (
                        <span className="text-[10px] sm:text-sm font-bold flex items-center gap-1" style={{ color: t.primary }}><Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Initial Scan Pending</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" color={t.sub} />
                </div>
              </div>
            </Link>
          );
        })}
        
        <Link href="/projects/new" className="no-underline">
          <div className="flex flex-col items-center justify-center gap-2 sm:gap-3 rounded-2xl min-h-[140px] sm:min-h-[220px]" style={{ border: `2px dashed ${t.border}`, padding: '24px' }}>
            <Plus className="w-5 h-5 sm:w-6 sm:h-6" color={t.sub} />
            <span className="text-xs sm:text-sm font-bold text-center" style={{ color: t.sub }}>Add New Location</span>
          </div>
        </Link>
      </div>

      {/* Floating Action Button (Mobile Only) */}
      <Link href="/projects/new" className="sm:hidden fixed bottom-6 right-6 p-4 rounded-full text-white shadow-xl z-50 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #c1121f, #f77f00)', boxShadow: '0 8px 24px rgba(193,18,31,0.4)' }}>
        <Plus size={24} strokeWidth={3} />
      </Link>

      <style>{`
        .project-card:hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0,0,0,0.06); border-color: ${t.primary} !important; }
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      `}</style>
    </div>
  );
}
