import { useCollection } from '../../hooks/useStore';
import { SectionHeading } from '../ui/SectionHeading';
import { Reveal } from '../ui/Reveal';
import { motion } from 'framer-motion';

const TYPE_COLORS: Record<string, string> = {
  Award: 'from-amber-500 to-orange-500', Hackathon: 'from-indigo-500 to-purple-500',
  Competition: 'from-cyan-500 to-blue-500', Workshop: 'from-emerald-500 to-teal-500',
  Seminar: 'from-rose-500 to-pink-500', Internship: 'from-violet-500 to-fuchsia-500', Publication: 'from-sky-500 to-cyan-500',
  Certification: 'from-orange-500 to-amber-500', Achievement: 'from-indigo-500 to-blue-500',
  Volunteer: 'from-emerald-500 to-green-500', Leadership: 'from-violet-500 to-purple-500',
  Organization: 'from-cyan-500 to-teal-500',
};

export function Achievements() {
  const items = useCollection('achievements');
  return (
    <section id="achievements" className="relative py-24">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading eyebrow="Achievements" title="Wins & milestones" subtitle="Recognition from hackathons, competitions, and the community." />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((a, i) => (
            <Reveal key={a.id} delay={i * 0.06}>
              <motion.div whileHover={{ y: -4 }} className="relative h-full overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6">
                <div className={`absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${TYPE_COLORS[a.type] ?? 'from-indigo-500 to-cyan-400'} opacity-20 blur-2xl`} />
                <div className="flex items-start justify-between">
                  <span className={`grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br ${TYPE_COLORS[a.type] ?? 'from-indigo-500 to-cyan-400'} text-2xl`}>{a.icon}</span>
                  <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-slate-300">{a.type}</span>
                </div>
                <h3 className="mt-4 font-semibold text-white">{a.title}</h3>
                <p className="mt-1 text-xs text-slate-500">{a.organization} - {a.date}</p>
                <p className="mt-3 text-sm text-slate-400">{a.description}</p>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
