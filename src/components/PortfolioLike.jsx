import { useEffect, useRef, useState } from 'react';
import PulseHeart from './PulseHeart';
import { likeStorageKey, readLikeCounters, submitLike } from '../lib/portfolioLikes';

function readLiked() {
  try { return window.localStorage.getItem(likeStorageKey) === '1'; }
  catch { return false; }
}

export default function PortfolioLike() {
  const [liked, setLiked] = useState(readLiked);
  const [counts, setCounts] = useState(null);
  const total = counts === null ? null : Math.max(0, counts.likes - counts.cancels);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const busy = useRef(false);
  const mounted = useRef(false);
  const reading = useRef(null);

  useEffect(() => {
    mounted.current = true;
    const refresh = async () => {
      if (busy.current || reading.current) return;
      const controller = new AbortController();
      reading.current = controller;
      try {
        const current = await readLikeCounters(controller.signal);
        if (mounted.current) { setCounts(current); setError(''); }
      } catch {
        if (mounted.current && !controller.signal.aborted) setError('点赞数暂时无法加载，请刷新后重试。');
      } finally {
        if (reading.current === controller) reading.current = null;
      }
    };
    const sync = event => {
      if (event.key === likeStorageKey || event.key === null) {
        setLiked(readLiked());
        refresh();
      }
    };
    const visible = () => { if (document.visibilityState === 'visible') refresh(); };
    refresh();
    window.addEventListener('storage', sync);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', visible);
    return () => {
      mounted.current = false;
      reading.current?.abort();
      reading.current = null;
      window.removeEventListener('storage', sync);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', visible);
    };
  }, []);

  async function changeLiked(nextLiked) {
    if (busy.current || counts === null || nextLiked === liked) return;
    const previousCounts = counts;
    const previousLiked = liked;
    busy.current = true;
    reading.current?.abort();
    setPending(true);
    setError('');
    setLiked(nextLiked);
    setCounts({ ...counts, [nextLiked ? 'likes' : 'cancels']: counts[nextLiked ? 'likes' : 'cancels'] + 1 });
    try {
      const current = await submitLike(nextLiked, previousCounts);
      if (mounted.current) setCounts(current);
      try { window.localStorage.setItem(likeStorageKey, nextLiked ? '1' : '0'); }
      catch { /* The toggle remains usable without local storage. */ }
    } catch {
      if (mounted.current) {
        setLiked(previousLiked);
        setCounts(previousCounts);
        setError(nextLiked ? '点赞未确认，请重试。' : '取消点赞未确认，请重试。');
      }
    } finally {
      busy.current = false;
      if (mounted.current) setPending(false);
    }
  }

  return <div className="footer-like" aria-busy={pending}>
    <span className="footer-like-count" title="总点赞量" aria-live="polite" aria-atomic="true">
      <span className="pulse-heart__sr">总点赞量：</span>
      {total === null ? '—' : new Intl.NumberFormat('en-US').format(total)}
    </span>
    <PulseHeart liked={liked} count={total ?? 0} onChange={changeLiked}
      disabled={pending || total === null}
      showCount={false} icon="heart" idleOutline size={28} corner={24}
      likedColor="#dfff00" idleColor="#a5ad98" pillColor="#34392f" textColor="#f3f4ee"
      duration={520} dotSize={.28} overshoot={1.15} beat={1.5}
      label={pending ? '正在保存点赞状态' : liked ? '取消点赞' : '点赞作品集'} />
    <span className="pulse-heart__sr" role="status">{error}</span>
  </div>;
}
