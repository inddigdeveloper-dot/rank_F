'use client';

import { useState, useEffect } from 'react';
import { createProject, getProjects } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { 
  Rocket, Plus, X, MapPin, Search, Globe, ShieldCheck, 
  ChevronDown, Copy, Edit3, Layout
} from 'lucide-react';

export default function NewProject() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [dark, setDark] = useState(false);
  const [existingProjects, setExistingProjects] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    name: '',
    business_name: '',
    location: '',
    radius: 5,
    keywords: ['']
  });

  useEffect(() => {
    if (!authLoading && !user) { router.replace('/login'); return; }
    if (!authLoading && user) {
      getProjects().then(setExistingProjects).catch(console.error);
      const check = () => setDark(localStorage.getItem('theme') === 'dark');
      check();
      const interval = setInterval(check, 500);
      return () => clearInterval(interval);
    }
  }, [authLoading, user]);

  if (authLoading || !user) return null;

  const handleTemplateSelect = (projectId: string) => {
    const template = existingProjects.find(p => p.id.toString() === projectId);
    if (template) {
      setFormData({
        name: `${template.name} (Copy)`,
        business_name: template.business_name,
        location: template.location,
        radius: template.radius,
        keywords: template.keywords.map((k: any) => k.text)
      });
    }
  };

  const addKeyword = () => {
    if (formData.keywords.length < 10) {
      setFormData({ ...formData, keywords: [...formData.keywords, ''] });
    }
  };

  const removeKeyword = (index: number) => {
    const newKeywords = formData.keywords.filter((_, i) => i !== index);
    setFormData({ ...formData, keywords: newKeywords });
  };

  const updateKeyword = (index: number, value: string) => {
    const newKeywords = [...formData.keywords];
    newKeywords[index] = value;
    setFormData({ ...formData, keywords: newKeywords });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        keywords: formData.keywords.filter(k => k.trim() !== '')
      };
      await createProject(payload);
      router.push('/');
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const t = {
    bg: dark ? '#1e140f' : '#fffdfc',
    card: dark ? '#2c1e16' : '#ffffff',
    border: dark ? '#473226' : '#e5d7d3',
    text: dark ? '#fefaf9' : '#2c1e16',
    sub: dark ? '#a88c80' : '#735f56',
    input: dark ? '#3a211d' : '#fefaf9',
    primary: '#c1121f',
  };

  return (
    <div className="px-4 py-8 sm:p-10" style={{ backgroundColor: t.bg, minHeight: 'calc(100vh - 120px)' }}>
      <div className="max-w-[850px] mx-auto w-full">
        
        <div className="p-6 sm:p-10 rounded-[24px] sm:rounded-[32px] shadow-sm" style={{ backgroundColor: t.card, border: `1px solid ${t.border}` }}>
          
          <div className="flex items-center gap-2 mb-3">
             <span className="px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider" style={{ backgroundColor: '#c1121f15', color: '#c1121f' }}>Create Project</span>
          </div>
          
          <h1 className="text-2xl sm:text-[32px] font-black m-0 mb-2 tracking-tight" style={{ color: t.text }}>Project Configuration</h1>
          <p className="text-sm sm:text-[15px] mb-8" style={{ color: t.sub }}>Configure your business details and keywords for tracking.</p>

          {/* Template Selection */}
          {existingProjects.length > 0 && (
            <div className="mb-8 p-4 sm:p-5 rounded-2xl" style={{ backgroundColor: dark ? '#3a211d' : '#fef2f2', border: `1px dashed #c1121f50` }}>
              <div className="flex items-center gap-2 mb-3">
                <Copy size={16} color={t.primary} />
                <span className="text-[12px] sm:text-[13px] font-bold" style={{ color: t.primary }}>Quick Fill from Existing Project</span>
              </div>
              <div className="relative">
                <select 
                  onChange={(e) => handleTemplateSelect(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl appearance-none font-semibold text-sm sm:text-base outline-none cursor-pointer"
                  style={{ border: `1px solid ${t.border}`, backgroundColor: t.card, color: t.text }}
                >
                  <option value="">Select a template...</option>
                  {existingProjects.map(p => (
                    <option key={p.id} value={p.id}>{p.name} - {p.business_name}</option>
                  ))}
                </select>
                <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: t.sub }} />
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5 sm:gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
              <div>
                <label className="block text-xs sm:text-[13px] font-extrabold mb-2 uppercase tracking-wide" style={{ color: t.sub }}>Project Name</label>
                <input 
                  type="text" required placeholder="e.g., Your Project Name"
                  value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-3.5 rounded-xl outline-none text-sm sm:text-[15px]"
                  style={{ border: `1px solid ${t.border}`, backgroundColor: t.input, color: t.text }}
                />
              </div>
              <div>
                <label className="block text-xs sm:text-[13px] font-extrabold mb-2 uppercase tracking-wide" style={{ color: t.sub }}>Business Name</label>
                <input 
                  type="text" required placeholder="e.g., Your Business Name"
                  value={formData.business_name} onChange={e => setFormData({...formData, business_name: e.target.value})}
                  className="w-full px-4 py-3.5 rounded-xl outline-none text-sm sm:text-[15px]"
                  style={{ border: `1px solid ${t.border}`, backgroundColor: t.input, color: t.text }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
              <div>
                <label className="block text-xs sm:text-[13px] font-extrabold mb-2 uppercase tracking-wide" style={{ color: t.sub }}>Target Location</label>
                <div className="relative">
                  <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: t.sub }} />
                  <input 
                    type="text" required placeholder="e.g., Area, City"
                    value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})}
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl outline-none text-sm sm:text-[15px]"
                    style={{ border: `1px solid ${t.border}`, backgroundColor: t.input, color: t.text }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs sm:text-[13px] font-extrabold mb-2 uppercase tracking-wide" style={{ color: t.sub }}>Search Radius (km)</label>
                <input 
                  type="number" required
                  value={formData.radius} onChange={e => setFormData({...formData, radius: Number(e.target.value)})}
                  className="w-full px-4 py-3.5 rounded-xl outline-none text-sm sm:text-[15px]"
                  style={{ border: `1px solid ${t.border}`, backgroundColor: t.input, color: t.text }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-3 sm:mb-4">
                <label className="text-xs sm:text-[13px] font-extrabold uppercase tracking-wide" style={{ color: t.sub }}>Keywords ({formData.keywords.length}/10)</label>
                <button type="button" onClick={addKeyword} className="px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold flex items-center gap-1.5 transition-colors" style={{ border: `1px solid ${t.border}`, backgroundColor: t.card, color: t.primary }}>
                  <Plus size={14} /> Add
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {formData.keywords.map((kw, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input 
                      type="text" required placeholder={`Keyword ${i+1}`}
                      value={kw} onChange={e => updateKeyword(i, e.target.value)}
                      className="flex-1 px-4 py-3 rounded-xl outline-none text-sm sm:text-[14px]"
                      style={{ border: `1px solid ${t.border}`, backgroundColor: t.input, color: t.text }}
                    />
                    {formData.keywords.length > 1 && (
                      <button type="button" onClick={() => removeKeyword(i)} className="p-3 rounded-xl flex-shrink-0 transition-colors" style={{ backgroundColor: '#ef444415', color: '#ef4444' }}>
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col-reverse sm:grid sm:grid-cols-[1fr_2fr] gap-3 sm:gap-4 mt-6">
              <button 
                type="button" onClick={() => router.push('/')}
                className="w-full py-3.5 rounded-xl font-bold transition-colors text-sm sm:text-base"
                style={{ border: `1px solid ${t.border}`, backgroundColor: t.card, color: t.text }}
              >
                Cancel
              </button>
              <button 
                type="submit" disabled={loading}
                className="w-full py-3.5 rounded-xl font-extrabold flex items-center justify-center gap-2 text-white text-sm sm:text-base"
                style={{ background: 'linear-gradient(135deg, #c1121f, #f77f00)', boxShadow: '0 6px 20px rgba(193,18,31,0.3)' }}
              >
                {loading ? <div className="loader-small" /> : <Rocket size={20} />}
                {loading ? 'Launching...' : 'Launch Project'}
              </button>
            </div>
          </form>

          <div className="flex items-center justify-center gap-2 mt-8 flex-wrap text-center">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#10b981' }} />
            <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-widest" style={{ color: t.sub }}>SECURED WITH SERPAPI VERIFICATION</span>
          </div>

        </div>
      </div>
      <style>{`
        .loader-small { width: 20px; height: 20px; border: 2px solid #fff; border-bottom-color: transparent; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
