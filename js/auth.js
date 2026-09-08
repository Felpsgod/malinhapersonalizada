// Autenticação por e-mail e senha via API REST do Firebase (Identity Toolkit).
// Mesma escolha do db.js: sem SDK, o site continua estático e sem build.
//
// O token de acesso vale 1 hora. Guardamos também o refresh token para que
// fechar e reabrir a aba não obrigue a digitar a senha de novo.

import { FIREBASE_API_KEY } from './config.js';

const URL_ENTRAR = 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword';
const URL_RENOVAR = 'https://securetoken.googleapis.com/v1/token';
const CHAVE = 'malinha.sessao';

// Renova um pouco antes de expirar: sem essa folga, uma requisição disparada
// no limite chegaria ao Firebase com o token já vencido.
const FOLGA_MS = 2 * 60 * 1000;

/** @type {{idToken:string, refreshToken:string, expiraEm:number, email:string, uid:string}|null} */
let sessao = null;
let renovando = null; // promessa em voo, para não renovar duas vezes em paralelo

const listeners = new Set();

/** Assina o estado da sessão. Recebe o usuário logado ou `null`. */
export function onAuth(fn) {
  listeners.add(fn);
  fn(usuario());
  return () => listeners.delete(fn);
}

function emit() {
  listeners.forEach((fn) => fn(usuario()));
}

export function usuario() {
  return sessao ? { email: sessao.email, uid: sessao.uid } : null;
}

/* ------------------------------ persistência ----------------------------- */

function guardar(dados) {
  sessao = dados;
  try {
    if (dados) localStorage.setItem(CHAVE, JSON.stringify(dados));
    else localStorage.removeItem(CHAVE);
  } catch {
    // Navegador com armazenamento bloqueado: a sessão vive só nesta aba.
  }
  emit();
}

function daResposta(json) {
  // A API de login e a de refresh devolvem os mesmos dados com nomes diferentes.
  const idToken = json.idToken || json.id_token;
  const refreshToken = json.refreshToken || json.refresh_token;
  const segundos = Number(json.expiresIn || json.expires_in || 3600);
  return {
    idToken,
    refreshToken,
    expiraEm: Date.now() + segundos * 1000,
    email: json.email || sessao?.email || '',
    uid: json.localId || json.user_id || sessao?.uid || '',
  };
}

/* -------------------------------- mensagens ------------------------------ */

const RECADOS = {
  EMAIL_NOT_FOUND: 'E-mail não cadastrado.',
  INVALID_PASSWORD: 'Senha incorreta.',
  INVALID_LOGIN_CREDENTIALS: 'E-mail ou senha incorretos.',
  INVALID_EMAIL: 'E-mail inválido.',
  USER_DISABLED: 'Este acesso foi desativado.',
  TOO_MANY_ATTEMPTS_TRY_LATER: 'Muitas tentativas. Aguarde alguns minutos.',
  MISSING_PASSWORD: 'Informe a senha.',
};

function traduzir(codigo) {
  const chave = String(codigo || '').split(' : ')[0].trim();
  return RECADOS[chave] || `Não consegui entrar (${chave || 'erro desconhecido'}).`;
}

/* --------------------------------- login --------------------------------- */

function semChave() {
  return !FIREBASE_API_KEY || FIREBASE_API_KEY.startsWith('COLE_AQUI');
}

export async function entrar(email, senha) {
  if (semChave()) {
    throw new Error('Falta a FIREBASE_API_KEY em js/config.js — veja o README.');
  }
  const res = await fetch(`${URL_ENTRAR}?key=${FIREBASE_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim(), password: senha, returnSecureToken: true }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(traduzir(json.error?.message));
  guardar(daResposta(json));
  return usuario();
}

export function sair() {
  guardar(null);
}

/* ------------------------------- token ativo ----------------------------- */

async function renovar() {
  if (!sessao?.refreshToken) return null;
  if (renovando) return renovando;

  renovando = (async () => {
    const res = await fetch(`${URL_RENOVAR}?key=${FIREBASE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: sessao.refreshToken,
      }),
    });
    const json = await res.json().catch(() => ({}));
    // Refresh token revogado ou expirado: a sessão acabou de verdade.
    if (!res.ok) { guardar(null); return null; }
    guardar(daResposta(json));
    return sessao.idToken;
  })().finally(() => { renovando = null; });

  return renovando;
}

/**
 * Token válido para assinar as chamadas ao banco, renovando se estiver
 * perto de vencer. Devolve `null` quando não há ninguém logado.
 */
export async function token() {
  if (!sessao) return null;
  if (Date.now() < sessao.expiraEm - FOLGA_MS) return sessao.idToken;
  return renovar();
}

/** Força a renovação — usada quando o banco recusa o token atual. */
export async function renovarToken() {
  return renovar();
}

/**
 * Recupera a sessão salva na visita anterior. Devolve o usuário logado ou
 * `null` — nesse caso a tela de login é exibida.
 */
export async function restaurar() {
  let salvo = null;
  try {
    salvo = JSON.parse(localStorage.getItem(CHAVE) || 'null');
  } catch {
    salvo = null;
  }
  if (!salvo?.refreshToken) return null;

  sessao = salvo;
  // Não confiamos no `expiraEm` gravado: o relógio pode ter mudado, e o
  // refresh token pode ter sido revogado desde então.
  const valido = await token();
  if (!valido) return null;
  emit();
  return usuario();
}
