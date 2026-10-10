import React, { useEffect, useRef } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { heroIntroFinished } from './educationStartup.js';
import { EducationPreparationClient, educationIdle } from './educationPreparationClient.js';
import CursorDotField from './CursorDotField';
import './education.css';

export const BUILDINGS = {
  bit: { building: '中心教学楼', school: '北京理工大学', en: 'BIT · CENTRAL TEACHING BUILDING' },
  hive: { building: 'The Hive', school: 'Nanyang Technological University', en: 'NTU · THE HIVE' },
};

export default function EducationBuilding({ selected, displayed, onDisplay }) {
  const host = useRef(null), engine = useRef(null);
  const selectedRef = useRef(selected), callback = useRef(onDisplay);
  selectedRef.current = selected; callback.current = onDisplay;
  useEffect(() => { engine.current?.select(selected); }, [selected]);
  useEffect(() => {
    let disposed = false, loading = false, present = false;
    let assets;
    const preparationAbort = new AbortController();
    const element = host.current;
    const load = async () => {
      if (loading) return; loading = true;
      try {
        element.dataset.preloadState = 'worker';
        assets = new EducationPreparationClient();
        const bounds = element.querySelector('.transition-viewport').getBoundingClientRect();
        const data = assets.request('load', bounds.width / bounds.height);
        // Attach immediately: the worker can fail before the intro finishes.
        data.catch(() => {});
        await heroIntroFinished;
        await educationIdle(preparationAbort.signal);
        if (disposed) return;
        const { EducationArchitecture } = await import('./educationArchitecture.js');
        if (disposed) return;
        const preview = new EducationArchitecture(element, model => callback.current(model), { assets, data });
        engine.current = preview;
        preview.select(selectedRef.current); preview.setPresence(present);
        await preview.preparation;
      } catch (error) {
        if (disposed || error.name === 'AbortError') return;
        engine.current?.dispose(); engine.current = null;
        assets?.dispose();
        if (!disposed) {
          element.dataset.preloadState = 'failed';
          element.querySelector('.load-status').hidden = false; element.querySelector('.load-status').textContent = '建筑预览暂不可用';
        }
        console.error(error);
      }
    };
    // Download + compute off-thread during the intro. GPU work is deferred
    // until its handoff, then spread over idle windows below the fold.
    load();
    const presence = value => {
      present = value;
      if (element.dataset.ready !== 'true') element.querySelector('.load-status').hidden = !value;
      if (value) load(); engine.current?.setPresence(value);
    };
    const trigger = ScrollTrigger.create({ trigger: element, start: 'top 82%', end: 'bottom 18%',
      onEnter: () => presence(true), onEnterBack: () => presence(true),
      onLeave: () => presence(false), onLeaveBack: () => presence(false) });
    presence(trigger.isActive);
    return () => {
      disposed = true; preparationAbort.abort(); assets?.dispose(); trigger.kill();
      engine.current?.dispose(); engine.current = null;
    };
  }, []);
  const building = BUILDINGS[displayed];
  return <div ref={host} className="education-building image-panel" aria-label="校园建筑线稿">
    <div className="transition-viewport"><canvas tabIndex="0" aria-label={`${building.school} ${building.building}，左右拖动旋转`} /><p className="load-status" role="status" hidden>正在加载建筑…</p></div>
    <div className="education-drafting" aria-hidden="true">
      <CursorDotField className="education-dots" scale={.65} />
      <CursorDotField className="education-dots education-dots-lower" scale={.65} />
    </div>
    <div className="image-panel-bottom education-building-label" aria-live="polite"><span className="education-building-caption">{building.building}<span className="education-building-school">{building.school}</span></span></div>
  </div>;
}
