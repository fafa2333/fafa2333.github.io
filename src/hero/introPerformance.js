// Opt-in local profiling only; no UI or ongoing work in normal visits.
export function measureIntro(root) {
  if (!new URLSearchParams(location.search).has('educationPerf')) return () => {};
  let frame, previous, stopped = false;
  const intervals = [], tasks = [];
  const observer = typeof PerformanceObserver !== 'undefined' && PerformanceObserver.supportedEntryTypes.includes('longtask')
    ? new PerformanceObserver(list => tasks.push(...list.getEntries().map(entry => entry.duration))) : null;
  observer?.observe({ type: 'longtask' });
  const tick = time => {
    if (previous != null) intervals.push(time - previous);
    previous = time; frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
  return () => {
    if (stopped) return; stopped = true;
    cancelAnimationFrame(frame); observer?.disconnect();
    intervals.sort((a, b) => a - b);
    root.dataset.introPerformance = JSON.stringify({ frames: intervals.length,
      maxFrameMs: +(intervals.at(-1) || 0).toFixed(1),
      p95FrameMs: +(intervals[Math.floor(intervals.length * .95)] || 0).toFixed(1),
      framesOver50ms: intervals.filter(value => value > 50).length,
      longTasks: tasks.map(value => +value.toFixed(1)) });
  };
}
