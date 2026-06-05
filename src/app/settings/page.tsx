'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Key, Save, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getUserSettings, updateUserSettings } from '@/lib/api';

export default function SettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [dark, setDark] = useState(false);

  const [serpApiKey, setSerpApiKey] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') {
      setDark(true);
    }
    const onStorage = () => {
      const t = localStorage.getItem('theme');
      setDark(t === 'dark');
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    getUserSettings()
      .then((data) => {
        setSerpApiKey(data.serpapi_key || '');
        setHasKey(data.has_serpapi_key);
      })
      .catch(() => setMessage({ type: 'error', text: 'Failed to load settings.' }))
      .finally(() => setLoading(false));
  }, [user, router]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const data = await updateUserSettings({ serpapi_key: serpApiKey });
      setSerpApiKey(data.serpapi_key || '');
      setHasKey(data.has_serpapi_key);
      setMessage({ type: 'success', text: 'Settings saved successfully.' });
    } catch {
      setMessage({ type: 'error', text: 'Failed to save settings.' });
    } finally {
      setSaving(false);
    }
  };

  const t = {
    bg: dark ? '#1a0f0a' : '#faf5f2',
    card: dark ? '#1e140f' : '#ffffff',
    border: dark ? '#473226' : '#e5d7d3',
    text: dark ? '#fefaf9' : '#2c1e16',
    sub: dark ? '#a88c80' : '#735f56',
    input: dark ? '#2a1a12' : '#ffffff',
    inputBorder: dark ? '#5c3d2e' : '#ddd0cb',
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: t.sub, fontSize: '14px' }}>Loading settings…</span>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: t.bg, padding: '40px 24px' }}>
      <div style={{ maxWidth: '560px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: t.text, marginBottom: '6px' }}>Settings</h1>
        <p style={{ fontSize: '13px', color: t.sub, marginBottom: '32px' }}>
          Manage your account settings and API keys.
        </p>

        {/* SerpAPI Key card */}
        <div style={{
          backgroundColor: t.card,
          border: `1px solid ${t.border}`,
          borderRadius: '14px',
          padding: '28px',
          marginBottom: '20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <Key size={16} color="#c1121f" />
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: t.text, margin: 0 }}>SerpAPI Key</h2>
            {hasKey && (
              <span style={{
                fontSize: '11px', fontWeight: 700, padding: '2px 8px',
                borderRadius: '20px', backgroundColor: '#d1fae5', color: '#065f46',
              }}>Active</span>
            )}
          </div>
          <p style={{ fontSize: '12px', color: t.sub, marginBottom: '20px', lineHeight: 1.6 }}>
            Your personal SerpAPI key is used for all rank scans. Without it, the app falls back to the
            shared key (if configured). Get one at{' '}
            <a href="https://serpapi.com" target="_blank" rel="noreferrer" style={{ color: '#c1121f' }}>
              serpapi.com
            </a>.
          </p>

          <div style={{ position: 'relative', marginBottom: '20px' }}>
            <input
              type={showKey ? 'text' : 'password'}
              value={serpApiKey}
              onChange={(e) => setSerpApiKey(e.target.value)}
              placeholder={hasKey ? 'Enter new key to replace existing' : 'Paste your SerpAPI key here'}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px 44px 10px 14px',
                borderRadius: '10px',
                border: `1px solid ${t.inputBorder}`,
                backgroundColor: t.input,
                color: t.text,
                fontSize: '13px',
                fontFamily: 'monospace',
                outline: 'none',
              }}
            />
            <button
              onClick={() => setShowKey((v) => !v)}
              aria-label={showKey ? 'Hide key' : 'Show key'}
              style={{
                position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: t.sub, display: 'flex',
              }}
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {message && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 14px', borderRadius: '8px', marginBottom: '16px',
              backgroundColor: message.type === 'success' ? '#d1fae5' : '#fee2e2',
              color: message.type === 'success' ? '#065f46' : '#991b1b',
              fontSize: '13px',
            }}>
              {message.type === 'success'
                ? <CheckCircle size={14} />
                : <AlertCircle size={14} />}
              {message.text}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '9px 20px', borderRadius: '10px', border: 'none',
                background: saving ? '#ccc' : 'linear-gradient(135deg, #c1121f, #f77f00)',
                color: '#fff', fontSize: '13px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              <Save size={14} />
              {saving ? 'Saving…' : 'Save Key'}
            </button>
            {hasKey && (
              <button
                onClick={() => { setSerpApiKey(''); handleSave(); }}
                disabled={saving}
                style={{
                  padding: '9px 16px', borderRadius: '10px',
                  border: `1px solid ${t.border}`, background: 'transparent',
                  color: t.sub, fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                }}
              >
                Remove Key
              </button>
            )}
          </div>
        </div>

        {/* Account info card */}
        <div style={{
          backgroundColor: t.card,
          border: `1px solid ${t.border}`,
          borderRadius: '14px',
          padding: '24px 28px',
        }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: t.text, marginBottom: '14px' }}>Account</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Row label="Email" value={user?.email || ''} t={t} />
            <Row label="Sign-in method" value={user?.auth_provider === 'google' ? 'Google OAuth' : 'Email / Password'} t={t} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, t }: { label: string; value: string; t: Record<string, string> }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
      <span style={{ color: t.sub }}>{label}</span>
      <span style={{ color: t.text, fontWeight: 600 }}>{value}</span>
    </div>
  );
}
