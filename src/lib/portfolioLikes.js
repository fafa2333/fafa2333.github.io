// Public CounterAPI.com event endpoint; no keys or third-party scripts are used.
// Preview votes are isolated from the published portfolio's counter.
const preview = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
const key = preview ? 'portfolio-development' : 'portfolio';
const endpoint = `https://counterapi.com/api/fafa2333.github.io/like/${key}`;
export const likeStorageKey = `li-yufu:portfolio-vote:v2:${key}`;

async function request(readOnly, signal) {
  const url = new URL(endpoint);
  url.searchParams.set('behavior', 'vote');
  // This API treats a present readOnly parameter as true, including "false".
  // Omit it entirely for an intentional vote; never write on page load.
  if (readOnly) url.searchParams.set('readOnly', 'true');
  const timeout = AbortSignal.timeout(10000);
  const response = await fetch(url, {
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    cache: 'no-store',
    credentials: 'omit'
  });
  if (!response.ok) throw new Error('Like counter request failed');
  const result = await response.json();
  if (!Number.isSafeInteger(result.value) || result.value < 0)
    throw new Error('Invalid like total');
  return result.value;
}

export const readLikeTotal = signal => request(true, signal);
export const submitLike = () => request(false);
