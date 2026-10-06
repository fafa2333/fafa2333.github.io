import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import CursorDotField from './CursorDotField';
import './skills.css';

const capabilities = [
  { id: 'monitor', en: 'SOFTWARE SKILLS', title: '软件技能', code: '01',
    heading: ['让设计可视，', '让分析有据。'],
    intro: ['从机械结构建模与工程表达，', '到运动学求解、仿真与结构优化。'],
    details: [
      ['CAD / DESIGN', 'SolidWorks · Creo · AutoCAD', '机械结构建模、工程图绘制', 'KeyShot 模型渲染'],
      ['ANALYSIS / SIMULATION', 'Ansys · SolidWorks Simulation', 'Adams 动力学仿真', 'Matlab 运动学求解'],
    ] },
  { id: 'robot_arm', en: 'ENGINEERING EXPERIENCE', title: '工程经验', code: '02',
    heading: ['从结构设计，', '走到样机验证。'],
    intro: ['用加工与装配检验设计，', '在调试中连接分析与真实反馈。'],
    details: [
      ['FABRICATION', '3D 打印、激光切割', '零部件选型、BOM 整理'],
      ['PROTOTYPING', '样机组装与调试', '仿生机构与移动机器人项目实践'],
    ] },
  { id: 'telephone', en: 'LANGUAGE ABILITY', title: '语言能力', code: '03',
    heading: ['跨越语言，', '连接更多可能。'],
    intro: ['以英语学习与沟通，', '拓展工程知识与交流的边界。'],
    details: [
      ['ENGLISH / CERTIFICATIONS', 'CET-4 · 大学英语四级', 'CET-6 · 大学英语六级'],
      ['IELTS', '雅思总分 7.0'],
    ] },
];
const overview = { en: 'DESIGN. SIMULATE. MAKE.', title: '能力概览',
  heading: ['从建模到实现，', '贯穿完整开发过程的工具与实践。'],
  intro: ['让想法在分析、设计与验证中成形。'],
  details: [] };

function CapabilityCopy({ item }) {
  return <>
    <p className="capability-eyebrow mono" data-capability-row>{item.en}</p>
    <h2>{item.heading.map(line => <span data-capability-row key={line}>{line}</span>)}</h2>
    <div className="capability-rule" data-capability-row />
    <div className="capability-intro">{item.intro.map(line => <p data-capability-row key={line}>{line}</p>)}</div>
    {item.details.length > 0 && <div className="capability-details">{item.details.map(([label, ...lines]) => <div className="capability-detail" key={label}>
      <p className="mono capability-detail-label" data-capability-row>{label}</p>
      {lines.map(line => <p data-capability-row key={line}>{line}</p>)}
    </div>)}</div>}
  </>;
}

function SceneSelection({ selected, ready, paintRef }) {
  const group = useRef(null), rect = useRef(null), corners = useRef(null);
  const frame = useRef(null), previous = useRef(null), start = useRef(0), from = useRef(null);
  useLayoutEffect(() => {
    paintRef.current = (box, id, now) => {
      if (!box || !id) { previous.current = null; return; }
      const target = { x: box.x - 12, y: box.y - 12, width: box.width + 24, height: box.height + 24 };
      if (previous.current !== id) {
        from.current = previous.current && frame.current ? { ...frame.current } : { ...target };
        start.current = now; previous.current = id;
      }
      const t = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : Math.min(1, (now - start.current) / 520);
      const mix = t * t * (3 - 2 * t);
      frame.current = Object.fromEntries(Object.keys(target).map(key => [key, from.current[key] + (target[key] - from.current[key]) * mix]));
      const { x, y, width, height } = frame.current;
      group.current.setAttribute('transform', `translate(${x} ${y})`);
      rect.current.setAttribute('width', width); rect.current.setAttribute('height', height);
      corners.current.setAttribute('d', `M0 18V0H18 M${width - 18} 0h18v18 M${width} ${height - 18}v18h-18 M18 ${height}H0v-18`);
    };
    return () => { paintRef.current = null; };
  }, [paintRef]);
  return <svg className={`scene-selection ${selected && ready ? 'is-visible' : ''}`} width="100%" height="100%" aria-hidden="true">
    <g ref={group}><rect ref={rect} /><path ref={corners} /><text x="0" y="-8">{capabilities.find(item => item.id === selected)?.code} / SELECTED</text></g>
  </svg>;
}

function Scene({ selected, onSelect, controls }) {
  const host = useRef(null), engine = useRef(null);
  const annotations = useRef({}), selectionPaint = useRef(null);
  const selectedRef = useRef(selected), selectRef = useRef(onSelect);
  selectedRef.current = selected; selectRef.current = onSelect;
  const [status, setStatus] = useState('loading');
  const [hovered, setHovered] = useState(null), [motionStatus, setMotionStatus] = useState('idle');
  const updateProjection = (boxes, dimensions, now) => {
    const { width, height } = dimensions;
    capabilities.forEach(({ id }) => {
      const element = annotations.current[id], box = boxes[id];
      if (!element || !box) return;
      const compact = width < 600;
      const labelWidth = id === 'robot_arm' ? (compact ? 145 : 210) : (compact ? 125 : 165);
      const left = id === 'robot_arm' ? (compact ? box.x - labelWidth * .5 : box.x - labelWidth - 12) : box.x + box.width + 12;
      const top = id === 'robot_arm' && compact ? box.y - 46 : id === 'telephone' ? box.y + box.height * .65 : box.y + box.height * .25;
      element.style.left = `${Math.max(10, Math.min(width - labelWidth - 10, left))}px`;
      element.style.top = `${Math.max(12, Math.min(height - 52, top))}px`;
    });
    selectionPaint.current?.(boxes[selectedRef.current], selectedRef.current, now);
  };
  useEffect(() => {
    let cancelled = false;
    const abort = new AbortController();
    // Start the download alongside the engine import as soon as the page mounts.
    const modelData = fetch('/models/portfolio-scene.glb?v=20261006-hq', { signal: abort.signal })
      .then(response => { if (!response.ok) throw new Error('Model unavailable'); return response.arrayBuffer(); });
    // The engine attaches its error handler after its own module has loaded.
    modelData.catch(() => {});
    import('./skillsSceneEngine').then(({ createSkillsScene }) => {
      if (cancelled) return;
      try {
        engine.current = createSkillsScene(host.current, {
          onReady: () => { if (!cancelled) { setStatus('ready'); engine.current?.select(selectedRef.current); } },
          onError: () => { if (!cancelled) setStatus('error'); },
          onHover: name => { if (!cancelled) setHovered(name); },
          onSelect: name => selectRef.current(name),
          onLayout: (boxes, dimensions, now) => { if (!cancelled) updateProjection(boxes, dimensions, now); },
          onMotion: state => { if (!cancelled) setMotionStatus(state); },
        }, modelData);
        controls.current = engine.current;
        engine.current.select(selectedRef.current);
      } catch { setStatus('error'); }
    }).catch(() => { if (!cancelled) setStatus('error'); });
    return () => { cancelled = true; abort.abort(); engine.current?.dispose(); engine.current = null; controls.current = null; };
  }, []);
  useEffect(() => { engine.current?.select(selected); }, [selected]);
  return <div className={`capability-scene ${status === 'ready' ? 'is-ready' : ''}`} data-scene-status={status}>
    <div className="capability-canvas" ref={host} />
    {status !== 'ready' && <div className="capability-poster">
      <img src="/media/portfolio-scene-preview.webp" alt="工作室场景：显示器、机械臂、电话、桌椅和键鼠" loading="eager" />
      <span className="mono" role="status">{status === 'error' ? '3D 暂不可用 · 可通过下方名称查看能力' : 'LOADING WORKSPACE'}</span>
    </div>}
    <div className="scene-drafting" aria-hidden="true"><CursorDotField className="scene-dots" /><CursorDotField className="scene-dots scene-dots-lower" /></div>
    <div className={`scene-annotations ${status === 'ready' ? 'is-projected' : 'is-fallback'}`}>
      {capabilities.map(item => <button type="button" key={item.id} ref={element => { annotations.current[item.id] = element; }} className={`scene-annotation ${selected === item.id ? 'is-selected' : ''} ${hovered === item.id ? 'is-hovered' : ''}`}
        data-model={item.id} aria-pressed={selected === item.id} aria-label={`查看${item.title}`}
        onClick={() => onSelect(item.id)} onPointerEnter={() => engine.current?.hover(item.id)} onPointerLeave={() => engine.current?.hover(null)}
        onFocus={() => engine.current?.hover(item.id)} onBlur={() => engine.current?.hover(null)}>
        <span className="annotation-cross" aria-hidden="true" /><span className="annotation-text mono">{item.en}</span>
      </button>)}
    </div>
    <SceneSelection selected={selected} ready={status === 'ready'} paintRef={selectionPaint} />
    <div className="scene-motion-control">
      <button type="button" className="mono" disabled={status !== 'ready' || motionStatus === 'requesting' || motionStatus === 'reduced'}
        aria-pressed={motionStatus === 'enabled'} onClick={() => engine.current?.toggleMotion()}>
        {motionStatus === 'enabled' ? 'DISABLE MOTION' : motionStatus === 'requesting' ? 'ENABLING…' : 'ENABLE MOTION'}
      </button>
      <span role="status">{motionStatus === 'denied' ? '未获授权，可继续点击查看能力' : motionStatus === 'unavailable' ? '设备暂不支持动态效果' : motionStatus === 'reduced' ? '已遵循减少动态效果设置' : ''}</span>
    </div>
    <div className="scene-footer" aria-hidden="true" />
  </div>;
}

export default function SkillsExperience() {
  const section = useRef(null), index = useRef(null), copy = useRef(null);
  const sceneControls = useRef(null);
  const motion = useRef(null), indexMotion = useRef(null), visible = useRef(false);
  const current = useRef(null), pending = useRef(null), swapping = useRef(false);
  const pointerDown = useRef(null);
  const [selected, setSelected] = useState(null), [displayed, setDisplayed] = useState(null);
  const displayedItem = capabilities.find(item => item.id === displayed) || overview;
  const animateIndex = entering => {
    const rows = index.current?.querySelectorAll('button');
    if (!rows) return;
    indexMotion.current?.kill();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.set(rows, { opacity: 1, x: 0 }); return;
    }
    indexMotion.current = entering
      ? gsap.fromTo(rows, { opacity: 0, x: -36 }, { opacity: 1, x: 0, duration: .48, stagger: .035, ease: 'power2.inOut' })
      : gsap.to(rows, { opacity: 0, x: -36, duration: .26, stagger: .025, ease: 'power2.inOut' });
  };
  const animateIn = (delay = 0) => {
    if (!copy.current) return;
    motion.current?.kill();
    const rows = copy.current.querySelectorAll('[data-capability-row]');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.set(rows, { opacity: 1, x: 0 }); return;
    }
    if (!visible.current) { gsap.set(rows, { opacity: 0, x: -36 }); return; }
    motion.current = gsap.fromTo(rows, { opacity: 0, x: -36 }, { opacity: 1, x: 0, duration: .48, stagger: .035, delay, ease: 'power2.inOut' });
  };
  useLayoutEffect(() => { animateIn(); }, [displayed]);
  useEffect(() => {
    const enter = () => {
      visible.current = true; animateIndex(true);
      if (!swapping.current) animateIn(.105);
    };
    const leave = () => {
      visible.current = false; animateIndex(false);
      if (swapping.current) return;
      motion.current?.kill();
      const rows = copy.current.querySelectorAll('[data-capability-row]');
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        gsap.set(rows, { opacity: 1, x: 0 }); return;
      }
      motion.current = gsap.to(rows, { opacity: 0, x: -36, duration: .26, stagger: .025, ease: 'power2.inOut' });
    };
    const trigger = ScrollTrigger.create({
      trigger: section.current, start: 'top 72%', end: 'bottom top',
      onEnter: enter, onEnterBack: enter,
      onLeave: leave, onLeaveBack: leave,
    });
    visible.current = trigger.isActive;
    if (visible.current) enter(); else leave();
    return () => { trigger.kill(); motion.current?.kill(); indexMotion.current?.kill(); };
  }, []);
  const select = id => {
    setSelected(id); pending.current = id;
    if (swapping.current || current.current === id) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !visible.current) {
      current.current = id; setDisplayed(id); return;
    }
    swapping.current = true; motion.current?.kill();
    motion.current = gsap.to(copy.current.querySelectorAll('[data-capability-row]'), {
      opacity: 0, x: -36, duration: .26, stagger: .025, ease: 'power2.inOut',
      onComplete: () => {
        swapping.current = false; current.current = pending.current; setDisplayed(pending.current);
        // Returning to the same copy still needs to restore its animated rows.
        if (current.current === displayed) animateIn();
      },
    });
  };
  const resetFromBackground = event => {
    // Model clicks are handled by the renderer; controls keep their own action.
    if (!selected || event.target.closest('canvas, button, a, input, textarea, select, [role="button"]')) return;
    if (pointerDown.current && Math.hypot(event.clientX - pointerDown.current.x, event.clientY - pointerDown.current.y) > 8) return;
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) return;
    select(null);
  };
  return <section ref={section} id="skills" className="skills-section section-space"
    onPointerDown={event => { pointerDown.current = { x: event.clientX, y: event.clientY }; }} onClick={resetFromBackground}
    onKeyDown={event => { if (event.key === 'Escape') select(null); }}>
    <div className="shell capability-shell">
      <div className="section-label"><span className="section-index">03</span><span>个人能力</span><span className="label-en">SELECT ONE OBJECT TO VIEW</span></div>
      <div className="capability-layout">
        <div className={`capability-copy-column ${selected ? 'has-selection' : ''}`}>
          <nav ref={index} className="capability-index" aria-label="个人能力分类">{capabilities.map(item => <button key={item.id} type="button" className={selected === item.id ? 'is-active' : ''} aria-pressed={selected === item.id} aria-label={item.title} onClick={() => select(item.id)}
            onPointerEnter={event => { if (event.pointerType === 'mouse') sceneControls.current?.hover(item.id); }} onPointerLeave={() => sceneControls.current?.hover(null)}
            onFocus={() => sceneControls.current?.hover(item.id)} onBlur={() => sceneControls.current?.hover(null)}><span className="mono">{item.code}</span><span className="mono capability-index-name">{item.en}</span><span className="capability-index-mark" aria-hidden="true" /></button>)}</nav>
          <div className="capability-copy-slot">
            <div className="capability-copy is-overview capability-copy-measure" aria-hidden="true" inert><CapabilityCopy item={overview} /></div>
            <div ref={copy} className={`capability-copy ${displayed ? '' : 'is-overview'}`} aria-live="polite" aria-atomic="true"><CapabilityCopy item={displayedItem} /></div>
          </div>
          <div className="capability-stripe-space" aria-hidden="true"><div className="capability-copy-stripes" /></div>
          <div className="capability-watermark" aria-hidden="true"><span><span>CAPABILITY</span></span></div>
        </div>
        <Scene selected={selected} onSelect={select} controls={sceneControls} />
      </div>
    </div>
  </section>;
}
