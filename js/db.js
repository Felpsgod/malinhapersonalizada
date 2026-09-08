// Cliente REST do Firebase Realtime Database.
// Não usamos o SDK: a API REST cobre tudo que precisamos e mantém o site
// estático (zero build, funciona direto no GitHub Pages).
//
// Toda chamada vai assinada com o token do usuário logado (`?auth=`). Sem ele
// as regras do banco recusam a requisição — é isso que mantém o estoque
// privado mesmo com o site publicado.

import { FIREBASE_URL } from './config.js';
import { renovarToken, token } from './auth.js';

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

function enviar(base, method, body, auth) {
  return fetch(auth ? `${base}?auth=${encodeURIComponent(auth)}` : base, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

async function request(path, method = 'GET', body) {
  const base = `${FIREBASE_URL}/${path.replace(/^\/+/, '')}.json`;
  pendentes += 1;
  setState('busy');
  try {
    const assinado = await token();
    let res = await enviar(base, method, body, assinado);
    // Token recusado: pode ser só expiração adiantada do lado do Firebase.
    // Renova uma vez e repete antes de desistir.
    let renovado = null;
    if (res.status === 401) {
      renovado = await renovarToken();
      if (renovado) res = await enviar(base, method, body, renovado);
    }
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      if (res.status === 401) {
        // Um token novinho recusado não é sessão vencida: é UID fora da lista
        // /acesso do banco. Dizer "entre de novo" mandaria você para um login
        // que ia funcionar e falhar igual.
        throw new Error(renovado || assinado
          ? 'Seu usuário não está liberado neste banco (falta o UID em /acesso).'
          : 'Sessão expirada. Entre de novo.');
      }
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
