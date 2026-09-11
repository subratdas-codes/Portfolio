import { Routes, Route } from 'react-router-dom';
import { AdminLayout } from '../components/admin/AdminLayout';
import { CollectionEditor } from '../components/admin/CollectionEditor';
import { SingletonEditor } from '../components/admin/SingletonEditor';
import { FIELD_CONFIGS, SINGLETON_CONFIGS } from '../lib/fieldConfigs';
import { Dashboard } from './admin/Dashboard';
import { PageBuilder } from './admin/PageBuilder';
import { Messages } from './admin/Messages';
import { Analytics } from './admin/Analytics';
import { AuditLogs } from './admin/AuditLogs';
import { Eye, Download } from 'lucide-react';
import { useSingleton } from '../hooks/useStore';

// Generic wrapper components bound to their configs.
const SkillsPage = () => <CollectionEditor table="skills" {...FIELD_CONFIGS.skills} />;
const EducationPage = () => <CollectionEditor table="education" {...FIELD_CONFIGS.education} />;
const ExperiencePage = () => <CollectionEditor table="experience" {...FIELD_CONFIGS.experience} />;
const ProjectsPage = () => <CollectionEditor table="projects" {...FIELD_CONFIGS.projects} />;
const CertificatesPage = () => <CollectionEditor table="certificates" {...FIELD_CONFIGS.certificates} />;
const AchievementsPage = () => <CollectionEditor table="achievements" {...FIELD_CONFIGS.achievements} />;
const GalleryPage = () => <CollectionEditor table="gallery" {...FIELD_CONFIGS.gallery} />;
const TestimonialsPage = () => <CollectionEditor table="testimonials" {...FIELD_CONFIGS.testimonials} />;
const BlogsPage = () => <CollectionEditor table="blogs" {...FIELD_CONFIGS.blogs} />;
const CodingProfilesPage = () => <CollectionEditor table="coding_profiles" {...FIELD_CONFIGS.coding_profiles} />;
const SocialLinksPage = () => <CollectionEditor table="social_links" {...FIELD_CONFIGS.social_links} />;

const ProfilePage = () => <SingletonEditor table="profile" {...SINGLETON_CONFIGS.profile} />;
const HeroPage = () => <SingletonEditor table="hero" {...SINGLETON_CONFIGS.hero} />;
const AboutPage = () => <SingletonEditor table="about" {...SINGLETON_CONFIGS.about} />;
const SettingsPage = () => <SingletonEditor table="settings" {...SINGLETON_CONFIGS.settings} />;

// Resume page shows live counters (views/downloads) above the file editor.
function ResumePage() {
  const resume = useSingleton('resume');
  const counters = [
    { label: 'Resume Views', value: resume.views ?? 0, icon: Eye, color: 'from-violet-500 to-purple-500' },
    { label: 'Resume Downloads', value: resume.downloads ?? 0, icon: Download, color: 'from-emerald-500 to-green-500' },
  ];
  return (
    <div>
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        {counters.map((c) => (
          <div key={c.label} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className={`grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br ${c.color}`}><c.icon size={22} className="text-white" /></div>
            <div>
              <div className="text-2xl font-bold text-white">{c.value}</div>
              <div className="text-sm text-slate-400">{c.label}</div>
            </div>
          </div>
        ))}
      </div>
      <SingletonEditor table="resume" {...SINGLETON_CONFIGS.resume} />
    </div>
  );
}

export function AdminApp() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="hero" element={<HeroPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="skills" element={<SkillsPage />} />
        <Route path="education" element={<EducationPage />} />
        <Route path="experience" element={<ExperiencePage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="certificates" element={<CertificatesPage />} />
        <Route path="achievements" element={<AchievementsPage />} />
        <Route path="coding-profiles" element={<CodingProfilesPage />} />
        <Route path="gallery" element={<GalleryPage />} />
        <Route path="testimonials" element={<TestimonialsPage />} />
        <Route path="blogs" element={<BlogsPage />} />
        <Route path="social-links" element={<SocialLinksPage />} />
        <Route path="resume" element={<ResumePage />} />
        <Route path="page-builder" element={<PageBuilder />} />
        <Route path="messages" element={<Messages />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="audit-logs" element={<AuditLogs />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
