// ============================================================================
// Seed Data — initial portfolio content for Subrat Das.
// Loaded into the store on first run. Everything here is editable via CMS.
// ============================================================================

import type { DB } from './store';
import type { Schema } from './types';

const now = new Date().toISOString();
const id = (s: string) => 'seed_' + s;

export function seedData(): DB {
  return {
    profile: [{
      id: id('profile'),
      name: 'Subrat Das',
      role: 'MCA Graduate & Full-Stack Developer',
      tagline: 'Building scalable software, one commit at a time.',
      email: 'subratdas219@gmail.com',
      phone: '+91 8658560689',
      location: 'Bhubaneswar, Odisha, India',
      photo_url: '/subrat-profile.jpg',
      availability: 'available',
      availability_note: 'Open to internships & full-time SDE roles for 2026',
      typing_roles: [
        'Full-Stack Developer',
        'MCA Graduate @ KIIT University',
        'Problem Solver',
        'Open-Source Contributor',
        'Cloud Enthusiast',
      ],
      years_experience: 3,
      github_username: 'subratdas-codes',
    }],

    hero: [{
      id: id('hero'),
      heading: 'Hi, I’m Subrat Das',
      subheading: 'I craft elegant, performant web applications and love solving hard engineering problems.',
      primary_cta_label: 'Download Resume',
      primary_cta_href: '#resume',
      secondary_cta_label: 'Get in Touch',
      secondary_cta_href: '#contact',
      show_voice_assistant: true,
      background_effect: 'particles',
    }],

    about: [{
      id: id('about'),
      headline: 'Turning ideas into production-ready software',
      paragraphs: [
        'I’m a Master of Computer Applications graduate from KIIT University, Bhubaneswar, with a deep passion for building software that scales. My journey began with curiosity about how things work under the hood, which led me to full-stack development, distributed systems, and cloud architecture.',
        'I thrive at the intersection of clean code, thoughtful design, and real-world impact. From crafting pixel-perfect interfaces to designing resilient backends, I enjoy every layer of the stack. I’m currently seeking opportunities where I can learn from world-class engineers and contribute meaningfully.',
        'When I’m not coding, you’ll find me contributing to open source, participating in hackathons, or mentoring juniors in data structures and algorithms.',
      ],
      highlights: [
        { label: 'Projects Built', value: '20+' },
        { label: 'Hackathons', value: '8' },
        { label: 'Open-Source PRs', value: '35+' },
        { label: 'CGPA', value: '8.59' },
      ],
      facts: [
        { label: 'Currently', value: 'MCA Graduate' },
        { label: 'Focus', value: 'Backend & Cloud' },
        { label: 'Languages', value: 'English, Hindi, Odia' },
        { label: 'Hobbies', value: 'Chess, Reading, Tech Blogs' },
      ],
    }],

    skills: [
      { id: id('s1'), name: 'Java', category: 'Backend', level: 90, icon: '☕', color: '#f89820' },
      { id: id('s2'), name: 'Node.js', category: 'Backend', level: 88, icon: '🟢', color: '#339933' },
      { id: id('s3'), name: 'Python', category: 'Backend', level: 85, icon: '🐍', color: '#3776ab' },
      { id: id('s4'), name: 'Spring Boot', category: 'Backend', level: 80, icon: '🌱', color: '#6db33f' },
      { id: id('s5'), name: 'Express', category: 'Backend', level: 86, icon: '⚡', color: '#000000' },
      { id: id('s6'), name: 'React', category: 'Frontend', level: 92, icon: '⚛️', color: '#61dafb' },
      { id: id('s7'), name: 'TypeScript', category: 'Frontend', level: 90, icon: '📘', color: '#3178c6' },
      { id: id('s8'), name: 'Tailwind CSS', category: 'Frontend', level: 93, icon: '🎨', color: '#06b6d4' },
      { id: id('s9'), name: 'Next.js', category: 'Frontend', level: 84, icon: '▲', color: '#000000' },
      { id: id('s10'), name: 'PostgreSQL', category: 'Database', level: 87, icon: '🐘', color: '#4169e1' },
      { id: id('s11'), name: 'MongoDB', category: 'Database', level: 85, icon: '🍃', color: '#47a248' },
      { id: id('s12'), name: 'Redis', category: 'Database', level: 78, icon: '🔴', color: '#dc382d' },
      { id: id('s13'), name: 'AWS', category: 'Cloud', level: 82, icon: '☁️', color: '#ff9900' },
      { id: id('s14'), name: 'Supabase', category: 'Cloud', level: 88, icon: '⚡', color: '#3ecf8e' },
      { id: id('s15'), name: 'Docker', category: 'DevOps', level: 80, icon: '🐳', color: '#2496ed' },
      { id: id('s16'), name: 'GitHub Actions', category: 'DevOps', level: 78, icon: '🔧', color: '#2088ff' },
      { id: id('s17'), name: 'Git', category: 'Tools', level: 92, icon: '🔀', color: '#f05032' },
      { id: id('s18'), name: 'Postman', category: 'Tools', level: 90, icon: '📮', color: '#ff6c37' },
      { id: id('s19'), name: 'Figma', category: 'Tools', level: 75, icon: '🎯', color: '#f24e1e' },
      { id: id('s20'), name: 'C++', category: 'Languages', level: 88, icon: '💠', color: '#00599c' },
      { id: id('s21'), name: 'SQL', category: 'Languages', level: 86, icon: '🗃️', color: '#e38c00' },
    ],

    education: [
      {
        id: id('e1'),
        institution: 'Kalinga Institute of Industrial Technology (KIIT University)',
        logo_url: 'https://kiit.ac.in/wp-content/uploads/2020/11/kiit-logo.png',
        degree: 'Master of Computer Applications (MCA)',
        field: 'Computer Science & Applications',
        start_date: '2024',
        end_date: '2026',
        cgpa: '8.59 / 10',
        description: 'Completed MCA from KIIT University, Bhubaneswar with a CGPA of 8.59. Specialized in software engineering, full-stack development, and system design. Active member of the KIIT Coding Club.',
      },
      {
        id: id('e2'),
        institution: 'Christ Degree College, Cuttack (Utkal University)',
        logo_url: 'https://upload.wikimedia.org/wikipedia/en/thumb/4/4d/Utkal_University_logo.png/120px-Utkal_University_logo.png',
        degree: 'Bachelor of Science in Physics',
        field: 'Physics',
        start_date: '2018',
        end_date: '2021',
        cgpa: '7.59 / 10',
        description: 'Completed B.Sc. in Physics from Utkal University. Developed strong analytical and problem-solving skills that laid the foundation for a transition into software development.',
      },
      {
        id: id('e3'),
        institution: 'Sukinda College, Sukinda',
        logo_url: '',
        degree: 'CHSE Odisha (12th)',
        field: 'Science',
        start_date: '2016',
        end_date: '2018',
        cgpa: '60.16%',
        description: 'Completed higher secondary education (12th) under the Council of Higher Secondary Education, Odisha, with a focus on Science.',
      },
      {
        id: id('e4'),
        institution: 'Jagannath High School, Sukinda',
        logo_url: '',
        degree: 'BSE Odisha (10th)',
        field: 'Secondary Education',
        start_date: '2016',
        end_date: '2016',
        cgpa: '77.33%',
        description: 'Completed secondary education (10th) under the Board of Secondary Education, Odisha.',
      },
    ],

    experience: [
      {
        id: id('x0'),
        company: 'Academy of Skill Development',
        logo_url: '',
        role: 'Full Stack Developer Intern',
        type: 'Internship',
        start_date: '2025-05',
        end_date: '2025-07',
        location: 'Remote',
        description: 'Built a role-based Doctor Clinic Management System using Spring Boot, Spring Security, Thymeleaf, and MySQL. GitHub: github.com/subratdas-codes/doctor-clinic-app',
        achievements: [
          'Developed a role-based Doctor Clinic Management System using Spring Boot, Spring Security, Thymeleaf, and MySQL for Admin, Doctor, and Patient users',
          'Built 10+ REST APIs for appointments, patient records, and doctor scheduling using the Controller–Service–Repository architecture',
          'Implemented secure authentication and role-based authorization with Spring Security and BCrypt, and optimized MySQL queries for efficient data management',
        ],
      },
    ],

    projects: [
      {
        id: id('p1'),
        title: 'AimRoute — AI Career Guidance',
        slug: 'aimroute',
        short_description: 'An AI-powered career guidance platform that helps users discover ideal career paths.',
        detailed_description: 'AimRoute is an AI-powered career guidance platform that analyzes user skills, interests, and aptitudes to recommend personalized career paths. It features an intelligent recommendation engine built with FastAPI, an interactive React dashboard for exploring career roadmaps, skill-gap analysis, and a MySQL database for persistent user profiles and assessment data. The platform leverages machine learning to match users with suitable career trajectories and provides actionable learning roadmaps.',
        image_url: '/projects/aimroute.jpg',
        screenshots: [],
        demo_video_url: '',
        architecture_diagram_url: '',
        features: ['AI-powered career path recommendations', 'Skill-gap analysis', 'Personalized learning roadmaps', 'Interactive assessment quizzes', 'Career progression tracking', 'User profile management'],
        challenges: ['Designing an effective recommendation algorithm', 'Structuring career data for ML processing', 'Building responsive assessment flows'],
        learnings: ['Integrating ML models with FastAPI', 'Designing recommendation systems', 'Full-stack architecture with Python backend'],
        technologies: ['Python', 'FastAPI', 'React', 'MySQL'],
        github_url: 'https://github.com/subratdas-codes/AimRoute',
        live_url: '',
        featured: true,
        views: 0,
        created_at: now,
      },
      {
        id: id('p2'),
        title: 'DentCare — Doctor Clinic Management System',
        slug: 'dentcare',
        short_description: 'A role-based clinic management system for admins, doctors, and patients with appointment scheduling and medical records.',
        detailed_description: 'DentCare is a full-stack Doctor Clinic Management System built with Spring Boot, Thymeleaf, and MySQL. It provides role-based access for Admin, Doctor, and Patient users. Admins manage doctors, patients, and clinic operations; doctors view appointments, manage patient records, and update prescriptions; patients book appointments and view their medical history. The system uses Spring Security with BCrypt for authentication, follows the Controller–Service–Repository architecture, and includes 10+ REST APIs for appointments, patient records, and doctor scheduling.',
        image_url: '/projects/dentcare.jpg',
        screenshots: [],
        demo_video_url: '',
        architecture_diagram_url: '',
        features: ['Role-based access (Admin, Doctor, Patient)', 'Appointment scheduling & management', 'Patient medical records & prescriptions', 'Doctor availability management', 'Spring Security with BCrypt authentication', 'Controller–Service–Repository architecture'],
        challenges: ['Designing flexible role-based access control for three user types', 'Managing doctor-patient appointment conflicts', 'Ensuring data consistency across medical records'],
        learnings: ['Spring Boot MVC architecture with Thymeleaf', 'Implementing Spring Security with role-based authorization', 'Designing normalized MySQL schemas for healthcare data'],
        technologies: ['Spring Boot', 'Thymeleaf', 'MySQL', 'Spring Security', 'Java', 'BCrypt'],
        github_url: 'https://github.com/subratdas-codes/doctor-clinic-app',
        live_url: '',
        featured: true,
        views: 0,
        created_at: now,
      },
    ],

    certificates: [
      {
        id: id('c1'), name: 'Java Programming Certificate',
        organization: 'LearnVern', logo_url: '',
        image_url: '/certs/java-programming.jpg',
        credential_id: '', issue_date: '2023',
        verification_url: 'https://drive.google.com/file/d/1OMP2cAb3BEYp7Y5KqG-7iswryJtKJuYr/view?usp=drive_link', skills: ['Java', 'OOP', 'JDBC', 'Collections', 'Multithreading'],
      },
      {
        id: id('c2'), name: 'Full Stack Web Development Internship Certificate',
        organization: 'Academy of Skill Development', logo_url: '',
        image_url: '/certs/fullstack-internship.jpg',
        credential_id: '', issue_date: '2025',
        verification_url: 'https://drive.google.com/file/d/1-t5UXSsNPaFGNAHJ1JzeZP_yL2WjaCz5/view?usp=drive_link', skills: ['Spring Boot', 'MySQL', 'REST API', 'Full Stack'],
      },
      {
        id: id('c3'), name: 'Industrial Training Certificate',
        organization: 'Industrial Training', logo_url: '',
        image_url: '/certs/industrial-training.jpg',
        credential_id: '', issue_date: '2025',
        verification_url: 'https://drive.google.com/file/d/1zyceOVykYXG2zqmfJYeiiCu_fYsZRD7S/view?usp=drive_link', skills: ['Software Development', 'Project Implementation'],
      },
    ],

    achievements: [
      { id: id('a1'), title: 'AWS Academy Graduate — Cloud Architecting', type: 'Certification', organization: 'AWS Academy', date: 'Jul 2025', description: 'Successfully completed the 60-hour AWS Academy Cloud Architecting program covering cloud infrastructure, networking, compute, storage, security, and architecture best practices.', icon: '☁️' },
      { id: id('a2'), title: 'Internshala Student Partner — Direct Entry', type: 'Achievement', organization: 'Internshala', date: 'Aug 2025', description: 'Earned Direct Entry into the Internshala Student Partner Program after successfully referring 15 students, demonstrating leadership, communication, and networking skills.', icon: '🚀' },
      { id: id('a3'), title: 'IEEE OCIT 2025 Volunteer', type: 'Volunteer', organization: 'IEEE • KIIT University', date: '2025', description: 'Served as an Organizing Team Volunteer for the 23rd International Conference on Information Technology (OCIT 2025), supporting event coordination and interacting with researchers and industry professionals.', icon: '🤝' },
      { id: id('a4'), title: 'KIIT Fest 9.0 — Event Ambassador', type: 'Leadership', organization: 'KIIT School of Computer Applications', date: '2025', description: 'Represented the School of Computer Applications as an Event Ambassador, coordinating activities, promoting events, and assisting with successful execution of KIIT Fest 9.0.', icon: '🎯' },
      { id: id('a5'), title: 'KIIT Fest 9.0 — Organizing Committee', type: 'Organization', organization: 'KIIT KSAC', date: '2025', description: 'Worked as an Organizing Committee Member, managing event logistics, volunteer coordination, and smooth execution of one of KIIT University\'s largest cultural festivals.', icon: '🎉' },
      { id: id('a6'), title: 'MCA Class Representative (CR)', type: 'Leadership', organization: 'KIIT University', date: '2024–2026', description: 'Elected Class Representative for the MCA program, acting as the liaison between students and faculty while coordinating academic and extracurricular activities.', icon: '👨‍💼' },
    ],

    gallery: [
      { id: id('g1'), title: 'Smart India Hackathon Victory', image_url: 'https://images.unsplash.com/photo-1531058020387-3be344556be6?w=1200&q=80', category: 'Events', description: 'Celebrating the win with the team.', date: '2024-09' },
      { id: id('g2'), title: 'KIIT Campus', image_url: 'https://images.unsplash.com/photo-1562774053-701939374585?w=1200&q=80', category: 'College', description: 'Beautiful KIIT campus grounds.', date: '2024-01' },
      { id: id('g3'), title: 'Tech Talk Delivery', image_url: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=1200&q=80', category: 'Events', description: 'Speaking on microservices.', date: '2024-02' },
      { id: id('g4'), title: 'AWS Certificate', image_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&q=80', category: 'Certificates', description: 'Solutions Architect Associate.', date: '2024-03' },
      { id: id('g5'), title: 'Project Showcase', image_url: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=1200&q=80', category: 'Projects', description: 'DevConnect demo day.', date: '2024-06' },
      { id: id('g6'), title: 'Hackathon Coding', image_url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200&q=80', category: 'Events', description: 'Late-night coding session.', date: '2024-09' },
    ],

    testimonials: [
      { id: id('t1'), name: 'Dr. Anil Sharma', role: 'Professor & Mentor', company: 'KIIT University', avatar_url: 'https://i.pravatar.cc/150?img=12', quote: 'Subrat is one of the most driven students I’ve mentored. His grasp of system design and eagerness to learn set him apart. He’d be an asset to any engineering team.', rating: 5 },
      { id: id('t2'), name: 'Priya Nair', role: 'Engineering Manager', company: 'Tech Mahindra', avatar_url: 'https://i.pravatar.cc/150?img=45', quote: 'During his internship, Subrat shipped features that senior engineers struggled with. His ownership and code quality were exceptional.', rating: 5 },
      { id: id('t3'), name: 'Rahul Verma', role: 'Founder', company: 'CodeClan Labs', avatar_url: 'https://i.pravatar.cc/150?img=33', quote: 'Subrat delivered our MVP ahead of schedule with a polish I rarely see. Reliable, communicative, and genuinely talented.', rating: 5 },
    ],

    blogs: [
      { id: id('b1'), title: 'Designing Resilient Microservices with Circuit Breakers', slug: 'circuit-breakers', excerpt: 'A practical guide to building fault-tolerant microservices using the circuit breaker pattern.', content: 'In distributed systems, failure is inevitable. The circuit breaker pattern helps isolate failures and prevents cascading outages by wrapping calls to remote services with logic that trips when failures exceed a threshold.', cover_url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=80', tags: ['Microservices', 'System Design', 'Resilience'], published: true, published_at: now, read_time: 8 },
      { id: id('b2'), title: 'Why I Chose Supabase for My Next Side Project', slug: 'why-supabase', excerpt: 'How Supabase accelerates full-stack development without vendor lock-in.', content: 'Supabase gives you Postgres, auth, storage, and realtime out of the box. It is open source and portable, which means you can self-host if you ever outgrow the managed offering.', cover_url: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=1200&q=80', tags: ['Supabase', 'PostgreSQL', 'Backend'], published: true, published_at: now, read_time: 6 },
      { id: id('b3'), title: 'Mastering PostgreSQL Indexes for Performance', slug: 'pg-indexes', excerpt: 'Deep dive into B-tree, GIN, and partial indexes with real benchmarks.', content: 'Indexes are the single biggest lever for query performance. Choosing the right index type (B-tree, GIN, GiST, BRIN) and using partial indexes can cut query times by orders of magnitude.', cover_url: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=1200&q=80', tags: ['PostgreSQL', 'Database', 'Performance'], published: true, published_at: now, read_time: 10 },
    ],

    coding_profiles: [
      { id: id('cp1'), platform: 'GitHub', username: 'subratdas-codes', url: 'https://github.com/subratdas-codes', icon: '🐙', stats: [{ label: 'Repositories', value: '14' }, { label: 'Followers', value: '0' }, { label: 'Stars', value: '0' }] },
      { id: id('cp2'), platform: 'LeetCode', username: 'subratdas219', url: 'https://leetcode.com/subratdas219', icon: '🧩', stats: [{ label: 'Problems Solved', value: '520' }, { label: 'Contest Rating', value: '1842' }, { label: 'Global Rank', value: 'Top 8%' }] },
      { id: id('cp3'), platform: 'HackerRank', username: 'subratdas219', url: 'https://hackerrank.com/subratdas219', icon: '🟢', stats: [{ label: 'Badges', value: '6' }, { label: 'Gold', value: '3' }, { label: 'Stars', value: '5★' }] },
      { id: id('cp4'), platform: 'CodeChef', username: 'subratdas', url: 'https://codechef.com/users/subratdas', icon: '👨‍🍳', stats: [{ label: 'Rating', value: '1720' }, { label: 'Stars', value: '3★' }, { label: 'Problems', value: '210' }] },
    ],

    social_links: [
      { id: id('sl1'), platform: 'GitHub', url: 'https://github.com/subratdas-codes', icon: 'Github' },
      { id: id('sl2'), platform: 'LinkedIn', url: 'https://linkedin.com/in/subratdas219', icon: 'Linkedin' },
      { id: id('sl3'), platform: 'Email', url: 'mailto:subratdas219@gmail.com', icon: 'Mail' },
      { id: id('sl4'), platform: 'Twitter', url: 'https://twitter.com/subratdas219', icon: 'Twitter' },
    ],

    contact_messages: [
      { id: id('m1'), name: 'Sarah Chen', email: 'recruiter@google.com', subject: 'SWE Internship Opportunity', message: 'Hi Subrat, I came across your portfolio and was impressed by your projects. We’d love to chat about a Software Engineering internship at Google. Are you available next week?', read: false, starred: true, created_at: now },
      { id: id('m2'), name: 'James Patel', email: 'talent@atlassian.com', subject: 'Your DevConnect project', message: 'Your DevConnect project is impressive! We have a similar internal tool and would love your perspective. Let’s connect.', read: true, starred: false, created_at: now },
    ],

    resume: [{
      id: id('resume'),
      file_name: 'Subrat_Das_Resume.pdf',
      file_url: '/subrat-profile.jpg',
      file_size: '284 KB',
      uploaded_at: now,
      downloads: 87,
    }],

    settings: [{
      id: id('settings'),
      site_title: 'Subrat Das — Full-Stack Developer & MCA Graduate',
      site_description: 'Portfolio of Subrat Das, MCA graduate from KIIT University. Full-stack developer specializing in scalable web applications and cloud architecture.',
      primary_color: '#6366f1',
      accent_color: '#22d3ee',
      font: 'Inter',
      seo_title: 'Subrat Das | Full-Stack Developer & MCA @ KIIT',
      seo_description: 'Full-stack developer and MCA graduate from KIIT University building scalable web applications with React, Node.js, and cloud technologies.',
      seo_keywords: 'Subrat Das, full-stack developer, MCA KIIT, React developer, Node.js, software engineer, Bhubaneswar',
      og_image: '/subrat-profile.jpg',
      analytics_enabled: true,
    }],

    sections: [
      { id: id('sec_hero'), key: 'hero', title: 'Hero', enabled: true, order: 0, built_in: true },
      { id: id('sec_about'), key: 'about', title: 'About Me', enabled: true, order: 1, built_in: true },
      { id: id('sec_skills'), key: 'skills', title: 'Skills', enabled: true, order: 2, built_in: true },
      { id: id('sec_experience'), key: 'experience', title: 'Experience', enabled: true, order: 3, built_in: true },
      { id: id('sec_projects'), key: 'projects', title: 'Projects', enabled: true, order: 4, built_in: true },
      { id: id('sec_education'), key: 'education', title: 'Education', enabled: true, order: 5, built_in: true },
      { id: id('sec_certificates'), key: 'certificates', title: 'Certifications', enabled: true, order: 6, built_in: true },
      { id: id('sec_achievements'), key: 'achievements', title: 'Achievements', enabled: true, order: 7, built_in: true },
      { id: id('sec_coding'), key: 'coding', title: 'Coding Profiles', enabled: true, order: 8, built_in: true },
      { id: id('sec_github'), key: 'github', title: 'GitHub Activity', enabled: true, order: 9, built_in: true },
      { id: id('sec_blogs'), key: 'blogs', title: 'Blog', enabled: true, order: 10, built_in: true },
      { id: id('sec_testimonials'), key: 'testimonials', title: 'Testimonials', enabled: true, order: 11, built_in: true },
      { id: id('sec_gallery'), key: 'gallery', title: 'Gallery', enabled: true, order: 12, built_in: true },
      { id: id('sec_resume'), key: 'resume', title: 'Resume', enabled: true, order: 13, built_in: true },
      { id: id('sec_contact'), key: 'contact', title: 'Contact', enabled: true, order: 14, built_in: true },
    ],

    analytics: [
      { id: id('an1'), type: 'page_view', referrer: 'linkedin.com', path: '/', meta: '', created_at: now },
      { id: id('an2'), type: 'project_view', referrer: 'direct', path: '/', meta: 'devconnect', created_at: now },
      { id: id('an3'), type: 'resume_download', referrer: 'google.com', path: '/', meta: '', created_at: now },
      { id: id('an4'), type: 'contact', referrer: 'direct', path: '/', meta: 'new message', created_at: now },
    ],

    audit_logs: [
      { id: id('al1'), action: 'seed', entity: 'system', entity_id: 'all', details: 'Database seeded with initial content', created_at: now },
    ],
  } as DB;
}

export type { Schema };
