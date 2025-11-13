#!/usr/bin/env node
import http from 'node:http';
import { URL } from 'node:url';

const TARGET_ORIGIN = process.env.COMPOUND_PROXY_TARGET || 'https://compoundcloud.wikibase.cloud';
const LISTEN_PORT = Number(process.env.PORT || process.env.COMPOUND_PROXY_PORT || 8788);
const ALLOW_ORIGIN = process.env.COMPOUND_PROXY_ALLOW_ORIGIN || '*';
const USER_AGENT =
  process.env.COMPOUND_PROXY_USER_AGENT ||
  'crate-o-compoundcloud-proxy (+https://github.com/Language-Research-Technology/crate-o)';

const SUPPORTED_PATHS = [/^\/query\/sparql$/i, /^\/wiki\/Special:EntityData/i];

function buildCorsHeaders(extra = {}) {
  return {
    'Access-Control-Allow-Origin': ALLOW_ORIGIN,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '600',
    ...extra
  };
}

function pathAllowed(pathname) {
  return SUPPORTED_PATHS.some((pattern) => pattern.test(pathname));
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function proxyRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, buildCorsHeaders());
    res.end();
    return;
  }

  if (!pathAllowed(url.pathname)) {
    res.writeHead(404, buildCorsHeaders({ 'Content-Type': 'application/json' }));
    res.end(JSON.stringify({ error: 'Unsupported proxy path' }));
    return;
  }

  try {
    const targetUrl = new URL(url.pathname + url.search, TARGET_ORIGIN);
    const init = {
      method: req.method === 'POST' ? 'POST' : 'GET',
      headers: {
        'User-Agent': USER_AGENT,
        Accept: req.headers.accept || 'application/json',
        'Accept-Encoding': 'identity'
      }
    };

    if (init.method === 'POST') {
      const body = await readBody(req);
      init.body = body;
      if (body.length) {
        init.headers['Content-Type'] = req.headers['content-type'] || 'application/x-www-form-urlencoded';
      }
    }

    const upstream = await fetch(targetUrl, init);
    const buffer = Buffer.from(await upstream.arrayBuffer());
    const headers = buildCorsHeaders({
      'Content-Type': upstream.headers.get('content-type') || 'application/octet-stream',
      'Cache-Control': upstream.headers.get('cache-control') || 'no-store'
    });
    res.writeHead(upstream.status, headers);
    res.end(buffer);
  } catch (error) {
    res.writeHead(502, buildCorsHeaders({ 'Content-Type': 'application/json' }));
    res.end(JSON.stringify({ error: 'Proxy request failed', details: error.message }));
  }
}

const server = http.createServer(proxyRequest);
server.listen(LISTEN_PORT, () => {
  console.log(
    `[compoundcloud-proxy] listening on port ${LISTEN_PORT} and forwarding to ${TARGET_ORIGIN}`
  );
});
