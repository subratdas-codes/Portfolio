import { useEffect } from 'react';
import { Navbar } from '../components/public/Navbar';
import { Footer } from '../components/public/Footer';
import { Assistant } from '../components/public/Assistant';
import { SectionRenderer } from '../components/public/SectionRenderer';
import { SyncIndicator } from '../components/ui/SyncIndicator';
import { useCollection, useSingleton } from '../hooks/useStore';
import { trackEvent, syncFromCloud, startCloudPolling } from '../lib/store';

export function PublicSite() {
  const sections = useCollection('sections');
  const settings = useSingleton('settings');
  const hero = useSingleton('hero');

  useEffect(() => {
    // Sync from cloud on load — picks up latest admin edits from any device
    syncFromCloud();
    // Poll every 20s for updates (e.g. admin published new content)
    const stopPolling = startCloudPolling(10000);
    return stopPolling;
  }, []);

  useEffect(() => {
    trackEvent('page_view');
    document.title = settings.seo_title || settings.site_title;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', settings.seo_description);
  }, [settings.seo_title, settings.seo_description, settings.site_title]);

  // Ensure hero is always first and present
  const visible = sections.filter((s) => s.key !== 'hero');
  const heroSection = sections.find((s) => s.key === 'hero');

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Navbar />
      <main>
        {heroSection?.enabled !== false && (
          <SectionRenderer sections={[{ key: 'hero', title: 'Hero', enabled: true, order: -1 }]} />
        )}
        <SectionRenderer sections={visible} />
      </main>
      <Footer />
      {hero.show_voice_assistant && <Assistant />}
      <SyncIndicator />
    </div>
  );
}
