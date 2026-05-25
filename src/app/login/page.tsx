'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { API_URL } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import InddigLogo from '@/components/InddigLogo';
import { BarChart3, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';

function LoginContent() {
  const { user, loading, login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const urlError = searchParams.get('error');
    if (urlError === 'no_email') setError('Google account has no email address.');
    else if (urlError === 'auth_failed') setError('Google sign-in failed. Please try again.');

    const saved = localStorage.getItem('theme');
    setDark(saved === 'dark');
  }, [searchParams]);

  // Already logged in — go to dashboard
  useEffect(() => {
    if (!loading && user) router.replace('/');
  }, [loading, user, router]);

  const t = {
    bg: dark ? '#1e140f' : '#fffdfc',
    card: dark ? '#2c1e16' : '#ffffff',
    border: dark ? '#473226' : '#e5d7d3',
    text: dark ? '#fefaf9' : '#2c1e16',
    sub: dark ? '#a88c80' : '#735f56',
    input: dark ? '#3a211d' : '#fefaf9',
    primary: '#c1121f',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const endpoint = tab === 'login' ? '/auth/token' : '/auth/register';

      let res: Response;
      if (tab === 'login') {
        // OAuth2PasswordRequestForm expects form-encoded body
        const form = new URLSearchParams();
        form.append('username', email);
        form.append('password', password);
        res = await fetch(`${API_URL}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: form.toString(),
        });
      } else {
        res = await fetch(`${API_URL}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Authentication failed');

      await login(data.access_token);
      router.replace('/');
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return null;

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: t.bg, padding: '24px',
    }}>
      <div style={{
        width: '100%', maxWidth: '420px',
        backgroundColor: t.card, borderRadius: '28px',
        border: `1px solid ${t.border}`,
        padding: '40px 36px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.08)',
      }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <InddigLogo size={36} />
          </Link>
          <span style={{ fontSize: '20px', fontWeight: 800, color: t.text, letterSpacing: '-0.02em' }}>
            Inddig RankChecker
          </span>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: '4px', marginBottom: '28px',
          backgroundColor: dark ? '#3a211d' : '#f5f0ef',
          borderRadius: '12px', padding: '4px',
        }}>
          {(['login', 'register'] as const).map((t2) => (
            <button key={t2} onClick={() => { setTab(t2); setError(''); }}
              style={{
                flex: 1, padding: '8px', borderRadius: '8px', border: 'none',
                fontWeight: 700, fontSize: '13px', cursor: 'pointer',
                backgroundColor: tab === t2 ? t.card : 'transparent',
                color: tab === t2 ? t.text : t.sub,
                boxShadow: tab === t2 ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s',
              }}>
              {t2 === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        <h1 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: 900, color: t.text }}>
          {tab === 'login' ? 'Welcome back' : 'Get started free'}
        </h1>
        <p style={{ margin: '0 0 24px', fontSize: '13px', color: t.sub }}>
          {tab === 'login' ? 'Sign in to your account to continue.' : 'Create your account to start tracking.'}
        </p>

        {/* Google Button */}
        <a href={`${API_URL}/login/google`}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            width: '100%', padding: '12px', borderRadius: '12px', textDecoration: 'none',
            border: `1px solid ${t.border}`, backgroundColor: t.card,
            color: t.text, fontWeight: 700, fontSize: '14px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)', transition: 'box-shadow 0.2s',
          }}>
          {/* Google icon SVG */}
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            <path fill="none" d="M0 0h48v48H0z" />
          </svg>
          Continue with Google
        </a>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: t.border }} />
          <span style={{ fontSize: '11px', fontWeight: 700, color: t.sub, textTransform: 'uppercase', letterSpacing: '0.08em' }}>or</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: t.border }} />
        </div>

        {/* Error */}
        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '12px 14px', borderRadius: '10px', marginBottom: '16px',
            backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c',
            fontSize: '13px', fontWeight: 600,
          }}>
            <AlertCircle size={15} />
            {error}
          </div>
        )}

        {/* Email / Password form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: t.sub, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
              Email
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={15} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: t.sub }} />
              <input
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" autoComplete="email"
                style={{
                  width: '100%', padding: '11px 14px 11px 38px', borderRadius: '10px',
                  border: `1px solid ${t.border}`, backgroundColor: t.input,
                  color: t.text, fontSize: '14px', outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: t.sub, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: t.sub }} />
              <input
                type={showPassword ? 'text' : 'password'} required value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                style={{
                  width: '100%', padding: '11px 40px 11px 38px', borderRadius: '10px',
                  border: `1px solid ${t.border}`, backgroundColor: t.input,
                  color: t.text, fontSize: '14px', outline: 'none', boxSizing: 'border-box',
                }}
              />
              <button type="button" onClick={() => setShowPassword(p => !p)}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: t.sub, padding: 0 }}>
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={submitting}
            style={{
              width: '100%', padding: '13px', borderRadius: '12px', border: 'none',
              background: 'linear-gradient(135deg, #c1121f, #f77f00)',
              color: '#fff', fontWeight: 800, fontSize: '15px', cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.7 : 1,
              boxShadow: '0 4px 14px rgba(193,18,31,0.3)',
              marginTop: '4px',
            }}>
            {submitting ? 'Please wait...' : tab === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
