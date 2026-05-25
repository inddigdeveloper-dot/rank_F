'use client';

import { Suspense } from 'react';
import ProjectDetailsClient from './ProjectDetailsClient';

export default function ProjectsPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <div className="loader" />
        <style>{`.loader { width: 30px; height: 30px; border: 3px solid #c1121f; border-bottom-color: transparent; border-radius: 50%; animation: rotate 1s linear infinite; } @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <ProjectDetailsClient />
    </Suspense>
  );
}
