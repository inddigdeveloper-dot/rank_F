'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function CallbackHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { login } = useAuth();

  useEffect(() => {
    // Token arrives in the URL fragment (#token=...), which never reaches a
    // server or shows up in logs. Read it, then strip the hash from history.
    const hash = window.location.hash.startsWith('#')
      ? window.location.hash.slice(1)
      : '';
    const hashToken = new URLSearchParams(hash).get('token');
    const queryToken = searchParams.get('token');
    const token = hashToken || queryToken;
    const error = searchParams.get('error');

    if (token) {
      window.history.replaceState(null, '', window.location.pathname);
      login(token).then(() => {
        // Force a hard reload to ensure state syncs if Next.js router is being stubborn
        window.location.href = '/';
      });
    } else {
      router.replace(`/login${error ? `?error=${error}` : ''}`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '100vh', gap: '16px',
    }}>
      <div style={{
        width: '36px', height: '36px', borderRadius: '50%',
        border: '3px solid #c1121f', borderBottomColor: 'transparent',
        animation: 'spin 0.9s linear infinite',
      }} />
      <p style={{ fontSize: '14px', fontWeight: 600, color: '#735f56' }}>
        Completing sign in…
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
