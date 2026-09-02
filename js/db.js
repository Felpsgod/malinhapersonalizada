// Cliente REST do Firebase Realtime Database.
// Não usamos o SDK: a API REST cobre tudo que precisamos e mantém o site
// estático (zero build, funciona direto no GitHub Pages).

import { FIREBASE_URL } from './config.js';

const listeners = new Set();

/** Assina mudanças de estado da conexão: 'idle' | 'busy' | 'ok' | 'err'. */
export function onNetwork(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function setState(state, detail) {
  listeners.forEach((fn) => fn(state, detail));
}

let pendentes = 0;

async function request(path, method = 'GET', body) {
  const url = `${FIREBASE_URL}/${path.replace(/^\/+/, '')}.json`;
  pendentes += 1;
  setState('busy');
  try {
    const res = await fetch(url, {
      method,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`Firebase ${res.status}: ${txt.slice(0, 200) || res.statusText}`);
    }
    const data = await res.json();
    pendentes -= 1;
    if (pendentes === 0) setState('ok');
    return data;
  } catch (err) {
    pendentes -= 1;
    setState('err', err.message);
    throw err;
  }
}

export const db = {
  get: (path = '') => request(path, 'GET'),
  /** Cria um nó com chave gerada pelo Firebase. Devolve o id criado. */
  push: async (path, data) => (await request(path, 'POST', data))?.name,
  put: (path, data) => request(path, 'PUT', data),
  patch: (path, data) => request(path, 'PATCH', data),
  remove: (path) => request(path, 'DELETE'),
};
