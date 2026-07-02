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
const ResumePage = () => <SingletonEditor table="resume" {...SINGLETON_CONFIGS.resume} />;
const SettingsPage = () => <SingletonEditor table="settings" {...SINGLETON_CONFIGS.settings} />;

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
