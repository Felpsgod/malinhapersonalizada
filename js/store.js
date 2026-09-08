// Estado da aplicação + operações que persistem no Firebase.
//
// Modelo no Realtime Database:
//   /pecas/{id}  = { nome, custo, venda, categoria, foto, criadoEm }
//   /bolsas/{id} = { nome, obs, criadoEm, itens: { pecaId: true } }
//   /perfis/{uid} = { senhaTrocada }
//
// Peças antigas guardavam um único `valor`. Ele é lido como preço de venda e
// sai do registro na primeira edição — ver `normalizarPeca`.
//
// Regra de negócio: uma peça só pode estar em uma bolsa por vez — é isso que
// torna os relatórios de "em uso" x "livre" confiáveis.

import { db } from './db.js';
import { categoria } from './config.js';

export const state = {
  pecas: {},
  bolsas: {},
  perfil: {},
  bolsaAtiva: null,
  carregado: false,
};

const listeners = new Set();

export function onChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit() {
  listeners.forEach((fn) => fn());
}

/* ------------------------------- carga ---------------------------------- */

/**
 * Deixa toda peça com `custo` e `venda` numéricos, inclusive as antigas, que
 * tinham só `valor`. Normalizar aqui evita espalhar `?? valor` por toda tela.
 */
function normalizarPeca(peca) {
  peca.custo = Number(peca.custo) || 0;
  peca.venda = Number(peca.venda ?? peca.valor) || 0;
  delete peca.valor;
  return peca;
}

export async function carregar(uid) {
  const dados = (await db.get('')) || {};
  state.pecas = dados.pecas || {};
  state.bolsas = dados.bolsas || {};
  state.perfil = (uid && dados.perfis?.[uid]) || {};
  Object.values(state.pecas).forEach(normalizarPeca);
  // Normaliza: garante que toda bolsa tenha `itens`.
  Object.values(state.bolsas).forEach((b) => { b.itens = b.itens || {}; });
  state.carregado = true;
  if (state.bolsaAtiva && !state.bolsas[state.bolsaAtiva]) state.bolsaAtiva = null;
  if (!state.bolsaAtiva) state.bolsaAtiva = listaBolsas()[0]?.id || null;
  emit();
}

/** Zera o estado ao sair — nada do acervo fica na tela para o próximo. */
export function limpar() {
  state.pecas = {};
  state.bolsas = {};
  state.perfil = {};
  state.bolsaAtiva = null;
  state.carregado = false;
  emit();
}

/* ------------------------------ seletores -------------------------------- */

export function listaPecas() {
  return Object.entries(state.pecas)
    .map(([id, p]) => ({ id, ...p }))
    .sort((a, b) => (b.criadoEm || '').localeCompare(a.criadoEm || ''));
}

export function listaBolsas() {
  return Object.entries(state.bolsas)
    .map(([id, b]) => ({ id, ...b, itens: b.itens || {} }))
    .sort((a, b) => (b.criadoEm || '').localeCompare(a.criadoEm || ''));
}

/** Mapa pecaId -> { bolsaId, bolsaNome } para tudo que está alocado. */
export function indiceUso() {
  const idx = {};
  listaBolsas().forEach((b) => {
    Object.keys(b.itens).forEach((pecaId) => {
      if (state.pecas[pecaId]) idx[pecaId] = { bolsaId: b.id, bolsaNome: b.nome };
    });
  });
  return idx;
}

/** Peças de uma bolsa, já ordenadas pela ordem de vestir do look. */
export function itensDaBolsa(bolsaId) {
  const bolsa = state.bolsas[bolsaId];
  if (!bolsa) return [];
  return Object.keys(bolsa.itens || {})
    .filter((id) => state.pecas[id])
    .map((id) => ({ id, ...state.pecas[id], cat: categoria(state.pecas[id].categoria) }))
    .sort((a, b) => a.cat.z - b.cat.z);
}

/** Soma de custo e de venda das peças de uma bolsa. */
export function totaisDaBolsa(bolsaId) {
  return somar(itensDaBolsa(bolsaId));
}

/** Soma custo e venda de uma lista de peças. */
export function somar(pecas) {
  return pecas.reduce(
    (t, p) => ({ custo: t.custo + (Number(p.custo) || 0), venda: t.venda + (Number(p.venda) || 0) }),
    { custo: 0, venda: 0 },
  );
}

/* -------------------------------- perfil --------------------------------- */

/**
 * Quem nunca trocou a senha ainda está com a senha provisória que o
 * administrador cadastrou — o app pede a troca antes de abrir.
 */
export function precisaTrocarSenha() {
  return state.perfil?.senhaTrocada !== true;
}

export async function marcarSenhaTrocada(uid) {
  await db.put(`perfis/${uid}/senhaTrocada`, true);
  state.perfil = { ...state.perfil, senhaTrocada: true };
  emit();
}

/* ------------------------------- peças ----------------------------------- */

export async function criarPeca({ nome, custo, venda, categoria: cat, foto }) {
  const peca = {
    nome: nome.trim(),
    custo: Number(custo) || 0,
    venda: Number(venda) || 0,
    categoria: cat,
    foto: foto || '',
    criadoEm: new Date().toISOString(),
  };
  const id = await db.push('pecas', peca);
  state.pecas[id] = peca;
  emit();
  return id;
}

export async function atualizarPeca(id, { nome, custo, venda, categoria: cat, foto }) {
  const patch = {
    nome: nome.trim(),
    custo: Number(custo) || 0,
    venda: Number(venda) || 0,
    categoria: cat,
    foto: foto || '',
    // `null` apaga o campo: peça antiga migra de `valor` para custo/venda ao
    // ser editada, em vez de ficar com os dois esquemas no mesmo registro.
    valor: null,
  };
  await db.patch(`pecas/${id}`, patch);
  state.pecas[id] = normalizarPeca({ ...state.pecas[id], ...patch });
  emit();
}

/** Remove a peça e a tira de qualquer bolsa em que estivesse. */
export async function excluirPeca(id) {
  const bolsasAfetadas = listaBolsas().filter((b) => b.itens[id]);
  await Promise.all([
    db.remove(`pecas/${id}`),
    ...bolsasAfetadas.map((b) => db.remove(`bolsas/${b.id}/itens/${id}`)),
  ]);
  delete state.pecas[id];
  bolsasAfetadas.forEach((b) => { delete state.bolsas[b.id].itens[id]; });
  emit();
}

/* ------------------------------- bolsas ---------------------------------- */

export async function criarBolsa({ nome, obs }) {
  const bolsa = {
    nome: nome.trim(),
    obs: (obs || '').trim(),
    criadoEm: new Date().toISOString(),
    itens: {},
  };
  const id = await db.push('bolsas', bolsa);
  state.bolsas[id] = bolsa;
  state.bolsaAtiva = id;
  emit();
  return id;
}

export async function atualizarBolsa(id, { nome, obs }) {
  const patch = { nome: nome.trim(), obs: (obs || '').trim() };
  await db.patch(`bolsas/${id}`, patch);
  state.bolsas[id] = { ...state.bolsas[id], ...patch };
  emit();
}

export async function excluirBolsa(id) {
  await db.remove(`bolsas/${id}`);
  delete state.bolsas[id];
  if (state.bolsaAtiva === id) state.bolsaAtiva = listaBolsas()[0]?.id || null;
  emit();
}

export function selecionarBolsa(id) {
  state.bolsaAtiva = id;
  emit();
}

/* --------------------------- bolsa x peça -------------------------------- */

export async function adicionarPeca(bolsaId, pecaId) {
  const bolsa = state.bolsas[bolsaId];
  if (!bolsa || !state.pecas[pecaId]) return { ok: false, motivo: 'Peça ou bolsa não encontrada.' };
  if (bolsa.itens?.[pecaId]) return { ok: false, motivo: 'Esta peça já está na bolsa.' };

  const uso = indiceUso()[pecaId];
  if (uso) return { ok: false, motivo: `Peça já está na malinha de ${uso.bolsaNome}.` };

  await db.put(`bolsas/${bolsaId}/itens/${pecaId}`, true);
  bolsa.itens = bolsa.itens || {};
  bolsa.itens[pecaId] = true;
  emit();
  return { ok: true };
}

export async function removerPeca(bolsaId, pecaId) {
  await db.remove(`bolsas/${bolsaId}/itens/${pecaId}`);
  if (state.bolsas[bolsaId]?.itens) delete state.bolsas[bolsaId].itens[pecaId];
  emit();
}
