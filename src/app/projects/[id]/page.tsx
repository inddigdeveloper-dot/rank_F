import ProjectDetailsClient from './ProjectDetailsClient';

// Static export requires at least one entry; real project pages load via client-side routing
export function generateStaticParams() {
  return [{ id: 'placeholder' }];
}

export default function ProjectPage() {
  return <ProjectDetailsClient />;
}
