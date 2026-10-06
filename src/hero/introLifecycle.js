// One bounded resource gate, shared by the drawing timeline and its cleanup.
// Font rejection is a usable system-font fallback, not an endless loading state.
export function resourceGate(resource, schedule, onReady, timeout = .95) {
  let disposed = false, settled = false;
  const resolve = () => {
    if (disposed || settled) return;
    settled = true; cancel(); onReady();
  };
  const cancel = schedule(timeout, resolve);
  Promise.resolve(resource).then(resolve, resolve);
  return { ready: () => settled, dispose: () => { disposed = true; cancel(); } };
}
export function lockIntroScroll(doc) {
  const elements = [doc.documentElement, doc.body];
  const saved = elements.map(el => [el.style.getPropertyValue('overflow'), el.style.getPropertyPriority('overflow')]);
  elements.forEach(el => { el.style.overflow = 'hidden'; });
  let unlocked = false;
  return () => {
    if (unlocked) return;
    unlocked = true;
    elements.forEach((el, i) => { el.style.setProperty('overflow', saved[i][0], saved[i][1]); });
  };
}
