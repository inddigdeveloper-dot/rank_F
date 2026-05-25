import { Suspense } from 'react';
import CallbackHandler from './CallbackHandler';

export default function CallbackPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '3px solid #c1121f', borderBottomColor: 'transparent', animation: 'spin 0.9s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <CallbackHandler />
    </Suspense>
  );
}
