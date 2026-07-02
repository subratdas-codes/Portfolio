import { lazy, Suspense } from 'react';
import { CardSkeleton } from '../ui/Skeleton';
import { Hero } from './Hero';
import type { ComponentType } from 'react';

// Hero is eager-loaded (above the fold — must render immediately).
// All other sections are lazy-loaded for code-splitting.
const About = lazy(() => import('./About').then((m) => ({ default: m.About })));
const Skills = lazy(() => import('./Skills').then((m) => ({ default: m.Skills })));
const Experience = lazy(() => import('./Experience').then((m) => ({ default: m.Experience })));
const Projects = lazy(() => import('./Projects').then((m) => ({ default: m.Projects })));
const Education = lazy(() => import('./Education').then((m) => ({ default: m.Education })));
const Certificates = lazy(() => import('./Certificates').then((m) => ({ default: m.Certificates })));
const Achievements = lazy(() => import('./Achievements').then((m) => ({ default: m.Achievements })));
const CodingProfiles = lazy(() => import('./CodingProfiles').then((m) => ({ default: m.CodingProfiles })));
const GitHubActivity = lazy(() => import('./GitHubActivity').then((m) => ({ default: m.GitHubActivity })));
const Blogs = lazy(() => import('./Blogs').then((m) => ({ default: m.Blogs })));
const Testimonials = lazy(() => import('./Testimonials').then((m) => ({ default: m.Testimonials })));
const Gallery = lazy(() => import('./Gallery').then((m) => ({ default: m.Gallery })));
const Resume = lazy(() => import('./Resume').then((m) => ({ default: m.Resume })));
const Contact = lazy(() => import('./Contact').then((m) => ({ default: m.Contact })));

const REGISTRY: Record<string, ComponentType> = {
  hero: Hero, about: About, skills: Skills, experience: Experience, projects: Projects,
  education: Education, certificates: Certificates, achievements: Achievements,
  coding: CodingProfiles, github: GitHubActivity, blogs: Blogs, testimonials: Testimonials,
  gallery: Gallery, resume: Resume, contact: Contact,
};

function SectionFallback() {
  return <div className="py-24"><div className="mx-auto max-w-7xl px-6"><div className="grid gap-6 md:grid-cols-3"><CardSkeleton /><CardSkeleton /><CardSkeleton /></div></div></div>;
}

interface SectionRendererProps {
  sections: { key: string; title: string; enabled: boolean; order: number }[];
}

/** Renders only enabled sections in their drag-and-drop order. */
export function SectionRenderer({ sections }: SectionRendererProps) {
  const ordered = [...sections].filter((s) => s.enabled).sort((a, b) => a.order - b.order);
  return (
    <>
      {ordered.map((s) => {
        const Comp = REGISTRY[s.key];
        if (!Comp) return null;
        // Hero renders without Suspense (eager) — no fallback flash.
        if (s.key === 'hero') return <Comp key={s.key} />;
        return (
          <Suspense key={s.key} fallback={<SectionFallback />}>
            <Comp />
          </Suspense>
        );
      })}
    </>
  );
}
