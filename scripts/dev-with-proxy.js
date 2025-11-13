#!/usr/bin/env node
import { spawn } from 'node:child_process';
import process from 'node:process';

const DEFAULT_PORT = process.env.COMPOUND_PROXY_PORT || process.env.PORT || '8788';
const proxyOrigin = process.env.COMPOUND_PROXY_ORIGIN || `http://127.0.0.1:${DEFAULT_PORT}`;
const appOrigin = process.env.VITE_COMPOUND_CLOUD_BASE || proxyOrigin;

const proxyEnv = {
  ...process.env,
  PORT: DEFAULT_PORT,
  COMPOUND_PROXY_TARGET: process.env.COMPOUND_PROXY_TARGET || 'https://compoundcloud.wikibase.cloud'
};

const proxy = spawn('node', ['proxy/compoundcloud-proxy.js'], {
  env: proxyEnv,
  stdio: 'inherit'
});

const appEnv = {
  ...process.env,
  COMPOUND_PROXY_ORIGIN: proxyOrigin,
  VITE_COMPOUND_CLOUD_BASE: appOrigin
};

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const app = spawn(npmCmd, ['run', '--silent', 'dev'], {
  env: appEnv,
  stdio: 'inherit'
});

let closing = false;
function shutdown(code = 0) {
  if (closing) return;
  closing = true;
  proxy.kill();
  app.kill();
  process.exit(code);
}

proxy.on('exit', (code) => {
  if (!closing) {
    console.log('[compoundcloud-proxy] exited');
    shutdown(code || 0);
  }
});

app.on('exit', (code) => shutdown(code || 0));

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
