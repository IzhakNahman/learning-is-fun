// @vitest-environment node
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

type FetchHandler = (event: {
  request: Request;
  respondWith: (answer: Promise<Response>) => void;
}) => void;

const ORIGIN = 'https://game.example';

/** Runs public/sw.js with a fake cache and a fake network, and returns its fetch handler. */
function loadServiceWorker(network: (url: string) => Promise<Response>): {
  fetchHandler: FetchHandler;
  cached: Map<string, Response>;
} {
  const cached = new Map<string, Response>();
  const listeners: Record<string, FetchHandler> = {};
  const fakeCache = {
    put: async (request: Request, response: Response) => {
      cached.set(request.url, response);
    },
    addAll: async () => undefined,
  };
  const fakeCaches = {
    open: async () => fakeCache,
    match: async (request: Request | string) =>
      cached.get(typeof request === 'string' ? `${ORIGIN}/${request}` : request.url),
    keys: async () => [],
    delete: async () => true,
  };
  const fakeSelf = {
    location: { origin: ORIGIN },
    addEventListener: (type: string, handler: FetchHandler) => {
      listeners[type] = handler;
    },
    skipWaiting: () => undefined,
    clients: { claim: () => undefined },
  };
  const source = readFileSync(path.resolve(__dirname, '../public/sw.js'), 'utf8');
  new Function('self', 'caches', 'fetch', source)(fakeSelf, fakeCaches, (request: Request) =>
    network(request.url),
  );
  return { fetchHandler: listeners.fetch, cached };
}

async function ask(handler: FetchHandler, url: string): Promise<Response | undefined> {
  let answer: Promise<Response> | undefined;
  handler({ request: new Request(url), respondWith: (value) => (answer = value) });
  return answer ? await answer : undefined;
}

const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

describe('service worker', () => {
  it('fetches audio from the network first, so new recordings show up', async () => {
    let version = 'old';
    const { fetchHandler } = loadServiceWorker(async () => new Response(version));
    const url = `${ORIGIN}/audio/he/manifest.json`;
    expect(await (await ask(fetchHandler, url))?.text()).toBe('old');
    await flush();
    version = 'new';
    expect(await (await ask(fetchHandler, url))?.text()).toBe('new');
  });

  it('plays the cached audio when offline', async () => {
    let online = true;
    const { fetchHandler } = loadServiceWorker(async () => {
      if (!online) throw new Error('offline');
      return new Response('clip');
    });
    const url = `${ORIGIN}/audio/he/num-01.mp3`;
    await ask(fetchHandler, url);
    await flush();
    online = false;
    expect(await (await ask(fetchHandler, url))?.text()).toBe('clip');
  });

  it('does not cache partial (206) answers', async () => {
    const { fetchHandler, cached } = loadServiceWorker(
      async () => new Response('part', { status: 206 }),
    );
    await ask(fetchHandler, `${ORIGIN}/audio/he/num-01.mp3`);
    await flush();
    expect(cached.size).toBe(0);
  });

  it('keeps serving the app shell from the cache first', async () => {
    let calls = 0;
    const { fetchHandler } = loadServiceWorker(async () => {
      calls++;
      return new Response('page');
    });
    await ask(fetchHandler, `${ORIGIN}/index.html`);
    await flush();
    await ask(fetchHandler, `${ORIGIN}/index.html`);
    expect(calls).toBe(1);
  });
});
