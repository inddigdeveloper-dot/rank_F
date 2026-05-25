'use client';

import { useState, useEffect } from 'react';
import { getProjectHistory, api, triggerScan } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useParams, useRouter } from 'next/navigation';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart
} from 'recharts';
import {
  ArrowLeft, Calendar, Trophy, TrendingUp, TrendingDown, Minus,
  BarChart3, Star, MapPin, Search, RefreshCw, Rocket, Activity, Info, CheckCircle2, X, Clock, Target, User, Plus, Play, Trash2, AlertTriangle
} from 'lucide-react';
import Link from 'next/link';

const COLORS = ['#c1121f', '#f77f00', '#fcbf49', '#8b2c2c', '#d64d4d'];

export default function ProjectDetails() {
  const { user, loading: authLoading } = useAuth();
  const { id } = useParams();
  const [dark, setDark] = useState(false);
  const [project, setProject] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanningKwId, setScanningKwId] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [selectedKwText, setSelectedKwText] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteStage, setDeleteStage] = useState(0);
  const [deleteKwId, setDeleteKwId] = useState<number | null>(null);
  const [deleteKwStage, setDeleteKwStage] = useState(0);
  const router = useRouter();
  const [newKw, setNewKw] = useState('');
  const [addingKw, setAddingKw] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = async () => {
    try {
      const [projRes, histRes] = await Promise.all([
        api.get(`/projects/${id}`),
        getProjectHistory(Number(id))
      ]);
      setProject(projRes.data);
      setHistory(histRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) { router.replace('/login'); return; }
    if (!authLoading && user) {
      fetchData();
      const check = () => setDark(localStorage.getItem('theme') === 'dark');
      check();
      const interval = setInterval(check, 500);
      return () => clearInterval(interval);
    }
  }, [authLoading, user, id]);

  const handleRunScan = async (kwId?: number) => {
    if (kwId) setScanningKwId(kwId);
    else setScanning(true);
    
    showToast(kwId ? 'Starting keyword analysis...' : 'Starting full scan...', 'success');

    setProgress(0);
    let p = 0;
    const interval = setInterval(() => {
      if (p < 40) p += 5;
      else if (p < 85) p += 2;
      else if (p < 98) p += 0.5;
      setProgress(p);
    }, 100);

    try {
      await api.post(`/projects/${id}/scan${kwId ? `?keyword_id=${kwId}` : ''}`);
      showToast(kwId ? 'Keyword analysis started!' : 'Full scan initiated!');

      // Poll every 3 seconds for 15 seconds to ensure we catch the background task completion
      let pollCount = 0;
      const pollInterval = setInterval(() => {
        fetchData();
        pollCount++;
        if (pollCount >= 6) clearInterval(pollInterval);
      }, 3000);

      setTimeout(() => {
        clearInterval(interval);
        setProgress(100);
        setTimeout(() => {
          setScanning(false);
          setScanningKwId(null);
          setProgress(0);
        }, 500);
      }, 8000); // Wait 8 seconds for UI to show scanning before hiding it
    } catch (err) {
      clearInterval(interval);
      showToast('Failed to start scan.', 'error');
      setScanning(false);
      setScanningKwId(null);
      setProgress(0);
    }
  };

  const handleAddKeyword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKw.trim()) return;
    setAddingKw(true);
    showToast('Adding new keyword...', 'success');
    try {
      await api.post(`/projects/${id}/keywords?text=${encodeURIComponent(newKw)}`);
      setNewKw('');
      showToast('Keyword added successfully!');
      fetchData();
    } catch (err) {
      showToast('Failed to add keyword.', 'error');
    } finally {
      setAddingKw(false);
    }
  };


  const handleDeleteProject = async () => {
    if (deleteStage === 0) setDeleteStage(1);
    else if (deleteStage === 1) setDeleteStage(2);
    else if (deleteStage === 2) {
      setDeleteStage(3);
      try {
        await api.delete(`/projects/${id}`);
        showToast('Project deleted permanently.', 'success');
        setTimeout(() => router.push('/'), 1000);
      } catch (err) {
        showToast('Failed to delete project.', 'error');
        setDeleteStage(0);
      }
    }
  };

  const handleDeleteKeyword = async (e: React.MouseEvent, kwId: number) => {
    e.stopPropagation();
    if (deleteKwId !== kwId || deleteKwStage === 0) {
      setDeleteKwId(kwId);
      setDeleteKwStage(1);
      showToast('Click delete again to confirm.', 'error');
      
      // Auto reset after 3 seconds
      setTimeout(() => {
        setDeleteKwId(prev => prev === kwId ? null : prev);
        setDeleteKwStage(prev => deleteKwId === kwId ? 0 : prev);
      }, 3000);
    } else if (deleteKwId === kwId && deleteKwStage === 1) {
      try {
        await api.delete(`/projects/${id}/keywords/${kwId}`);
        setProject((prev: any) => ({
          ...prev,
          keywords: prev.keywords.filter((k: any) => k.id !== kwId)
        }));
        showToast('Keyword deleted permanently.', 'success');
        setDeleteKwId(null);
        setDeleteKwStage(0);
      } catch (err) {
        showToast('Failed to delete keyword.', 'error');
        setDeleteKwId(null);
        setDeleteKwStage(0);
      }
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
    highlight: dark ? '#3a211d' : '#fcf5f5',
  };

  if (authLoading || !user || loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}><div className="loader" /></div>;

  const chartData = [...history].reverse().map((scan: any) => ({
    date: new Date(scan.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    ...scan.rankings.reduce((acc: any, r: any) => { acc[r.keyword_text] = r.rank || 11; return acc; }, {})
  }));

  // Most recent ranking per keyword from any scan (history is newest-first)
  const currentRankings = (() => {
    const seen = new Set<string>();
    const rankings: any[] = [];
    for (const scan of history) {
      for (const r of scan.rankings) {
        if (!seen.has(r.keyword_text)) {
          rankings.push(r);
          seen.add(r.keyword_text);
        }
      }
    }
    return rankings;
  })();

  const keywords = project?.keywords || [];
  const filteredKeywords = keywords.filter((kw: any) => kw.text.toLowerCase().includes(searchQuery.toLowerCase()));
  const activeKwText = selectedKwText || (filteredKeywords.length > 0 ? filteredKeywords[0].text : null);
  const selectedRankData = currentRankings.find((r: any) => r.keyword_text === activeKwText);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: t.bg, color: t.text }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>

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

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <Link href="/" className="inline-flex items-center gap-2 text-[13px] font-bold no-underline" style={{ color: t.sub }}>
            <ArrowLeft size={16} /> Back to Dashboard
          </Link>
          <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
            <button
              onClick={() => setDeleteStage(1)}
              aria-label="Delete Project" title="Delete Project"
              className="p-3 rounded-xl flex items-center justify-center transition-all flex-shrink-0"
              style={{ background: 'transparent', color: '#ef4444', border: `1px solid ${t.border}` }}
            >
              <Trash2 size={18} />
            </button>
            <button
              onClick={() => handleRunScan()}
              disabled={scanning || !!scanningKwId}
              className="p-3 sm:px-6 sm:py-3 rounded-xl flex items-center justify-center gap-2 font-extrabold text-sm flex-1 sm:flex-none"
              style={{
                background: (scanning || !!scanningKwId) ? t.border : 'linear-gradient(135deg, #c1121f, #f77f00)',
                color: '#fff', border: 'none', cursor: (scanning || !!scanningKwId) ? 'not-allowed' : 'pointer',
                boxShadow: (scanning || !!scanningKwId) ? 'none' : '0 4px 12px rgba(193,18,31,0.2)'
              }}
            >
              {scanning ? <RefreshCw size={16} className="spin" /> : <Rocket size={16} />}
              <span>{scanning ? 'Scanning...' : 'Run Full Analysis'}</span>
            </button>
          </div>
        </div>

        {/* Progress */}
        {(scanning || !!scanningKwId) && (
          <div style={{ marginBottom: '32px', backgroundColor: t.card, padding: '16px', borderRadius: '16px', border: `1px solid ${t.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '11px', fontWeight: 800, color: t.primary }}>
              <span>{scanningKwId ? 'ANALYZING SPECIFIC KEYWORD...' : 'SYNCING ALL GOOGLE MAPS DATA...'}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div style={{ width: '100%', height: '6px', backgroundColor: t.border, borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: `${progress}%`, height: '100%', backgroundColor: t.primary, transition: 'width 0.2s' }} />
            </div>
          </div>
        )}

        <div className="flex flex-col lg:grid lg:grid-cols-[1fr_340px] lg:items-start gap-6">

            {/* Project Header Card */}
            <div className="order-1 lg:order-none rounded-3xl p-4 sm:p-6 flex flex-col sm:flex-row justify-between sm:items-center gap-4" style={{ backgroundColor: t.card, border: `1px solid ${t.border}` }}>
              <div className="flex gap-4 items-center">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: t.tagBg, color: t.primary }}>
                  <Activity size={24} className="sm:w-7 sm:h-7" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-3xl font-black m-0 truncate">{project?.name}</h1>
                  <p className="text-xs sm:text-sm font-semibold m-0 mt-1 truncate" style={{ color: t.sub }}>{project?.business_name}</p>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-[10px] sm:text-[11px] font-extrabold uppercase" style={{ color: t.sub }}>Tracking Area</span>
                <p className="m-0 mt-1 font-extrabold text-sm sm:text-base truncate">{project?.location}</p>
              </div>
            </div>

            {/* Keyword List */}
            <div className="order-2 lg:order-none" style={{ backgroundColor: t.card, borderRadius: '24px', border: `1px solid ${t.border}`, overflow: 'hidden' }}>
              <div className="p-4 sm:p-6 border-b flex flex-col sm:flex-row justify-between sm:items-center gap-4" style={{ borderColor: t.border }}>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <h3 className="text-base sm:text-lg font-extrabold m-0">Target Keywords</h3>
                  <div className="relative flex-1 sm:w-[200px]">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: t.sub }} />
                    <input
                      type="text" placeholder="Search keywords..."
                      value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 sm:py-2 rounded-lg outline-none text-xs sm:text-sm"
                      style={{ border: `1px solid ${t.border}`, backgroundColor: t.bg, color: t.text }}
                    />
                  </div>
                </div>

                <form onSubmit={handleAddKeyword} className="flex gap-2 w-full sm:w-auto">
                  <input
                    type="text" placeholder="Add new keyword..."
                    value={newKw} onChange={e => setNewKw(e.target.value)}
                    className="flex-1 sm:w-auto px-3 py-1.5 sm:py-2 rounded-lg outline-none text-xs sm:text-sm"
                    style={{ border: `1px solid ${t.border}`, backgroundColor: t.bg, color: t.text }}
                  />
                  <button type="submit" disabled={addingKw} className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-bold text-xs sm:text-sm text-white flex items-center justify-center flex-shrink-0" style={{ backgroundColor: t.primary }}>
                    {addingKw ? '...' : <Plus size={16} />}
                  </button>
                </form>
              </div>
              {/* Keyword List Header (Desktop Only) */}
              <div className="hidden sm:grid grid-cols-[1fr_120px_100px] gap-4 p-3 px-6 text-[11px] font-extrabold tracking-wider" style={{ backgroundColor: dark ? '#241712' : '#fefaf9', color: t.sub }}>
                <div>KEYWORD</div>
                <div>CURRENT RANK</div>
                <div className="text-center">ACTIONS</div>
              </div>

              {/* Keyword List Body */}
              <div className="flex flex-col">
                {filteredKeywords.map((kw: any, i: number) => {
                  const ranking = currentRankings.find((r: any) => r.keyword_text === kw.text);
                  const isScanningThis = scanningKwId === kw.id;
                  const isSelected = activeKwText === kw.text;

                  return (
                    <div
                      key={kw.id}
                      onClick={() => setSelectedKwText(kw.text)}
                      className="grid grid-cols-1 sm:grid-cols-[1fr_120px_100px] gap-2 sm:gap-4 p-4 sm:px-6 sm:py-4 cursor-pointer transition-colors border-t"
                      style={{
                        borderColor: t.border,
                        backgroundColor: isSelected ? t.highlight : 'transparent',
                      }}
                    >
                      <div className="flex items-center gap-3 font-bold text-sm sm:text-base min-w-0">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % 5] }} />
                        <span className="truncate">{kw.text}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 justify-between sm:justify-start">
                        <span className="sm:hidden text-[10px] font-extrabold tracking-widest" style={{ color: t.sub }}>RANK</span>
                        {ranking ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-lg sm:text-xl font-black" style={{ color: t.primary }}>{ranking.rank || '10+'}</span>
                            {ranking.rank && ranking.rank <= 3 && <Trophy size={14} color="#f59e0b" />}
                          </div>
                        ) : (
                          <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: t.sub }}>
                            <Clock size={12} /> Pending
                          </span>
                        )}
                      </div>

                      <div className="flex gap-2 justify-end sm:justify-center mt-2 sm:mt-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRunScan(kw.id); }}
                          disabled={scanning || !!scanningKwId}
                          className="p-2 rounded-lg border transition-colors flex items-center justify-center flex-1 sm:flex-none"
                          style={{
                            borderColor: t.border,
                            backgroundColor: isScanningThis ? t.primary : 'transparent',
                            color: isScanningThis ? '#fff' : t.sub, cursor: 'pointer'
                          }}
                          title="Analyze this keyword"
                        >
                          {isScanningThis ? <RefreshCw size={14} className="spin" /> : <Play size={14} fill="currentColor" />}
                        </button>
                        
                        <button
                          onClick={(e) => handleDeleteKeyword(e, kw.id)}
                          className="p-2 rounded-lg border transition-colors flex items-center justify-center flex-1 sm:flex-none"
                          style={{
                            borderColor: deleteKwId === kw.id ? '#ef4444' : t.border,
                            backgroundColor: deleteKwId === kw.id ? '#ef4444' : 'transparent',
                            color: deleteKwId === kw.id ? '#fff' : '#ef4444', cursor: 'pointer'
                          }}
                          title="Delete keyword"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Chart */}
            <div className="order-4 lg:order-none rounded-[24px] p-4 sm:p-6 mb-8 lg:mb-0 w-full overflow-hidden" style={{ backgroundColor: t.card, border: `1px solid ${t.border}` }}>
              <h3 className="text-base sm:text-lg font-extrabold mb-4 sm:mb-6">Visibility History</h3>
              <div className="h-56 sm:h-[320px] w-full" style={{ minHeight: 224 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={dark ? '#2e3044' : '#f1f5f9'} />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: t.sub, fontSize: 10, fontWeight: 700 }} 
                      minTickGap={20}
                      tickMargin={8}
                    />
                    <YAxis 
                      reversed 
                      domain={[1, 11]} 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: t.sub, fontSize: 10, fontWeight: 700 }} 
                      tickFormatter={(v) => v === 11 ? '10+' : v}
                      width={35}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: t.card, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '8px 12px', fontSize: '12px' }} 
                      itemStyle={{ padding: 0, margin: '4px 0' }}
                    />
                    <Legend 
                      iconType="circle" 
                      wrapperStyle={{ fontSize: '11px', fontWeight: 700, paddingTop: '16px' }} 
                    />
                    {keywords.map((kw: any, idx: number) => (
                      <Area 
                        key={idx} 
                        type="monotone" 
                        dataKey={kw.text} 
                        stroke={COLORS[idx % 5]} 
                        fillOpacity={0.05} 
                        fill={COLORS[idx % 5]} 
                        strokeWidth={2}
                        activeDot={{ r: 4, strokeWidth: 0 }}
                        dot={false}
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

          {/* Right Column: Search Results */}
          <div className="order-3 lg:order-none lg:col-start-2 lg:row-start-1 lg:row-span-3 flex flex-col gap-5">
            <div style={{ backgroundColor: t.card, borderRadius: '24px', border: `1px solid ${t.border}`, padding: '24px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 800, marginBottom: '4px' }}>Search Results (Top 10)</h3>
              <p style={{ fontSize: '12px', color: t.sub, marginBottom: '20px', fontWeight: 600 }}>Top 10 Results for: <span style={{ color: t.primary }}>"{activeKwText}"</span></p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {selectedRankData?.competitors?.map((c: any, i: number) => (
                  <div key={i} style={{
                    padding: '14px', borderRadius: '16px',
                    border: c.is_user ? `2px solid ${t.primary}` : `1px solid ${t.border}`,
                    display: 'flex', gap: '12px',
                    backgroundColor: c.is_user ? (dark ? '#3a211d' : '#fdf2f2') : (dark ? '#241712' : '#fafafa'),
                    boxShadow: c.is_user ? '0 4px 15px rgba(193,18,31,0.2)' : 'none',
                    position: 'relative'
                  }}>
                    {c.is_user && (
                      <div style={{
                        position: 'absolute', top: '-10px', right: '12px',
                        backgroundColor: t.primary, color: '#fff', fontSize: '10px',
                        fontWeight: 900, padding: '2px 8px', borderRadius: '99px'
                      }}>YOU</div>
                    )}
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '8px',
                      backgroundColor: c.is_user ? t.primary : t.tagBg,
                      color: c.is_user ? '#fff' : t.primary,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 900, fontSize: '13px', flexShrink: 0
                    }}>
                      {c.position}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</p>
                      {c.address && <p style={{ margin: '2px 0 0', fontSize: '11px', color: t.sub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.address}</p>}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                        <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '2px' }}>
                          <Star size={10} fill="currentColor" /> {c.rating || 'N/A'}
                        </span>
                        <span style={{ fontSize: '11px', color: t.sub, fontWeight: 600 }}>({c.reviews || 0} reviews)</span>
                      </div>
                    </div>
                  </div>
                ))}
                {(!selectedRankData || !selectedRankData.competitors || selectedRankData.competitors.length === 0) && (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: t.sub }}>
                    <Target size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
                    <p style={{ fontSize: '13px', fontWeight: 600 }}>No scan results yet.</p>
                    <button onClick={() => {
                      const kwObj = filteredKeywords.find((k: any) => k.text === activeKwText);
                      if (kwObj) handleRunScan(kwObj.id);
                    }} style={{ marginTop: '12px', backgroundColor: t.primary, color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>Analyze Keyword</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteStage > 0 && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: dark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            backgroundColor: t.card, border: `1px solid ${t.border}`, borderRadius: '24px',
            padding: '40px 32px', width: '90%', maxWidth: '420px',
            boxShadow: '0 24px 48px rgba(0,0,0,0.2)', textAlign: 'center',
            animation: 'slideUp 0.3s ease-out'
          }}>
            <div style={{ width: '72px', height: '72px', borderRadius: '50%', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <Trash2 size={36} />
            </div>
            <h2 style={{ margin: '0 0 12px', fontSize: '22px', fontWeight: 900, color: t.text }}>Delete Project</h2>
            <p style={{ margin: '0 0 32px', fontSize: '14px', color: t.sub, lineHeight: 1.6 }}>
              Are you absolutely sure you want to delete <strong>{project?.name}</strong>?
              This will permanently erase all keywords, scan history, and ranking data. This action cannot be undone.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {deleteStage === 1 ? (
                <button
                  onClick={() => setDeleteStage(2)}
                  style={{ width: '100%', padding: '16px', borderRadius: '16px', backgroundColor: '#ef4444', color: '#fff', border: 'none', fontWeight: 800, fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s' }}
                >
                  <Trash2 size={18} /> Yes, Delete Permanently
                </button>
              ) : deleteStage === 2 ? (
                <button
                  onClick={handleDeleteProject}
                  style={{ width: '100%', padding: '16px', borderRadius: '16px', backgroundColor: '#991b1b', color: '#fff', border: 'none', fontWeight: 800, fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', animation: 'pulse 1.5s infinite' }}
                >
                  <AlertTriangle size={18} /> Confirm Deletion (Irreversible)
                </button>
              ) : (
                <button
                  disabled
                  style={{ width: '100%', padding: '16px', borderRadius: '16px', backgroundColor: t.border, color: t.sub, border: 'none', fontWeight: 800, fontSize: '15px', cursor: 'wait', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <RefreshCw size={18} className="spin" /> Deleting...
                </button>
              )}

              <button
                onClick={() => setDeleteStage(0)}
                disabled={deleteStage === 3}
                style={{ width: '100%', padding: '16px', borderRadius: '16px', backgroundColor: 'transparent', color: t.text, border: `1px solid ${t.border}`, fontWeight: 700, fontSize: '15px', cursor: deleteStage === 3 ? 'not-allowed' : 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .spin { animation: rotate 1.5s linear infinite; }
        @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(0.98); } 100% { transform: scale(1); } }
        @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .loader { width: 30px; height: 30px; border: 3px solid #c1121f; border-bottom-color: transparent; border-radius: 50%; animation: rotate 1s linear infinite; }
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      `}</style>
    </div>
  );
}
