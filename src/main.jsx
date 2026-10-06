import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import projects from './projects.json';
import { media } from './media';
import TechText from './components/TechText';
import CursorGrid from './components/CursorGrid';
import PortfolioLike from './components/PortfolioLike';
import SkillsExperience from './components/SkillsExperience';
import ParticleSilhouette, { PARTICLE_EXIT_DURATION } from './components/ParticleSilhouette';
import useHeroIntro from './hero/useHeroIntro';
import { HERO_GRID } from './components/gridGeometry.js';
import './styles.css';

gsap.registerPlugin(ScrollTrigger);
const email = 'yufuli99@gmail.com';
const intro = '我专注于智能制造与机械结构设计，围绕仿生机构和移动机器人开展工程实践。从运动分析、结构建模与仿真优化，到零部件加工和样机调试，我希望让设计在真实场景中得到验证，将想法转化为可实现的工程方案。';
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const particleSources = {
  butterfly: '/media/butterfly-silhouette.png',
  'obstacle-robot': '/media/obstacle-robot-silhouette.png',
  'material-handling-robot': '/media/material-handling-robot-silhouette.png',
};
const particlePreload = Object.values(particleSources);
const particleSourceLayouts = {
  [particleSources['obstacle-robot']]: { scale: .82, containInPanel: true },
};
const Arrow = ({ diagonal = true }) => <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={diagonal ? 'M5 19 19 5M5 5h14v14' : 'M4 12h16m-6-6 6 6-6 6'} stroke="currentColor" strokeWidth="1.5" /></svg>;

function Header({ project }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const button = useRef(null);
  const links = project ? [['overview', '项目概览'], ['workflow', '工作流程'], ['gallery', '图片档案']] : [['works', '作品集'], ['skills', '个人能力'], ['education', '教育背景']];
  useEffect(() => {
    const scroll = () => setScrolled(window.scrollY > 32);
    const key = e => { if (e.key === 'Escape') { setOpen(false); button.current?.focus(); } };
    scroll(); window.addEventListener('scroll', scroll, { passive: true }); window.addEventListener('keydown', key);
    return () => { window.removeEventListener('scroll', scroll); window.removeEventListener('keydown', key); };
  }, []);
  return <header className={`site-header ${scrolled ? 'is-scrolled' : ''} ${open ? 'menu-open' : ''}`}>
    <a className="brand" href={project ? '/index.html' : '#profile'} aria-label="李玉夫作品集首页"><span className="brand-mark">LI.</span><span>LI YUFU<span className="brand-sub">机械设计 / 智能制造</span></span></a>
    <button ref={button} className="menu-toggle" type="button" aria-expanded={open} aria-controls="main-nav" onClick={() => setOpen(!open)}>{open ? '关闭' : '菜单'}<span>{open ? '−' : '+'}</span></button>
    <nav id="main-nav" aria-label="主要导航" className={open ? 'is-open' : ''}>
      {links.map(([id, title], i) => <a key={id} href={`#${id}`} onClick={() => setOpen(false)}><span className="nav-number">0{i + (project ? 1 : 2)}</span>{title}</a>)}
      <a className="nav-contact" href="#contact" onClick={() => setOpen(false)}>联系我 <Arrow /></a>
    </nav>
  </header>;
}

function SectionLabel({ number, english, children }) {
  return <div className="section-label"><span className="section-index">{number}</span><span>{children}</span><span className="label-en">{english}</span></div>;
}

function Hero() {
  const [paused, setPaused] = useState(reducedMotion);
  const [visible, setVisible] = useState(true);
  const heroMotion = useHeroIntro({ paused, visible });
  useEffect(() => {
    const section = heroMotion.section.current;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setPaused(query.matches);
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting && entry.intersectionRatio > .01), { threshold: [0, .01] });
    const visibility = () => {
      const bounds = section?.getBoundingClientRect();
      setVisible(!document.hidden && bounds?.bottom > 0 && bounds.top < window.innerHeight);
    };
    if (section) observer.observe(section);
    query.addEventListener('change', change); document.addEventListener('visibilitychange', visibility);
    return () => { observer.disconnect(); query.removeEventListener('change', change); document.removeEventListener('visibilitychange', visibility); };
  }, []);
  return <section ref={heroMotion.section} id="profile" className={`hero ${heroMotion.active ? 'hero--intro' : ''}`} aria-labelledby="hero-title">
    {heroMotion.active && !heroMotion.fallback && <canvas className="hero-intro-grid" aria-hidden="true" />}
    <div className="hero-background" aria-hidden="true">
      <canvas ref={heroMotion.canvas} className="hero-gears" hidden={heroMotion.fallback} />
      {heroMotion.fallback && <img className="hero-gear-poster" src={media.heroPoster} alt="" />}
      <div className="hero-wash" />
    </div>
    <CursorGrid className="hero-cursor-grid" cellSize={HERO_GRID.cellSize} color={HERO_GRID.color} radius={200}
      falloff="smooth" holdTime={140} fadeDuration={1000} lineWidth={HERO_GRID.lineWidth} maxOpacity={HERO_GRID.maxOpacity}
      fillOpacity={0} gridOpacity={0} clickPulse pulseSpeed={540} paused={paused || !visible || heroMotion.active} />
    <div className="hero-content shell">
      <div className="hero-overline"><span className="signal-dot" /><span>MECHANICAL DESIGN × SMART MANUFACTURING</span></div>
      <div className="hero-title-group">
        <span className="hero-name-cn">李玉夫 / 工程作品集</span>
        <h1 id="hero-title"><span className="hero-wordmark">
          <span className="hero-wordmark-fallback">LI YUFU</span>
          <TechText text="LI YUFU" layout="inline" fontSize="inherit" fontWeight={550} letterSpacing={-.065}
            color="#252724" accentColor="#69705f" reveal="letter" lineStyle="solid" strokeWidth={1.3}
            specks={6} speed={.7} paused={paused || heroMotion.active} ariaHidden />
        </span><span className="title-period">.</span></h1>
        <p className="hero-statement">从想法，到结构。<br />让设计在真实世界中得到验证。</p>
      </div>
      <div className="hero-bottom"><div className="hero-actions"><a className="hero-email" href={`mailto:${email}`}>{email}<Arrow /></a><a className="hero-scroll" href="#works"><span className="circle-button"><Arrow diagonal={false} /></span><span>探索作品<span className="mono">SCROLL TO EXPLORE</span></span></a></div><div className="hero-intro"><p>{intro}</p></div></div>
    </div>
    <div className="hero-video-caption"><button type="button" onClick={() => setPaused(!paused)} aria-label={paused ? '播放首页动效' : '暂停首页动效'}>{paused ? '播放' : '暂停'} <span aria-hidden="true">{paused ? '▶' : 'Ⅱ'}</span></button></div>
  </section>;
}

function TechnicalDrawing({ type = 'butterfly' }) {
  const gridId = useId();
  return <svg className={`technical-drawing drawing-${type}`} viewBox="0 0 600 380" fill="none" aria-hidden="true">
    <defs><pattern id={gridId} width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0v40" stroke="currentColor" strokeOpacity=".09" /></pattern></defs>
    <rect width="600" height="380" fill={`url(#${gridId})`} />
    <g stroke="currentColor" strokeWidth="1.15">
      <path d="M40 190h520M300 24v332" strokeDasharray="4 7" opacity=".28" />
      {type === 'butterfly' ? <><path d="M296 184C254 92 143 52 105 102c-32 42 39 110 175 98M304 184c42-92 153-132 191-82 32 42-39 110-175 98M280 200c-74-16-157 17-143 57 16 43 109 42 156-51M320 200c74-16 157 17 143 57-16 43-109 42-156-51" /><path d="m290 154 20 0 12 62-22 36-22-36zM106 102l174 98 13-45M494 102l-174 98-13-45M137 257l156-51M463 257l-156-51" /><circle cx="300" cy="190" r="9" /><path d="M94 322h412m-412-6v12m412-12v12" opacity=".5" /></> : type === 'obstacle-robot' ? <><circle cx="265" cy="176" r="69" /><circle cx="265" cy="176" r="42" /><circle cx="265" cy="176" r="9" /><path d="m196 176-56 114h64l85-88 99 65 85-111-23-22-90 85-43-77zM265 107v138M196 176h138M140 290h350" /><path d="M82 271c77-235 350-253 431-81" strokeDasharray="5 7" opacity=".45" /><path d="m498 179 15 11 5-18" /><circle cx="388" cy="267" r="8" /><circle cx="450" cy="134" r="8" /></> : type === 'material-handling-robot' ? <><path d="m154 252 113-59 159 49-111 66zM154 252v29l161 58 111-67v-30M315 308v31" /><path d="M275 222V112l39-21 23 13v121M275 112l39 12 23-20M314 124v101M314 91l66-37 79 44-31 17-48-28-43 26M459 98v48l-18 10-20-15v-26M441 156v20l-22 13m22-13 21 12" /><ellipse cx="203" cy="291" rx="16" ry="24" transform="rotate(-20 203 291)" /><ellipse cx="374" cy="309" rx="16" ry="24" transform="rotate(20 374 309)" /></> : <><path d="m133 140 167-82 167 82-167 82zM133 140v115l167 82 167-82V140M300 222v115M199 173v114M401 173v114" /><path d="M110 348h380M97 110v177" opacity=".5" /></>}
    </g><g fill="currentColor" opacity=".6"><circle cx="40" cy="40" r="2" /><circle cx="560" cy="340" r="2" /></g>
  </svg>;
}

function ImagePanel({ src, alt, code, type, className = '', title }) {
  return <div className={`image-panel ${src ? 'has-image' : ''} ${className}`}>
    {src ? <img src={src} alt={alt} loading="lazy" decoding="async" /> : <><TechnicalDrawing type={type} /><div className="image-panel-top mono"><span>{code}</span><span>＋</span></div><div className="image-panel-bottom"><span>{title || '作品图片预留'}</span><span className="mono">IMAGE TO FOLLOW</span></div></>}
  </div>;
}

// User-supplied line icons; accessible names live on their project tabs.
function ProjectIcon({ type }) {
  return <img src={`/media/project-icons/${type}.png`} alt="" width="1254" height="1254" loading="lazy" decoding="async" />;
}

const projectTitleLines = [['仿生蝴蝶', '飞行器设计'], ['仿生越障机器人', '设计与仿真'], ['移动物料搬运', '机器人设计']];
function ProjectCopy({ index, outgoing, entering, onDetails }) {
  const project = projects[index];
  const placement = outgoing ? { position: 'absolute', left: outgoing.left, top: outgoing.top, width: outgoing.width, margin: 0, maxWidth: 'none', transform: 'none' } : undefined;
  return <div data-project-index={index} className={`showcase-copy ${outgoing ? 'is-outgoing' : 'is-current'} ${entering ? 'is-entering' : ''}`} style={placement} aria-hidden={outgoing ? true : undefined} inert={Boolean(outgoing)}>
    <div className="showcase-kicker mono" data-copy-row><span className="signal-dot" />{project.english}</div>
    <h3 aria-label={project.title}>{projectTitleLines[index].map(line => <span className="showcase-title-line" data-copy-row key={line}>{line}</span>)}</h3>
    <div className="showcase-meta" data-copy-row><span>{project.role}</span><span>{project.period}</span></div>
    <p className="showcase-description" data-copy-row>{project.description}</p><p className="showcase-topics" data-copy-row>{project.subtitle}</p>
    <a className="showcase-detail" data-copy-row href={`/projects/${project.slug}.html`} onClick={event => onDetails(event, project)}>查看项目详情 <Arrow /></a>
  </div>;
}

function Works() {
  const [active, setActive] = useState(0);
  const [particleLeaving, setParticleLeaving] = useState(false);
  const [outgoing, setOutgoing] = useState(null);
  const transitionTimer = useRef(null);
  const copyCleanup = useRef(null);
  const copyMotion = useRef(null);
  const leaving = useRef(false);
  const tabs = useRef([]);
  const panel = useRef(null);
  const p = projects[active];
  const hasParticles = Boolean(particleSources[p.slug]);
  useEffect(() => {
    const resume = () => { clearTimeout(transitionTimer.current); clearTimeout(copyCleanup.current); setParticleLeaving(false); setOutgoing(null); };
    window.addEventListener('pageshow', resume);
    return () => { clearTimeout(transitionTimer.current); clearTimeout(copyCleanup.current); window.removeEventListener('pageshow', resume); };
  }, []);
  function selectProject(next) {
    clearTimeout(transitionTimer.current);
    setParticleLeaving(false);
    if (next === active) return;
    clearTimeout(copyCleanup.current);
    if (!reducedMotion()) {
      const bounds = panel.current.getBoundingClientRect();
      // Keep the most visible previous copy when a transition is interrupted.
      // A returning target can reuse its existing DOM and current opacity.
      const previous = [...panel.current.querySelectorAll('.showcase-copy')]
        .filter(copy => Number(copy.dataset.projectIndex) !== next)
        .sort((a, b) => Number(getComputedStyle(b.querySelector('.showcase-title-line')).opacity) - Number(getComputedStyle(a.querySelector('.showcase-title-line')).opacity))[0];
      const rect = previous.getBoundingClientRect();
      setOutgoing({ index: Number(previous.dataset.projectIndex), left: rect.left - bounds.left, top: rect.top - bounds.top, width: rect.width });
      // Only removes the inert, faded copy; never delays the incoming scene.
      copyCleanup.current = setTimeout(() => setOutgoing(null), 1120);
    } else {
      setOutgoing(null);
    }
    setActive(next);
  }
  function openDetails(event, project) {
    if (!particleSources[project.slug] || reducedMotion() || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    clearTimeout(transitionTimer.current);
    setParticleLeaving(true);
    transitionTimer.current = setTimeout(() => window.location.assign(`/projects/${project.slug}.html`), PARTICLE_EXIT_DURATION);
  }
  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', context => {
      const text = () => panel.current.querySelectorAll('.showcase-copy.is-current [data-copy-row], .showcase-register');
      const previousText = () => panel.current.querySelectorAll('.showcase-copy.is-outgoing [data-copy-row]');
      const artwork = () => panel.current.querySelectorAll('.showcase-model-overlay');
      let trigger;
      context.add('show', () => {
        if (!trigger?.isActive) return;
        const models = artwork();
        gsap.killTweensOf([...text(), ...models]);
        // Start from the current opacity. Cancelling a switch does not flash.
        gsap.to(text(), { opacity: 1, x: 0, y: 0, duration: .54, stagger: .06, ease: 'power3.out', overwrite: true });
        if (models.length) gsap.to(models, { opacity: 1, x: 0, duration: .65, ease: 'power3.out', overwrite: true });
      });
      context.add('hide', () => {
        const models = artwork();
        gsap.killTweensOf([...text(), ...models]);
        gsap.to(text(), { opacity: 0, x: -28, y: 0, duration: .3, stagger: .035, ease: 'power2.inOut', overwrite: true });
        if (models.length) gsap.to(models, { opacity: 0, x: -16, duration: .3, ease: 'power2.inOut', overwrite: true });
      });
      context.add('swap', () => {
        const incoming = text();
        const previous = previousText();
        gsap.killTweensOf([...incoming, ...previous]);
        // Both copies move at once: the incoming text starts before the old
        // copy disappears. Existing inline opacity survives rapid reversals.
        gsap.to(previous, { opacity: 0, x: -28, y: 0, duration: .3, stagger: .045, ease: 'power2.inOut', overwrite: true });
        gsap.to(incoming, { opacity: 1, x: 0, y: 0, duration: .54, stagger: .06, ease: 'power3.out', overwrite: true });
      });
      context.add('reset', () => {
        const models = artwork();
        gsap.killTweensOf([...text(), ...models]);
        gsap.set(text(), { opacity: 0, x: -32, y: 0 });
        if (models.length) gsap.set(models, { opacity: 0, x: 40 });
      });
      context.reset();
      copyMotion.current = context;
      trigger = ScrollTrigger.create({
        trigger: panel.current.closest('#works'), start: 'top 72%', end: 'bottom top',
        onEnter: () => { if (!leaving.current) context.show(); },
        onEnterBack: () => { if (!leaving.current) context.show(); },
        onLeave: context.reset, onLeaveBack: context.reset,
      });
      if (trigger.isActive) context.show();
      return () => { copyMotion.current = null; };
    }, panel.current);
    return () => mm.revert();
  }, []);
  useLayoutEffect(() => {
    leaving.current = particleLeaving;
    if (particleLeaving) copyMotion.current?.hide();
    else if (outgoing) copyMotion.current?.swap();
    else copyMotion.current?.show();
  }, [active, particleLeaving, outgoing]);
  function onTabKey(event, index) {
    let next;
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = (index + 1) % projects.length;
    else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = (index + projects.length - 1) % projects.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = projects.length - 1;
    if (next !== undefined) { event.preventDefault(); selectProject(next); tabs.current[next]?.focus(); }
  }
  return <section id="works" className="works section-space shell">
    <div className="section-head" data-reveal><SectionLabel number="02" english="SELECT ONE PROJECT TO VIEW">作品集目录</SectionLabel><div className="section-heading-row"><h2>把思考，<br /><span className="muted">做成看得见的作品。</span></h2><p>ENGINEERING PORTFOLIO<br />从机构设计、仿真优化，到样机开发。</p></div></div>
    <div className="project-showcase" data-reveal>
      <div className="project-rail"><span className="rail-heading mono">PROJECTS<br />01 — 03</span><div className="project-tabs" role="tablist" aria-label="选择工程项目" aria-orientation="vertical">
        {projects.map((p, i) => <button key={p.slug} ref={el => { tabs.current[i] = el; }} id={`work-tab-${p.slug}`} type="button" role="tab" aria-selected={active === i} aria-controls={`work-panel-${p.slug}`} aria-label={p.title} tabIndex={active === i ? 0 : -1} onClick={() => selectProject(i)} onKeyDown={e => onTabKey(e, i)} className={`project-tab ${active === i ? 'is-active' : ''}`}><span className="project-tab-icon"><span className="project-tab-art"><ProjectIcon type={p.slug} /></span><span className="project-tab-number mono">{p.number}</span></span></button>)}
      </div><span className="rail-count mono">0{active + 1} / 03</span></div>
      <div className="project-stage" aria-busy={particleLeaving || Boolean(outgoing)}>
        <div ref={panel} id={`work-panel-${p.slug}`} role="tabpanel" aria-labelledby={`work-tab-${p.slug}`} tabIndex={0} className={`showcase-panel showcase-${p.number}`}>
          <span className="showcase-watermark" aria-hidden="true">{p.number}</span><span className="showcase-register mono">ENGINEERING ARCHIVE / P{p.number}</span>
          <figure className={`showcase-art ${hasParticles ? 'has-particles' : ''}`}>
            {hasParticles ? <>
              <ParticleSilhouette src={particleSources[p.slug]} alt={`${p.title}剪影，由粒子聚合构成`} fit={1.04} sourceLayouts={particleSourceLayouts} departing={particleLeaving} preloadSources={particlePreload} />
              {p.cover && <img className="showcase-model-overlay" src={p.cover} alt={p.coverAlt} loading="lazy" decoding="async" />}
            </> : p.cover ? <img src={p.cover} alt={p.coverAlt} loading="lazy" decoding="async" /> : <><TechnicalDrawing type={p.slug} /><figcaption>项目大图预留 / 线稿示意<span className="mono">P{p.number} · IMAGE TO FOLLOW</span></figcaption></>}
          </figure>
          {outgoing && <ProjectCopy key={projects[outgoing.index].slug} index={outgoing.index} outgoing={outgoing} onDetails={openDetails} />}
          <ProjectCopy key={p.slug} index={active} entering={Boolean(outgoing)} onDetails={openDetails} />
        </div>
        {projects.filter(project => project.slug !== p.slug).map(project => <div key={project.slug} id={`work-panel-${project.slug}`} role="tabpanel" aria-labelledby={`work-tab-${project.slug}`} hidden />)}
      </div>
    </div>
    <p className="showcase-hint"><span className="mono" aria-label="INTERACTIVE INDEX">{Array.from('INTERACTIVE INDEX').map((letter, i) => <span key={i} aria-hidden="true">{letter === ' ' ? '\u00a0' : letter}</span>)}</span></p>
  </section>;
}

const education = [
  { period: '2021.09 — 2025.06', degree: '本科', school: '北京理工大学', schoolEn: 'Beijing Institute of Technology', major: '智能制造工程', majorEn: 'Intelligent Manufacturing Engineering' },
  { period: '2025.08 — 2027.01（预计）', degree: '硕士 · 在读', school: '南洋理工大学', schoolEn: 'Nanyang Technological University', major: '智能制造', majorEn: 'Master of Science in Smart Manufacturing' },
];
function Education() {
  return <section id="education" className="education section-space shell"><div className="section-head" data-reveal><SectionLabel number="04" english="EDUCATION">教育背景</SectionLabel><div className="section-heading-row"><h2>持续学习，<br /><span className="muted">持续探索。</span></h2><p>从智能制造工程，<br />到智能制造的进一步探索。</p></div></div>
    <div className="education-layout"><figure className="education-image" data-reveal><ImagePanel src={media.educationImage} alt="校园或实验室影像" code="D02 / LEARNING CONTEXT" type="education" title="校园 / 实验室影像预留" /><figcaption>学习与实践发生的地方。</figcaption></figure><ol className="education-timeline">{education.map(e => <li className="education-entry" key={e.school} data-reveal><div className="education-top"><span className="mono">{e.period}</span><span className="degree-tag">{e.degree}</span></div><div className="bilingual school"><h3>{e.school}</h3><p lang="en">{e.schoolEn}</p></div><div className="bilingual major"><p>{e.major}</p><p lang="en">{e.majorEn}</p></div></li>)}</ol></div>
  </section>;
}

function Contact() {
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  async function copy() {
    try { await navigator.clipboard.writeText(email); setCopied(true); clearTimeout(timer.current); timer.current = setTimeout(() => setCopied(false), 2200); }
    catch { window.location.href = `mailto:${email}`; }
  }
  return <footer id="contact" className="contact"><div className="shell"><div data-reveal><div className="contact-heading"><h2>下一个想法，<br />一起让它发生<span className="accent-text">。</span></h2><a className="contact-orbit magnetic" href={`mailto:${email}`} aria-label="发送邮件联系李玉夫"><Arrow /></a></div></div><div className="contact-bottom"><div className="contact-email"><span className="mono">EMAIL / 联系邮箱</span><a href={`mailto:${email}`}>{email}</a><button onClick={copy} type="button" aria-live="polite">{copied ? '已复制 ✓' : '复制邮箱 ↗'}</button></div><div className="contact-links"><a href="https://github.com/fafa2333" target="_blank" rel="noopener noreferrer">GitHub <Arrow /></a><a href="#main">返回顶部 ↑</a><PortfolioLike /></div></div><div className="footer-line mono"><span>© {new Date().getFullYear()} LI YUFU</span><span className="footer-tagline">DESIGN. SIMULATE. MAKE.</span></div></div></footer>;
}

function ProjectPage({ project: p }) {
  return <><section className="project-hero shell"><a className="breadcrumb" href="/index.html#works">← 返回作品集目录</a><div className="project-heading" data-reveal><SectionLabel number={p.number} english={p.english}>工程项目</SectionLabel><h1>{p.title}</h1><p>{p.description}</p><div className="project-facts"><span>{p.period}</span><span>{p.role}</span><span>{p.subtitle}</span></div></div><ImagePanel src={p.cover} alt={p.coverAlt} code={`P${p.number} / PROJECT COVER`} type={p.slug} className="project-cover" title="项目封面 · 模型 / 样机影像预留" /></section>
    <section className="project-section shell section-space" id="overview"><SectionLabel number="01" english="OVERVIEW">项目概览</SectionLabel><div className="project-metrics" data-reveal><div><strong>{p.metric}</strong><span>{p.metricLabel}</span></div><div><strong>{p.secondMetric}</strong><span>{p.secondMetricLabel}</span></div></div><div className="overview-grid">{p.overview.map(item => <article key={item.title} data-reveal><h3>{item.title}</h3><p>{item.text}</p></article>)}</div></section>
    <section className="workflow-section section-space" id="workflow"><div className="shell"><SectionLabel number="02" english="PROCESS">工作流程</SectionLabel><h2 data-reveal>从分析，到验证。</h2><div className="workflow-grid">{p.steps.map((step, i) => <article key={step.title} data-reveal><span className="step-number mono">0{i + 1}</span><h3>{step.title}</h3><p>{step.text}</p><span className="step-placeholder">详细流程与过程材料待补充</span></article>)}</div></div></section>
    <section className="project-gallery shell section-space" id="gallery"><SectionLabel number="03" english="VISUAL ARCHIVE">图片与过程记录</SectionLabel><h2 data-reveal>工程过程，逐帧记录。</h2>{p.gallery.map((group, gi) => <section className="gallery-group" key={group.title}><div className="gallery-heading" data-reveal><span className="mono">GROUP 0{gi + 1}</span><h3>{group.title}</h3></div><div className="gallery-grid">{group.images.map((img, ii) => <figure key={img.title} data-reveal><ImagePanel src={img.src} alt={img.title} code={`FIG. 0${gi * 2 + ii + 1}`} type={p.slug} title={img.title} /><figcaption>{img.title}{!img.src && ' · 图片与说明待补充'}</figcaption></figure>)}</div></section>)}<a href="/index.html#works" className="back-projects">返回作品集目录 <Arrow diagonal={false} /></a></section></>;
}

function App() {
  const app = useRef(null);
  const slug = window.location.pathname.split('/').pop()?.replace('.html', '');
  const project = projects.find(p => p.slug === slug);
  useEffect(() => {
    const mm = gsap.matchMedia();
    mm.add({ motion: '(prefers-reduced-motion: no-preference)', desktop: '(min-width: 1000px) and (min-height: 560px)' }, context => {
      if (!context.conditions.motion) return;
      if (project) {
        gsap.utils.toArray('[data-reveal]').forEach(el => gsap.from(el, { y: 30, opacity: 0, duration: .8, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 94%', once: true } }));
        return;
      }
      const chapter = (selector, groups, ease = 'power3.out') => {
        const section = app.current.querySelector(selector);
        const timeline = gsap.timeline({ paused: true });
        groups.forEach(([targets, at, y = 22, stagger = .09]) => {
          timeline.fromTo(section.querySelectorAll(targets), { opacity: 0, y }, { opacity: 1, y: 0, duration: .7, stagger, ease }, at);
        });
        const trigger = ScrollTrigger.create({
          trigger: section, start: 'top 72%', end: 'bottom top',
          onEnter: () => timeline.restart(), onEnterBack: () => timeline.restart(),
          onLeave: () => timeline.pause(0), onLeaveBack: () => timeline.pause(0),
        });
        if (trigger.isActive) timeline.play();
      };
      const heading = [['.section-label', 0, 12], ['.section-heading-row > *', .12]];
      chapter('#works', [...heading, ['.rail-heading', .22, 12], ['.project-tab', .3, 16, .1], ['.project-stage', .26, 0], ['.rail-count, .showcase-hint', .62, 10]]);
      chapter('#skills', [['.section-label', 0, 12]], 'power2.inOut');
      const learning = [...heading, ['.education-image', .24], ['.education-entry', .32, 22, .14]];
      const contact = [['.contact-heading', .5], ['.contact-email, .contact-links', .64, 16], ['.footer-line', .82, 10]];
      if (context.conditions.desktop) chapter('.education-contact', [...learning, ...contact]);
      else {
        chapter('#education', learning);
        chapter('#contact', contact.map(([target, at, y]) => [target, at - .5, y]));
      }
      gsap.to('.hero-background', { yPercent: 12, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    }, app);
    const magnets = [...app.current.querySelectorAll('.magnetic')];
    const move = e => {
      if (reducedMotion() || e.pointerType !== 'mouse') return;
      const r = e.currentTarget.getBoundingClientRect();
      gsap.to(e.currentTarget, { x: (e.clientX - r.left - r.width / 2) * .13, y: (e.clientY - r.top - r.height / 2) * .13, duration: .4 });
    };
    const leave = e => gsap.to(e.currentTarget, { x: 0, y: 0, duration: .5 });
    magnets.forEach(el => { el.addEventListener('pointermove', move); el.addEventListener('pointerleave', leave); });
    return () => { mm.revert(); magnets.forEach(el => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); }); };
  }, [project]);
  useEffect(() => {
    // Restore direct anchors after animation measurements and browser scroll
    // restoration, so refreshed section links land at the chapter's top.
    let frame;
    const restoreAnchor = () => {
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => {
          const target = document.getElementById(window.location.hash.slice(1));
          if (target) {
            ScrollTrigger.refresh();
            target.scrollIntoView({ behavior: 'instant', block: 'start' });
          }
        });
      });
    };
    if (document.readyState === 'complete') restoreAnchor();
    else window.addEventListener('load', restoreAnchor, { once: true });
    return () => { cancelAnimationFrame(frame); window.removeEventListener('load', restoreAnchor); };
  }, []);
  return <div ref={app} className={project ? 'project-page' : 'home-page'}><a className="skip-link" href="#main">跳到主要内容</a><Header project={project} /><main id="main">{project ? <ProjectPage project={project} /> : <><Hero /><Works /><SkillsExperience /><div className="education-contact"><Education /><Contact /></div></>}</main>{project && <Contact />}</div>;
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
