export const EDUCATION_UPLOAD_BATCH = 32768;

export class EducationPreparationClient {
  constructor() {
    this.worker = new Worker(new URL('./educationPreparation.worker.js', import.meta.url), { type: 'module' });
    this.requests = new Map(); this.serial = 0;
    this.worker.onmessage = ({ data }) => {
      const request = this.requests.get(data.id);
      if (!request) return;
      this.requests.delete(data.id);
      data.error ? request.reject(new Error(data.error)) : request.resolve(data.result);
    };
    this.worker.onerror = () => this.dispose(new Error('建筑后台准备失败'));
  }
  request(type, aspect) {
    if (this.disposed) return Promise.reject(new DOMException('Disposed', 'AbortError'));
    return new Promise((resolve, reject) => {
      const id = ++this.serial;
      this.requests.set(id, { resolve, reject }); this.worker.postMessage({ id, type, aspect });
    });
  }
  dispose(error = new DOMException('Disposed', 'AbortError')) {
    if (this.disposed) return; this.disposed = true;
    this.worker.terminate();
    for (const request of this.requests.values()) request.reject(error);
    this.requests.clear();
  }
}

// At most one upload/setup batch per idle window. The fallback yields across
// paints; a timeout still makes progress while the user keeps scrolling.
export function educationIdle(signal) {
  return new Promise((resolve, reject) => {
    let idle, frame;
    const cancel = () => {
      if (idle != null) cancelIdleCallback(idle);
      cancelAnimationFrame(frame); signal.removeEventListener('abort', abort);
    };
    const abort = () => { cancel(); reject(new DOMException('Disposed', 'AbortError')); };
    const complete = () => { cancel(); resolve(); };
    if (signal.aborted) { abort(); return; }
    signal.addEventListener('abort', abort, { once: true });
    if ('requestIdleCallback' in window) {
      idle = requestIdleCallback(deadline => {
        idle = null;
        if (!deadline.didTimeout && deadline.timeRemaining() < 6) frame = requestAnimationFrame(() => { frame = requestAnimationFrame(complete); });
        else complete();
      }, { timeout: 150 });
    } else frame = requestAnimationFrame(() => { frame = requestAnimationFrame(complete); });
  });
}
