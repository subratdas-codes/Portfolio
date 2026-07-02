// ============================================================================
// Domain Types — mirrors the PostgreSQL / Supabase schema (see schema.sql)
// Every entity is fully editable from the Admin CMS.
// ============================================================================

export type ID = string;
export type ISODate = string;

export interface Profile {
  id: ID;
  name: string;
  role: string;            // professional title
  tagline: string;
  email: string;
  phone: string;
  location: string;
  photo_url: string;
  availability: 'available' | 'open' | 'busy' | 'unavailable';
  availability_note: string;
  typing_roles: string[];  // animated typing effect phrases
  years_experience: number;
  github_username: string;
}

export interface Hero {
  id: ID;
  heading: string;
  subheading: string;
  primary_cta_label: string;
  primary_cta_href: string;
  secondary_cta_label: string;
  secondary_cta_href: string;
  show_voice_assistant: boolean;
  background_effect: 'particles' | 'aurora' | 'grid';
}

export interface About {
  id: ID;
  headline: string;
  paragraphs: string[];
  highlights: { label: string; value: string }[];
  facts: { label: string; value: string }[];
}

export type SkillCategory =
  | 'Backend' | 'Frontend' | 'Database' | 'Cloud' | 'DevOps' | 'Tools' | 'Languages';

export interface Skill {
  id: ID;
  name: string;
  category: SkillCategory;
  level: number;       // 0-100
  icon: string;        // lucide icon name or emoji
  color: string;
}

export interface Education {
  id: ID;
  institution: string;
  logo_url: string;
  degree: string;
  field: string;
  start_date: string;
  end_date: string;
  cgpa: string;
  description: string;
}

export interface Experience {
  id: ID;
  company: string;
  logo_url: string;
  role: string;
  type: 'Full-time' | 'Internship' | 'Part-time' | 'Freelance';
  start_date: string;
  end_date: string;   // 'Present' allowed
  location: string;
  description: string;
  achievements: string[];
}

export interface Project {
  id: ID;
  title: string;
  slug: string;
  short_description: string;
  detailed_description: string;
  image_url: string;
  screenshots: string[];
  demo_video_url: string;
  architecture_diagram_url: string;
  features: string[];
  challenges: string[];
  learnings: string[];
  technologies: string[];
  github_url: string;
  live_url: string;
  featured: boolean;
  views: number;
  created_at: ISODate;
}

export interface Certificate {
  id: ID;
  name: string;
  organization: string;
  logo_url: string;
  image_url: string;
  credential_id: string;
  issue_date: string;
  verification_url: string;
  skills: string[];
}

export type AchievementType =
  | 'Award' | 'Hackathon' | 'Competition' | 'Workshop' | 'Seminar' | 'Internship' | 'Publication'
  | 'Certification' | 'Achievement' | 'Volunteer' | 'Leadership' | 'Organization';

export interface Achievement {
  id: ID;
  title: string;
  type: AchievementType;
  organization: string;
  date: string;
  description: string;
  icon: string;
}

export type GalleryCategory = 'Certificates' | 'Events' | 'College' | 'Projects' | 'Personal';

export interface GalleryItem {
  id: ID;
  title: string;
  image_url: string;
  category: GalleryCategory;
  description: string;
  date: string;
}

export interface Testimonial {
  id: ID;
  name: string;
  role: string;
  company: string;
  avatar_url: string;
  quote: string;
  rating: number;
}

export interface Blog {
  id: ID;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_url: string;
  tags: string[];
  published: boolean;
  published_at: ISODate;
  read_time: number;
}

export interface CodingProfile {
  id: ID;
  platform: string;     // LeetCode, GitHub, HackerRank...
  username: string;
  url: string;
  icon: string;
  stats: { label: string; value: string }[];
}

export interface SocialLink {
  id: ID;
  platform: string;
  url: string;
  icon: string;
}

export interface ContactMessage {
  id: ID;
  name: string;
  email: string;
  subject: string;
  message: string;
  read: boolean;
  starred: boolean;
  created_at: ISODate;
  reply?: string;
}

export interface Resume {
  id: ID;
  file_name: string;
  file_url: string;
  file_size: string;
  uploaded_at: ISODate;
  downloads: number;
}

export interface Settings {
  id: ID;
  site_title: string;
  site_description: string;
  primary_color: string;
  accent_color: string;
  font: string;
  seo_title: string;
  seo_description: string;
  seo_keywords: string;
  og_image: string;
  analytics_enabled: boolean;
}

export interface SectionConfig {
  id: ID;
  key: string;          // unique section key e.g. 'projects'
  title: string;
  enabled: boolean;     // show/hide
  order: number;        // drag & drop order
  built_in: boolean;    // cannot be deleted
}

export interface AnalyticsEvent {
  id: ID;
  type: 'page_view' | 'project_view' | 'resume_download' | 'contact' | 'assistant' | 'click';
  referrer: string;
  path: string;
  meta: string;
  created_at: ISODate;
}

export interface AuditLog {
  id: ID;
  action: string;
  entity: string;
  entity_id: string;
  details: string;
  created_at: ISODate;
}

// Map of every collection name -> row type
export interface Schema {
  profile: Profile;
  hero: Hero;
  about: About;
  skills: Skill;
  education: Education;
  experience: Experience;
  projects: Project;
  certificates: Certificate;
  achievements: Achievement;
  gallery: GalleryItem;
  testimonials: Testimonial;
  blogs: Blog;
  coding_profiles: CodingProfile;
  social_links: SocialLink;
  contact_messages: ContactMessage;
  resume: Resume;
  settings: Settings;
  sections: SectionConfig;
  analytics: AnalyticsEvent;
  audit_logs: AuditLog;
}

export type TableName = keyof Schema;

// Collections that hold arrays of rows (singletons: profile, hero, about, settings, resume)
export type CollectionTable =
  | 'skills' | 'education' | 'experience' | 'projects' | 'certificates'
  | 'achievements' | 'gallery' | 'testimonials' | 'blogs' | 'coding_profiles'
  | 'social_links' | 'contact_messages' | 'sections' | 'analytics' | 'audit_logs';

export type SingletonTable = 'profile' | 'hero' | 'about' | 'settings' | 'resume';
