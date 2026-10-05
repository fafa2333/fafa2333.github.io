import { useEffect, useRef, useState } from 'react';
import PulseHeart from './PulseHeart';
import { likeStorageKey, readLikeTotal, submitLike } from '../lib/portfolioLikes';

function readLiked() {
  try { return window.localStorage.getItem(likeStorageKey) === '1'; }
  catch { return false; }
}

export default function PortfolioLike() {
  const [liked, setLiked] = useState(readLiked);
  const [total, setTotal] = useState(null);
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
        const count = await readLikeTotal(controller.signal);
        if (mounted.current) { setTotal(count); setError(''); }
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
    if (!nextLiked || liked || busy.current || total === null || readLiked()) return;
    const previousTotal = total;
    busy.current = true;
    reading.current?.abort();
    setPending(true);
    setError('');
    setLiked(true);
    setTotal(previousTotal + 1);
    try {
      const count = await submitLike();
      if (mounted.current) setTotal(count);
      try { window.localStorage.setItem(likeStorageKey, '1'); }
      catch { /* Server-side vote filtering still applies without local storage. */ }
      // Use the acknowledged total. Aggregate reads can briefly lag a new vote.
    } catch {
      if (mounted.current) {
        setLiked(false);
        setTotal(previousTotal);
        setError('点赞未确认，请重试。');
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
      disabled={liked || pending || total === null}
      showCount={false} icon="heart" idleOutline size={28} corner={24}
      likedColor="#dfff00" idleColor="#a5ad98" pillColor="#34392f" textColor="#f3f4ee"
      duration={520} dotSize={.28} overshoot={1.15} beat={1.5}
      label={pending ? '正在保存点赞' : liked ? '已点赞作品集' : '点赞作品集'} />
    <span className="pulse-heart__sr" role="status">{error}</span>
  </div>;
}
