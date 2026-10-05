// Public CountAPI event endpoint; no keys or third-party scripts are used.
// Preview votes are isolated from the published portfolio's counter.
const preview = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
const key = preview ? 'portfolio-development' : 'portfolio';
const prefix = `fafa2333-github-io-portfolio-8f02e4${preview ? '-development' : ''}`;
const endpoint = 'https://countapi.mileshilliard.com/api/v1';
export const likeStorageKey = `li-yufu:portfolio-vote:v2:${key}`;

async function request(operation, counter, signal) {
  const timeout = AbortSignal.timeout(10000);
  const response = await fetch(`${endpoint}/${operation}/${prefix}-${counter}`, {
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    cache: 'no-store',
    credentials: 'omit'
  });
  const result = await response.json();
  if (operation === 'get' && response.status === 404 && result.error === 'Key not found') return 0;
  if (!response.ok) throw new Error('Like counter request failed');
  const value = typeof result.value === 'number' ? result.value : /^\d+$/.test(result.value) ? Number(result.value) : NaN;
  if (!Number.isSafeInteger(value) || value < 0)
    throw new Error('Invalid like total');
  return value;
}

// Two atomic, append-only counters allow a cancellation without overwriting
// concurrent visitors' votes. The displayed total is likes minus cancellations.
export async function readLikeCounters(signal) {
  const [likes, cancels] = await Promise.all([
    request('get', 'likes', signal), request('get', 'cancels', signal)
  ]);
  return { likes, cancels };
}

export async function submitLike(nextLiked, previous) {
  const changed = nextLiked ? 'likes' : 'cancels';
  const other = nextLiked ? 'cancels' : 'likes';
  // Read the independent counter alongside the atomic hit to avoid a second
  // network round trip. A failed aggregate read must not undo a saved toggle.
  const [value, otherValue] = await Promise.all([
    request('hit', changed), request('get', other).catch(() => previous[other])
  ]);
  return { [changed]: value, [other]: otherValue };
}
