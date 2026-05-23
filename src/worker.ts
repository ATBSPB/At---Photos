interface Env {
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
  KV: KVNamespace;
  R2: R2Bucket;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/kv/')) {
      return handleKV(request, env);
    }

    if (url.pathname.startsWith('/api/r2-download/')) {
      return handleR2Download(request, env);
    }

    if (url.pathname.startsWith('/api/r2/')) {
      return handleR2(request, env);
    }

    if (url.pathname.startsWith('/docs/')) {
      return handleDocs(request, env);
    }

    const response = await env.ASSETS.fetch(request);

    if (response.status === 404 && !url.pathname.includes('.')) {
      const indexRequest = new Request(new URL('/index.html', request.url), request);
      return env.ASSETS.fetch(indexRequest);
    }

    return response;
  },
};

async function handleKV(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const key = url.pathname.replace('/api/kv/', '');

  if (request.method === 'GET') {
    const value = await env.KV.get(key);
    if (value === null) {
      return new Response('Not Found', { status: 404 });
    }
    return new Response(value, {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (request.method === 'PUT') {
    const value = await request.text();
    await env.KV.put(key, value);
    return new Response('OK', { status: 200 });
  }

  if (request.method === 'DELETE') {
    await env.KV.delete(key);
    return new Response('OK', { status: 200 });
  }

  return new Response('Method Not Allowed', { status: 405 });
}

async function handleDocs(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get('Origin') || '*';

  const headers = new Headers({
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept',
    'Content-Type': 'application/json',
  });

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  const url = new URL(request.url);
  const key = url.pathname.replace('/docs/', '').replace(/\/$/, '') || 'photos';

  const value = await env.KV.get(key);

  if (value === null) {
    return new Response(JSON.stringify({ error: 'Not Found' }), { status: 404, headers });
  }

  return new Response(value, { status: 200, headers });
}

async function handleR2(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const key = url.pathname.replace('/api/r2/', '');

  if (request.method === 'GET') {
    const object = await env.R2.get(key);
    if (object === null) {
      return new Response('Not Found', { status: 404 });
    }
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    return new Response(object.body, { headers });
  }

  if (request.method === 'PUT') {
    const body = await request.arrayBuffer();
    await env.R2.put(key, body);
    return new Response('OK', { status: 200 });
  }

  if (request.method === 'DELETE') {
    await env.R2.delete(key);
    return new Response('OK', { status: 200 });
  }

  return new Response('Method Not Allowed', { status: 405 });
}

async function handleR2Download(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const key = url.pathname.replace('/api/r2-download/', '');

  const object = await env.R2.get(key);
  if (object === null) {
    return new Response('Not Found', { status: 404 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('Content-Disposition', `attachment; filename="${key.split('/').pop()}"`);

  return new Response(object.body, { headers });
}
