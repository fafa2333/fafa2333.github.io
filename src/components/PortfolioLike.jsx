import { useEffect, useState } from 'react';
import PulseHeart from './PulseHeart';

const storageKey = 'li-yufu:portfolio-liked:v1';

function readLiked() {
  try { return window.localStorage.getItem(storageKey) === '1'; }
  catch { return false; }
}

export default function PortfolioLike() {
  const [liked, setLiked] = useState(readLiked);

  useEffect(() => {
    const sync = event => {
      if (event.key === storageKey || event.key === null) setLiked(event.newValue === '1');
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  function changeLiked(nextLiked) {
    setLiked(nextLiked);
    try { window.localStorage.setItem(storageKey, nextLiked ? '1' : '0'); }
    catch { /* The button remains usable when browser storage is unavailable. */ }
  }

  return <div className="footer-like">
    <span className="footer-like-label" aria-live="polite">{liked ? '谢谢你的喜欢' : '留一个喜欢'}</span>
    <PulseHeart liked={liked} count={liked ? 1 : 0} onChange={changeLiked}
      showCount={false} icon="heart" idleOutline size={28} corner={24}
      likedColor="#dfff00" idleColor="#a5ad98" pillColor="#34392f" textColor="#f3f4ee"
      duration={520} dotSize={.28} overshoot={1.15} beat={1.5}
      label={liked ? '取消点赞' : '点赞作品集'} />
  </div>;
}
