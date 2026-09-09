import { type ComponentType, type ReactNode, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Activity, ArrowUpRight, Bell, BrainCircuit, CircleHelp, Command, LayoutDashboard, Map, Menu, Network, Settings2, ShieldCheck, Siren, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import { useI18n, type Language, T } from '@/lib/i18n';
import { askAI, type AIQueryResponse } from '@/api/ai';

type Icon = ComponentType<{ className?: string }>;
const navItems: { href: string; label: string; icon: Icon; count?: string }[] = [
  { href: '/', label: 'nav.commandOverview', icon: LayoutDashboard },
  { href: '/digital-twin', label: 'nav.digitalTwin', icon: Map },
  { href: '/forecasting', label: 'nav.forecasting', icon: Activity },
  { href: '/coordination', label: 'nav.coordination', icon: Network, count: '3' },
  { href: '/insights', label: 'nav.insights', icon: BrainCircuit },
  { href: '/simulation', label: 'nav.simulation', icon: SlidersHorizontal },
];
const detailItems: { href: string; label: string; icon: Icon }[] = [
  { href: '/er', label: 'nav.emergency', icon: Siren },
  { href: '/icu', label: 'nav.icu', icon: ShieldCheck },
];

export function CommandShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<AIQueryResponse | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const { direction, language, setLanguage, t } = useI18n();
  const isArabic = language === 'ar';

  const submitQuestion = async () => {
    const query = question.trim();
    if (!query || asking) return;
    setAsking(true);
    setAiError(null);
    try {
      setAnswer(await askAI(query));
      setQuestion('');
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'The AI service is unavailable.');
    } finally {
      setAsking(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#f5f3ee] text-[#20313a]">
      <aside className={`fixed inset-y-0 z-40 flex w-[260px] flex-col bg-[#1e343d] text-[#dbe8e8] transition-transform duration-300 lg:translate-x-0 ${isArabic ? 'right-0' : 'left-0'} ${open ? 'translate-x-0' : isArabic ? 'translate-x-full' : '-translate-x-full'}`}>
        <div className="flex h-[76px] items-center justify-between border-b border-[#3b5057] px-5">
          <Link href="/" className="flex items-center gap-3" data-testid="link-brand">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#73d3c2] text-[#18313a]"><Command className="h-5 w-5" /></div>
            <div><div className="text-sm font-bold tracking-wide text-white">{t('app.name')}</div><div className="mono text-[9px] uppercase tracking-[.18em] text-[#94b5b7]">{t('app.subtitle')}</div></div>
          </Link>
          <button className="rounded-md p-1 text-[#9db7ba] hover:bg-[#2b4650] lg:hidden" onClick={() => setOpen(false)} data-testid="button-close-sidebar"><X className="h-5 w-5" /></button>
        </div>
        <div className="px-4 pt-5">
          <div className="mb-3 px-2 mono text-[9px] uppercase tracking-[.2em] text-[#779398]">{t('nav.operations')}</div>
          <nav className="space-y-1">
            {navItems.map(({ href, label, icon: Icon, count }) => <NavItem key={href} href={href} label={label} icon={Icon} count={count} active={location === href} onNavigate={() => setOpen(false)} />)}
          </nav>
          <div className="mb-3 mt-7 px-2 mono text-[9px] uppercase tracking-[.2em] text-[#779398]">{t('nav.focusAreas')}</div>
          <nav className="space-y-1">
            {detailItems.map(({ href, label, icon: Icon }) => <NavItem key={href} href={href} label={label} icon={Icon} active={location === href} onNavigate={() => setOpen(false)} />)}
          </nav>
        </div>
        <div className="mt-auto border-t border-[#3b5057] p-4">
          <div className="mb-3 flex items-center gap-2 rounded-lg bg-[#263f48] p-3"><span className="pulse-dot h-2 w-2 rounded-full bg-[#72d5c2]" /><div><div className="text-xs font-semibold text-[#d8eeee]">{t('header.liveFeed')}</div><div className="mono mt-1 text-[9px] text-[#8eb0b3]">{t('header.updated')}</div></div></div>
          <button className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-xs text-[#a6c0c1] hover:bg-[#2b4650] hover:text-white" data-testid="button-settings"><Settings2 className="h-4 w-4" /> {t('header.commandSettings')}</button>
        </div>
      </aside>
      {open && <button className="fixed inset-0 z-30 bg-[#13282f]/50 lg:hidden" onClick={() => setOpen(false)} data-testid="button-dismiss-sidebar" />}
      <main className={`min-h-[100dvh] ${isArabic ? 'lg:pr-[260px]' : 'lg:pl-[260px]'}`}>
        <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-[#dce2dc] bg-[#f7f5f0]/95 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-3"><button className="rounded-md p-2 hover:bg-[#e8ece7] lg:hidden" onClick={() => setOpen(true)} data-testid="button-open-sidebar"><Menu className="h-5 w-5" /></button><div><div className="mono text-[10px] uppercase tracking-[.18em] text-[#71858a]">{t('header.liveShift')}</div><div className="mt-1 text-sm font-semibold text-[#28414a]">{t('brand.hospital')} <span className="mx-1 font-normal text-[#9aa8a7]">/</span> {t('brand.operations')}</div></div></div>
          <div className="flex items-center gap-2 md:gap-4">
            <div className="hidden items-center gap-2 rounded-full border border-[#d7e1de] bg-[#fbfaf7] px-3 py-2 text-xs text-[#5f7375] md:flex"><span className="h-2 w-2 rounded-full bg-[#50bba9]" /> {t('header.nominal')}</div>
            <div className="flex items-center rounded-lg border border-[#d7e1de] bg-[#fbfaf7] p-0.5 text-[11px] font-bold" aria-label={t('language.switcherLabel')}>
              {(['en', 'ar'] as Language[]).map((option) => <button key={option} onClick={() => setLanguage(option)} className={`rounded-md px-2 py-1.5 transition-colors ${language === option ? 'bg-[#d6eee8] text-[#226f6a]' : 'text-[#81908e] hover:bg-[#eef2ed]'}`} data-testid={`button-language-${option}`}>{option === 'en' ? 'EN' : 'AR'}</button>)}
            </div>
            <button className="relative rounded-md p-2 text-[#617578] hover:bg-[#e8ece7]" data-testid="button-notifications"><Bell className="h-[18px] w-[18px]" /><span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#dc704f]" /></button>
            <div className="hidden h-8 w-px bg-[#d9e0db] sm:block" /><div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d5e4dc] text-xs font-bold text-[#28534e]">JD</div>
          </div>
        </header>
        <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-8 md:py-8">{children}</div>
      </main>
      <div className={`fixed bottom-4 z-30 md:bottom-6 ${isArabic ? 'left-4 md:left-7' : 'right-4 md:right-7'}`}>
        {(answer || aiError) && <div className="mb-2 w-[300px] rounded-xl border border-[#cfe1dc] bg-[#fbfaf7] p-4 text-xs leading-relaxed text-[#496367] shadow-xl"><div className="mb-2 flex items-center gap-2 font-bold text-[#285a58]"><Sparkles className="h-4 w-4" /> {answer?.agent ?? t('header.answerTitle')}</div>{aiError ?? answer?.answer}<button className="mt-3 block text-[11px] font-semibold text-[#1c8580]" onClick={() => { setAnswer(null); setAiError(null); }} data-testid="button-dismiss-answer">{t('header.dismiss')}</button></div>}
        <div className="flex items-center rounded-xl border border-[#c7dad6] bg-[#fbfaf7] p-1.5 shadow-lg"><CircleHelp className="mx-2 h-4 w-4 text-[#57918d]" /><input value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submitQuestion()} placeholder={t('header.askPlaceholder')} className="w-[190px] bg-transparent px-1 py-2 text-xs outline-none placeholder:text-[#91a2a1] md:w-[235px]" data-testid="input-operational-question" /><button onClick={submitQuestion} disabled={asking} className="rounded-lg bg-[#1e7775] px-3 py-2 text-xs font-bold text-white hover:bg-[#145f5f] disabled:cursor-wait disabled:opacity-70" data-testid="button-ask-question">{asking ? '...' : t('header.ask')}</button></div>
      </div>
    </div>
  );
}

function NavItem({ href, label, icon: Icon, count, active, onNavigate }: { href: string; label: string; icon: Icon; count?: string; active: boolean; onNavigate: () => void }) {
  const { t } = useI18n();
  const translated = t(label);
  return <Link href={href} onClick={onNavigate} className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-[13px] transition-colors ${active ? 'bg-[#32606a] font-semibold text-white shadow-sm' : 'text-[#a9c0c1] hover:bg-[#294850] hover:text-[#ecf6f2]'}`} data-testid={`link-nav-${label}`}><span className="flex items-center gap-3"><Icon className={`h-[17px] w-[17px] ${active ? 'text-[#78d4c1]' : 'text-[#88a8ab]'}`} />{translated}</span>{count && <span className={`rounded px-1.5 py-0.5 mono text-[9px] ${active ? 'bg-[#6bcaba] text-[#17383e]' : 'bg-[#314e55] text-[#9fceca]'}`}>{count}</span>}</Link>;
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  const { t } = useI18n();
  return <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><div className="mono mb-2 text-[10px] font-bold uppercase tracking-[.18em] text-[#5d9b95]">{t(eyebrow)}</div><h1 className="text-[28px] font-bold tracking-[-.03em] text-[#20313a] md:text-[34px]">{t(title)}</h1><p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-[#6c7c7c]">{t(description)}</p></div>{action}</div>;
}

export function KpiCard({ label, value, unit, sub, tone = 'teal', href }: { label: string; value: string | number; unit?: string; sub: string; tone?: 'teal' | 'amber' | 'red' | 'slate'; href?: string }) {
  const { t } = useI18n();
  const content = <div className="group relative overflow-hidden rounded-xl border border-[#dce3dd] bg-[#fbfaf7] p-4 shadow-[0_2px_10px_rgba(35,60,60,.03)] transition-transform hover:-translate-y-0.5 md:p-5" data-testid={`kpi-${label}`}><div className={`absolute start-0 top-0 h-full w-1 ${tone === 'red' ? 'bg-[#d76655]' : tone === 'amber' ? 'bg-[#e5a13d]' : tone === 'slate' ? 'bg-[#8b9a9a]' : 'bg-[#4db7a7]'}`} /><div className="flex items-start justify-between"><span className="text-[11px] font-semibold uppercase tracking-[.08em] text-[#718180]">{t(label)}</span>{href && <ArrowUpRight className="h-4 w-4 text-[#98aaa7] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />}</div><div className="mt-3 flex items-baseline gap-1.5"><span className="mono text-[27px] font-bold tracking-[-.06em] text-[#21373f]">{value}</span>{unit && <span className="text-xs text-[#70817f]">{unit}</span>}</div><div className="mt-2 text-[11px] text-[#798985]">{t(sub)}</div></div>;
  return href ? <Link href={href} className="block">{content}</Link> : content;
}

export function StatusPill({ status }: { status: 'critical' | 'watch' | 'stable' }) {
  const { t } = useI18n();
  const labels = { critical: 'status.critical', watch: 'status.watch', stable: 'status.stable' };
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${status === 'critical' ? 'bg-[#f8e1db] text-[#b84e3f]' : status === 'watch' ? 'bg-[#f9ebd2] text-[#a06e22]' : 'bg-[#dcefe9] text-[#287969]'}`}><span className={`h-1.5 w-1.5 rounded-full ${status === 'critical' ? 'bg-[#d76655]' : status === 'watch' ? 'bg-[#e2a03c]' : 'bg-[#50ae9d]'}`} />{t(labels[status])}</span>;
}

export function SectionTitle({ title, meta, action }: { title: string; meta?: string; action?: ReactNode }) {
  const { t } = useI18n();
  return <div className="mb-4 flex items-center justify-between"><div><h2 className="text-sm font-bold text-[#29414a]">{t(title)}</h2>{meta && <div className="mt-1 text-[11px] text-[#859491]">{t(meta)}</div>}</div>{action}</div>;
}

export function RangeSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useI18n();
  return <div className="flex rounded-lg border border-[#d6e0db] bg-[#fbfaf7] p-1" data-testid="range-selector">{['6h', '12h', '24h', '7d'].map((r) => <button key={r} onClick={() => onChange(r)} className={`rounded-md px-3 py-1.5 mono text-[10px] font-bold transition-colors ${value === r ? 'bg-[#d6efea] text-[#236d69]' : 'text-[#80908e] hover:bg-[#eef2ed]'}`} data-testid={`button-range-${r}`}>{t(`range.${r}`)}</button>)}</div>;
}

export function SmallSparkline({ values, color = '#439f98' }: { values: number[]; color?: string }) {
  const min = Math.min(...values) - 2; const max = Math.max(...values) + 2; const points = values.map((v, i) => `${(i / (values.length - 1)) * 100},${100 - ((v - min) / (max - min)) * 100}`).join(' ');
  return <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-8 w-20 overflow-visible"><polyline fill="none" stroke={color} strokeWidth="3" points={points} vectorEffect="non-scaling-stroke" /></svg>;
}