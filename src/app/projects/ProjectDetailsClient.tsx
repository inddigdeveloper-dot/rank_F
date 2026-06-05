'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { getProjectHistory, api, triggerScan, downloadReport, updateProject, updateKeyword } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart
} from 'recharts';
import {
  ArrowLeft, Calendar, Trophy, TrendingUp, TrendingDown, Minus,
  BarChart3, Star, MapPin, Search, RefreshCw, Rocket, Activity, Info, CheckCircle2, X, Clock, Target, User, Plus, Play, Trash2, AlertTriangle, FileDown, Pencil, Check, Save
} from 'lucide-react';
import Link from 'next/link';

const COLORS = ['#c1121f', '#f77f00', '#fcbf49', '#8b2c2c', '#d64d4d'];

// Developer-facing console logging. Surfaces the real underlying error (API
// response body, status, message) so issues are debuggable from the browser console,
// separate from the user-facing toast.
const devError = (context: string, err: any) => {
  const detail = err?.response?.data ?? err?.message ?? err;
  const status = err?.response?.status;
  console.error(
    `[RankAutoCheck] ${context}${status ? ` (HTTP ${status})` : ''}:`,
    detail,
    err
  );
};

export default function ProjectDetails() {
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
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
  const [chartReady, setChartReady] = useState(false);
  const chartWrapRef = useRef<HTMLDivElement | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', business_name: '', location: '', radius: 5 });
  const [savingEdit, setSavingEdit] = useState(false);
  const [editKwId, setEditKwId] = useState<number | null>(null);
  const [editKwText, setEditKwText] = useState('');

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
      return { project: projRes.data, history: histRes };
    } catch (err) {
      devError('Failed to load project data', err);
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

  useEffect(() => {
    // Mount the chart only once its container reports a real width (> 0),
    // otherwise ResponsiveContainer measures -1 and Recharts warns.
    if (chartReady) return;

    let ro: ResizeObserver | null = null;
    let raf = 0;
    let fallback: ReturnType<typeof setTimeout> | null = null;

    // The chart wrapper lives deep in the JSX and may not be mounted on the same
    // tick this effect runs. Poll via rAF until the ref exists, then observe it.
    const attach = () => {
      const el = chartWrapRef.current;
      if (!el) {
        raf = requestAnimationFrame(attach);
        return;
      }
      if (typeof ResizeObserver === 'undefined') {
        setChartReady(true);
        return;
      }
      ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentRect.width > 0) {
            setChartReady(true);
            ro?.disconnect();
            break;
          }
        }
      });
      ro.observe(el);
      // Safety net: if the observer never fires (some layouts), force-ready after 800ms.
      fallback = setTimeout(() => setChartReady(true), 800);
    };
    attach();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      if (fallback) clearTimeout(fallback);
      ro?.disconnect();
    };
  }, [loading, chartReady]);

  const handleRunScan = async (kwId?: number) => {
    if (kwId) setScanningKwId(kwId);
    else setScanning(true);

    showToast(kwId ? 'Starting keyword analysis...' : 'Starting full scan...', 'success');

    // Newest scan id BEFORE we start, so we can detect the brand-new scan once it lands.
    const prevScanId = history.reduce(
      (max: number, s: any) => (typeof s.id === 'number' && s.id > max ? s.id : max),
      0
    );

    setProgress(0);
    let p = 0;
    // Artificial progress climbs but HOLDS at 90% — the final 10% only fills
    // once the real, freshly-scanned rankings are fetched and visible.
    const interval = setInterval(() => {
      if (p < 50) p += 2;
      else if (p < 75) p += 1;
      else if (p < 90) p += 0.3;
      if (p > 90) p = 90;
      setProgress(p);
    }, 200);

    const finish = (pollInterval: ReturnType<typeof setInterval>) => {
      clearInterval(pollInterval);
      clearInterval(interval);
      setProgress(100);
      setTimeout(() => {
        setScanning(false);
        setScanningKwId(null);
        setProgress(0);
      }, 600);
    };

    try {
      await api.post(`/projects/${id}/scan${kwId ? `?keyword_id=${kwId}` : ''}`);
      showToast(kwId ? 'Keyword analysis started!' : 'Full scan initiated!');

      // Poll until a NEW completed scan with actual rankings is visible.
      const pollInterval = setInterval(async () => {
        const data = await fetchData();
        if (!data || !data.history) return;

        // Surface a backend-side scan failure to the developer console immediately.
        const failedScan = data.history.find(
          (s: any) => s.status === 'failed' && s.id > prevScanId
        );
        if (failedScan) {
          devError('Scan failed on the server (status: failed)', { scan: failedScan });
          showToast('Scan failed — check the console for details.', 'error');
          finish(pollInterval);
          return;
        }

        // The new scan = one newer than the previous newest that carries rankings.
        // We do NOT require status === 'completed' here: the history payload may omit
        // a scan-level status, and the presence of rankings already means real data
        // is visible. (A 'running' scan never has rankings yet.) Status is only used
        // above to detect explicit failures.
        const newScan = data.history.find(
          (s: any) =>
            s.id > prevScanId &&
            s.status !== 'running' &&
            Array.isArray(s.rankings) &&
            s.rankings.length > 0
        );
        if (!newScan) return;

        // Report any keyword whose lookup errored (e.g. SerpAPI failure) to the console.
        const erroredKeywords = newScan.rankings.filter(
          (r: any) => r.status === 'SERPAPI_ERROR'
        );
        if (erroredKeywords.length > 0) {
          devError(
            `SerpAPI lookup failed for ${erroredKeywords.length} keyword(s)`,
            { keywords: erroredKeywords.map((r: any) => r.keyword_text) }
          );
          showToast(`${erroredKeywords.length} keyword(s) failed to fetch — see console.`, 'error');
        }

        // For a single-keyword scan, wait until that keyword's rank is present.
        if (kwId) {
          const kw = (project?.keywords || []).find((k: any) => k.id === kwId);
          const hasKwRank =
            kw && newScan.rankings.some((r: any) => r.keyword_text === kw.text);
          if (!hasKwRank) return;
        }

        finish(pollInterval);
      }, 5000);

      // Safety timeout (10 min): close the tracker WITHOUT forcing a false 100%.
      setTimeout(() => {
        clearInterval(pollInterval);
        clearInterval(interval);
        setScanning(false);
        setScanningKwId(null);
        setProgress(0);
      }, 600000);
    } catch (err) {
      devError('Failed to start scan', err);
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
      devError('Failed to add keyword', err);
      showToast('Failed to add keyword.', 'error');
    } finally {
      setAddingKw(false);
    }
  };

  const openEditModal = () => {
    setEditForm({
      name: project?.name || '',
      business_name: project?.business_name || '',
      location: project?.location || '',
      radius: project?.radius ?? 5,
    });
    setEditOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEdit(true);
    try {
      const updated = await updateProject(Number(id), {
        name: editForm.name,
        business_name: editForm.business_name,
        location: editForm.location,
        radius: Number(editForm.radius),
      });
      setProject((prev: any) => ({ ...prev, ...updated }));
      showToast('Project updated successfully!');
      setEditOpen(false);
    } catch (err) {
      devError('Failed to update project', err);
      showToast('Failed to update project.', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const startEditKeyword = (e: React.MouseEvent, kwId: number, text: string) => {
    e.stopPropagation();
    setEditKwId(kwId);
    setEditKwText(text);
  };

  const handleSaveKeyword = async (e: React.MouseEvent | React.FormEvent, kwId: number) => {
    e.preventDefault();
    if ('stopPropagation' in e) e.stopPropagation();
    if (!editKwText.trim()) return;
    try {
      await updateKeyword(Number(id), kwId, editKwText.trim());
      setProject((prev: any) => ({
        ...prev,
        keywords: prev.keywords.map((k: any) => (k.id === kwId ? { ...k, text: editKwText.trim() } : k)),
      }));
      showToast('Keyword updated!');
      setEditKwId(null);
      setEditKwText('');
    } catch (err) {
      devError('Failed to update keyword', err);
      showToast('Failed to update keyword.', 'error');
    }
  };

  const handleDownloadPDF = async () => {
    try {
      showToast('Generating PDF report...', 'success');
      const response = await downloadReport(Number(id));
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${project?.name}_rankings.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      showToast('PDF downloaded successfully!');
    } catch (err) {
      devError('Failed to download PDF report', err);
      showToast('Failed to download PDF.', 'error');
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
        devError('Failed to delete project', err);
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
        devError('Failed to delete keyword', err);
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

  // chartData: O(scans × rankings) time, O(scans × keywords) space — memoized on [history]
  const chartData = useMemo(
    () =>
      [...history].reverse().map((scan: any) => ({
        date: new Date(scan.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        ...scan.rankings.reduce((acc: any, r: any) => { acc[r.keyword_text] = r.rank || 11; return acc; }, {})
      })),
    [history]
  );

  // currentRankings: latest ranking per keyword. O(scans × rankings) time, O(keywords) space — memoized on [history]
  const currentRankings = useMemo(() => {
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
  }, [history]);

  // rankingByKeyword: O(1) lookup table. O(rankings) build time, O(keywords) space — memoized on [currentRankings]
  const rankingByKeyword = useMemo(() => {
    const m = new Map<string, any>();
    for (const r of currentRankings) m.set(r.keyword_text, r);
    return m;
  }, [currentRankings]);

  const keywords = project?.keywords || [];
  // filteredKeywords: O(keywords) time — search term lowered once, memoized on [keywords, searchQuery]
  const filteredKeywords = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return keywords.filter((kw: any) => kw.text.toLowerCase().includes(q));
  }, [keywords, searchQuery]);
  const activeKwText = selectedKwText || (filteredKeywords.length > 0 ? filteredKeywords[0].text : null);
  const selectedRankData = activeKwText ? rankingByKeyword.get(activeKwText) : undefined;

  // Early return AFTER all hooks — keeps hook order stable across renders (React error #310).
  if (authLoading || !user || loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}><div className="loader" /></div>;

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
              onClick={() => handleDownloadPDF()}
              className="p-3 sm:px-4 sm:py-3 rounded-xl flex items-center justify-center gap-2 font-extrabold text-sm transition-all"
              style={{ background: 'transparent', color: t.text, border: `1px solid ${t.border}` }}
              title="Export PDF"
            >
              <FileDown size={16} />
              <span className="hidden sm:inline">Export PDF</span>
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

        {/* Scan Step Tracker */}
        {(scanning || !!scanningKwId) && (
          <div style={{ marginBottom: '32px', backgroundColor: t.card, padding: '20px 24px', borderRadius: '20px', border: `1px solid ${t.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.08em', color: t.primary }}>
                {scanningKwId ? 'ANALYZING KEYWORD' : 'FULL GOOGLE MAPS SCAN'}
              </span>
              <span style={{ fontSize: '11px', fontWeight: 800, color: t.sub }}>{Math.round(progress)}%</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { label: 'Finding location coordinates', sub: 'Geocoding via Nominatim', threshold: 0 },
                { label: 'Fetching Google Maps data', sub: 'Querying SerpAPI · Incognito mode', threshold: 20 },
                { label: 'Scanning keyword rankings', sub: scanningKwId ? 'Analyzing 1 keyword' : `Analyzing all keywords`, threshold: 45 },
                { label: 'Matching your business', sub: 'Fuzzy name matching across results', threshold: 70 },
                { label: 'Saving results', sub: 'Writing to database', threshold: 90 },
              ].map((step, i) => {
                const isComplete = progress >= (i === 4 ? 100 : [20, 45, 70, 90, 100][i]);
                const isActive = progress >= step.threshold && !isComplete;
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      backgroundColor: isComplete ? '#10b981' : isActive ? t.primary : t.border,
                      transition: 'background-color 0.4s',
                    }}>
                      {isComplete ? (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7L5.5 10L11.5 4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      ) : isActive ? (
                        <div style={{ width: '12px', height: '12px', border: '2px solid #fff', borderBottomColor: 'transparent', borderRadius: '50%', animation: 'rotate 0.8s linear infinite' }} />
                      ) : (
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: dark ? '#6b4c3b' : '#ccc' }} />
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: isComplete ? '#10b981' : isActive ? t.text : t.sub, transition: 'color 0.3s' }}>
                        {step.label}
                      </div>
                      {isActive && (
                        <div style={{ fontSize: '11px', color: t.sub, marginTop: '1px' }}>{step.sub}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {/* thin progress bar below */}
            <div style={{ marginTop: '16px', width: '100%', height: '3px', backgroundColor: t.border, borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, #c1121f, #f77f00)', transition: 'width 0.2s', borderRadius: '2px' }} />
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
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl sm:text-3xl font-black m-0 truncate">{project?.name}</h1>
                    <button
                      onClick={openEditModal}
                      title="Edit project"
                      aria-label="Edit project"
                      className="p-1.5 rounded-lg flex-shrink-0 transition-colors"
                      style={{ border: `1px solid ${t.border}`, backgroundColor: 'transparent', color: t.sub, cursor: 'pointer' }}
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
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
                  const ranking = rankingByKeyword.get(kw.text); // O(1) lookup (was O(rankings) per row)
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
                        {editKwId === kw.id ? (
                          <form
                            onClick={(e) => e.stopPropagation()}
                            onSubmit={(e) => handleSaveKeyword(e, kw.id)}
                            className="flex items-center gap-1.5 flex-1 min-w-0"
                          >
                            <input
                              autoFocus
                              value={editKwText}
                              onChange={(e) => setEditKwText(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              className="flex-1 min-w-0 px-2 py-1 rounded-md outline-none text-sm font-semibold"
                              style={{ border: `1px solid ${t.primary}`, backgroundColor: t.bg, color: t.text }}
                            />
                            <button
                              type="submit"
                              title="Save"
                              className="p-1.5 rounded-md flex-shrink-0"
                              style={{ backgroundColor: '#10b981', color: '#fff', border: 'none', cursor: 'pointer' }}
                            >
                              <Check size={14} />
                            </button>
                            <button
                              type="button"
                              title="Cancel"
                              onClick={(e) => { e.stopPropagation(); setEditKwId(null); setEditKwText(''); }}
                              className="p-1.5 rounded-md flex-shrink-0"
                              style={{ backgroundColor: 'transparent', color: t.sub, border: `1px solid ${t.border}`, cursor: 'pointer' }}
                            >
                              <X size={14} />
                            </button>
                          </form>
                        ) : (
                          <>
                            <span className="truncate">{kw.text}</span>
                            <button
                              onClick={(e) => startEditKeyword(e, kw.id, kw.text)}
                              title="Rename keyword"
                              aria-label="Rename keyword"
                              className="p-1 rounded-md flex-shrink-0 transition-colors"
                              style={{ backgroundColor: 'transparent', color: t.sub, border: 'none', cursor: 'pointer' }}
                            >
                              <Pencil size={13} />
                            </button>
                          </>
                        )}
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

            <div className="order-4 lg:order-none rounded-[24px] p-4 sm:p-6 mb-8 lg:mb-0 w-full overflow-hidden" style={{ backgroundColor: t.card, border: `1px solid ${t.border}` }}>
              <h3 className="text-base sm:text-lg font-extrabold mb-4 sm:mb-6">Visibility History</h3>
              <div ref={chartWrapRef} className="h-56 sm:h-[320px] w-full" style={{ minHeight: 224 }}>
                {chartReady && chartData.length > 0 ? (
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
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: t.sub, fontSize: '13px', fontWeight: 600 }}>
                    {chartData.length === 0 ? 'No scan history yet. Run an analysis to see trends.' : 'Loading chart...'}
                  </div>
                )}
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

      {/* Edit Project Modal */}
      {editOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: dark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'fadeIn 0.2s ease-out', padding: '20px'
        }}>
          <form
            onSubmit={handleSaveEdit}
            style={{
              backgroundColor: t.card, border: `1px solid ${t.border}`, borderRadius: '24px',
              padding: '32px', width: '100%', maxWidth: '460px',
              animation: 'slideUp 0.3s ease-out', maxHeight: '90vh', overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <Pencil size={18} color={t.primary} />
              <h2 style={{ fontSize: '20px', fontWeight: 900, margin: 0 }}>Edit Project</h2>
            </div>
            <p style={{ fontSize: '13px', color: t.sub, margin: '0 0 24px' }}>Fix names, location, or radius. Keywords are renamed inline in the list.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: t.sub, marginBottom: '6px' }}>Project Name</label>
                <input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  required
                  style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: '12px', border: `1px solid ${t.border}`, backgroundColor: t.bg, color: t.text, fontSize: '14px', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: t.sub, marginBottom: '6px' }}>Business Name</label>
                <input
                  value={editForm.business_name}
                  onChange={(e) => setEditForm({ ...editForm, business_name: e.target.value })}
                  required
                  style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: '12px', border: `1px solid ${t.border}`, backgroundColor: t.bg, color: t.text, fontSize: '14px', outline: 'none' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: t.sub, marginBottom: '6px' }}>Location</label>
                  <input
                    value={editForm.location}
                    onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                    required
                    style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: '12px', border: `1px solid ${t.border}`, backgroundColor: t.bg, color: t.text, fontSize: '14px', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: t.sub, marginBottom: '6px' }}>Radius (km)</label>
                  <input
                    type="number"
                    value={editForm.radius}
                    onChange={(e) => setEditForm({ ...editForm, radius: Number(e.target.value) })}
                    required
                    style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: '12px', border: `1px solid ${t.border}`, backgroundColor: t.bg, color: t.text, fontSize: '14px', outline: 'none' }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '28px' }}>
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                style={{ flex: 1, padding: '13px', borderRadius: '14px', backgroundColor: 'transparent', color: t.text, border: `1px solid ${t.border}`, fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingEdit}
                style={{ flex: 2, padding: '13px', borderRadius: '14px', background: savingEdit ? t.border : 'linear-gradient(135deg, #c1121f, #f77f00)', color: '#fff', border: 'none', fontWeight: 800, fontSize: '14px', cursor: savingEdit ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                {savingEdit ? <RefreshCw size={16} className="spin" /> : <Save size={16} />}
                {savingEdit ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

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
        .loader { width: 30px; height: 30px; border: 3px solid #c1121f; border-bottom-color: transparent; border-radius: 50%; animation: rotate 1s linear infinite; }
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      `}</style>
    </div>
  );
}
