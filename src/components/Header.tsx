'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sun, Moon, LogOut, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import InddigLogo from '@/components/InddigLogo';

export default function Header() {
  const [dark, setDark] = useState(false);
  const { user, logout } = useAuth();

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') {
      setDark(true);
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    const theme = next ? 'dark' : 'light';
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    window.dispatchEvent(new Event('storage'));
  };

  const t = {
    bg: dark ? '#1e140f' : '#ffffff',
    border: dark ? '#473226' : '#e5d7d3',
    text: dark ? '#fefaf9' : '#2c1e16',
    sub: dark ? '#a88c80' : '#735f56',
    tagBg: dark ? '#3a211d' : '#fef2f2',
  };

  return (
    <nav style={{
      height: '64px',
      backgroundColor: t.bg,
      borderBottom: `1px solid ${t.border}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      transition: 'background-color 0.2s, border-color 0.2s',
    }}>
      {/* Logo */}
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
        <InddigLogo size={36} />
      </Link>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>

        {/* Nav links — desktop only */}
        <div className="hidden md:flex" style={{ alignItems: 'center', gap: '20px', marginRight: '8px' }}>
          <Link href="/" style={{ fontSize: '14px', fontWeight: 600, color: t.sub, textDecoration: 'none' }}>
            Dashboard
          </Link>
          <div style={{ width: '1px', height: '16px', backgroundColor: t.border }} />
        </div>

        {/* User info + logout — when logged in */}
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '5px 10px', borderRadius: '8px',
              backgroundColor: t.tagBg, border: `1px solid ${t.border}`,
            }}>
              <User size={13} color="#c1121f" />
              <span style={{ fontSize: '12px', fontWeight: 700, color: t.text, maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.email}
              </span>
            </div>
            <button
              onClick={logout}
              title="Sign out"
              aria-label="Sign out"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '8px', borderRadius: '10px',
                border: `1px solid ${t.border}`, backgroundColor: 'transparent',
                color: t.sub, cursor: 'pointer', transition: 'all 0.2s',
              }}>
              <LogOut size={16} />
            </button>
          </div>
        )}

        {/* Login link — when not logged in */}
        {!user && (
          <Link href="/login" style={{
            padding: '7px 16px', borderRadius: '10px', textDecoration: 'none',
            background: 'linear-gradient(135deg, #c1121f, #f77f00)',
            color: '#fff', fontSize: '13px', fontWeight: 700,
            boxShadow: '0 2px 8px rgba(193,18,31,0.2)',
          }}>
            Sign In
          </Link>
        )}

        {/* Dark mode toggle */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          title="Toggle theme"
          style={{
            padding: '8px', borderRadius: '10px',
            border: `1px solid ${t.border}`, backgroundColor: 'transparent',
            color: t.sub, cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
          }}>
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        :root { --border-color: #e5d7d3; --text-main: #2c1e16; }
        [data-theme='dark'] { --border-color: #473226; --text-main: #fefaf9; }
      `}} />
    </nav>
  );
}
