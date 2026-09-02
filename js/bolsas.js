// Aba Bolsas: lista de malinhas, manequim que veste as peças arrastadas
// e faixa com o estoque disponível.

import { categoria } from './config.js';
import { brl, esc, toast } from './utils.js';
import {
  adicionarPeca, excluirBolsa, indiceUso, itensDaBolsa, listaBolsas, listaPecas,
  removerPeca, selecionarBolsa, state, valorDaBolsa,
} from './store.js';
import { abrirModalBolsa, confirmar } from './modais.js';
import { renderManequim } from './mannequin.js';
import { midiaPeca } from './estoque.js';

const $ = (sel) => document.querySelector(sel);

let arrastando = null;      // id da peça sendo arrastada
let mostrarUsadas = false;  // exibir na faixa peças já alocadas em outras bolsas

/* ------------------------------ lista de bolsas -------------------------- */

function renderLista() {
  const bolsas = listaBolsas();
  $('#bolsas-list').innerHTML = bolsas.map((b) => {
    const qtd = itensDaBolsa(b.id).length;
    return `
      <button class="bag${b.id === state.bolsaAtiva ? ' is-active' : ''}" data-bolsa="${b.id}">
        <span class="bag__name">${esc(b.nome)}</span>
        <span class="bag__meta">
          <span><strong>${qtd}</strong> ${qtd === 1 ? 'peça' : 'peças'}</span>
          <span>·</span>
          <span><strong>${brl(valorDaBolsa(b.id))}</strong></span>
        </span>
        ${b.obs ? `<span class="bag__meta">${esc(b.obs)}</span>` : ''}
      </button>`;
  }).join('');
}

/* ------------------------------- workspace ------------------------------- */

function renderLook(itens) {
  $('#look-count').textContent = `${itens.length} ${itens.length === 1 ? 'peça' : 'peças'}`;
  $('#look-total').textContent = brl(itens.reduce((s, p) => s + (Number(p.valor) || 0), 0));
  $('#look-list').innerHTML = itens.map((p) => `
    <li class="look-item">
      ${p.foto
        ? `<img class="look-item__thumb" src="${p.foto}" alt="${esc(p.nome)}">`
        : `<div class="look-item__thumb piece__ph" style="font-size:20px">${p.cat.icon}</div>`}
      <div class="look-item__info">
        <div class="look-item__name">${esc(p.nome)}</div>
        <div class="look-item__cat">${p.cat.icon} ${esc(p.cat.nome)}</div>
      </div>
      <div class="look-item__price">${brl(p.valor)}</div>
      <button class="look-item__rm" data-remover="${p.id}" title="Tirar do look" aria-label="Tirar ${esc(p.nome)} do look">&times;</button>
    </li>`).join('');
}

function renderStrip() {
  const uso = indiceUso();
  const bolsaAtual = state.bolsaAtiva;
  const disponiveis = listaPecas().filter((p) => {
    const alocada = uso[p.id];
    if (alocada && alocada.bolsaId === bolsaAtual) return false; // já está no look
    return mostrarUsadas || !alocada;
  });

  $('#strip-estoque').innerHTML = disponiveis.map((p) => {
    const alocada = uso[p.id];
    const cat = categoria(p.categoria);
    return `
      <article class="strip-item${alocada ? ' is-used' : ''}"
               ${alocada ? '' : 'draggable="true"'} data-peca="${p.id}"
               title="${alocada ? `Em uso por ${esc(alocada.bolsaNome)}` : 'Arraste para o manequim'}">
        <div class="strip-item__media">${midiaPeca(p, 'strip-item__ph')}</div>
        <div class="strip-item__body">
          <div class="strip-item__name">${cat.icon} ${esc(p.nome)}</div>
          <div class="strip-item__price">${alocada ? `Com ${esc(alocada.bolsaNome)}` : brl(p.valor)}</div>
        </div>
      </article>`;
  }).join('');
}

export function renderBolsas() {
  renderLista();

  const bolsa = state.bolsaAtiva ? state.bolsas[state.bolsaAtiva] : null;
  const temBolsas = listaBolsas().length > 0;

  $('#bolsas-empty').hidden = !!bolsa;
  $('#workspace').hidden = !bolsa;
  if (!temBolsas) {
    $('#bolsas-empty').querySelector('h3').textContent = 'Nenhuma bolsa criada ainda';
    $('#bolsas-empty').querySelector('p').textContent =
      'Crie uma bolsa com o nome da pessoa para montar o look.';
  }
  if (!bolsa) return;

  $('#ws-nome').textContent = bolsa.nome;
  $('#ws-obs').textContent = bolsa.obs || '';

  const itens = itensDaBolsa(state.bolsaAtiva);
  $('#mannequin').innerHTML = renderManequim(itens);
  $('#mannequin-hint').textContent = itens.length
    ? 'Solte outra peça para completar o look'
    : 'Arraste uma peça até aqui';
  renderLook(itens);
  renderStrip();
}

/* --------------------------- drag & drop --------------------------------- */

async function soltarNaBolsa(bolsaId, pecaId) {
  if (!bolsaId) { toast('Selecione ou crie uma bolsa primeiro.', 'err'); return; }
  if (!pecaId) return;
  try {
    const r = await adicionarPeca(bolsaId, pecaId);
    if (!r.ok) { toast(r.motivo, 'err'); return; }
    toast(`${state.pecas[pecaId].nome} entrou na malinha de ${state.bolsas[bolsaId].nome}.`, 'ok');
  } catch (err) {
    toast(`Falha ao adicionar: ${err.message}`, 'err');
  }
}

function ligarDragDrop() {
  const strip = $('#strip-estoque');

  strip.addEventListener('dragstart', (e) => {
    const item = e.target.closest('.strip-item[draggable="true"]');
    if (!item) { e.preventDefault(); return; }
    arrastando = item.dataset.peca;
    item.classList.add('is-dragging');
    e.dataTransfer.setData('text/plain', arrastando);
    e.dataTransfer.effectAllowed = 'copy';
  });
  strip.addEventListener('dragend', (e) => {
    e.target.closest('.strip-item')?.classList.remove('is-dragging');
    arrastando = null;
  });

  // Toque / clique como alternativa ao arrasto.
  strip.addEventListener('click', (e) => {
    const item = e.target.closest('.strip-item');
    if (!item || item.classList.contains('is-used')) return;
    soltarNaBolsa(state.bolsaAtiva, item.dataset.peca);
  });

  const zona = $('#dropzone');
  zona.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    zona.classList.add('is-over');
  });
  zona.addEventListener('dragleave', (e) => {
    if (!zona.contains(e.relatedTarget)) zona.classList.remove('is-over');
  });
  zona.addEventListener('drop', (e) => {
    e.preventDefault();
    zona.classList.remove('is-over');
    soltarNaBolsa(state.bolsaAtiva, e.dataTransfer.getData('text/plain') || arrastando);
  });

  // Soltar direto sobre um cartão de bolsa da lista lateral.
  const lista = $('#bolsas-list');
  lista.addEventListener('dragover', (e) => {
    const bag = e.target.closest('.bag');
    if (!bag) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    lista.querySelectorAll('.bag').forEach((b) => b.classList.remove('is-drop-target'));
    bag.classList.add('is-drop-target');
  });
  lista.addEventListener('dragleave', (e) => {
    if (!lista.contains(e.relatedTarget)) {
      lista.querySelectorAll('.bag').forEach((b) => b.classList.remove('is-drop-target'));
    }
  });
  lista.addEventListener('drop', (e) => {
    const bag = e.target.closest('.bag');
    lista.querySelectorAll('.bag').forEach((b) => b.classList.remove('is-drop-target'));
    if (!bag) return;
    e.preventDefault();
    soltarNaBolsa(bag.dataset.bolsa, e.dataTransfer.getData('text/plain') || arrastando);
  });
}

/* --------------------------------- init ---------------------------------- */

export function iniciarBolsas() {
  $('#btn-nova-bolsa').addEventListener('click', () => abrirModalBolsa());
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-open-bolsa]')) abrirModalBolsa();
  });

  $('#bolsas-list').addEventListener('click', (e) => {
    const bag = e.target.closest('[data-bolsa]');
    if (bag) selecionarBolsa(bag.dataset.bolsa);
  });

  $('#ws-editar').addEventListener('click', () => {
    const id = state.bolsaAtiva;
    if (id) abrirModalBolsa({ id, ...state.bolsas[id] });
  });

  $('#ws-excluir').addEventListener('click', async () => {
    const id = state.bolsaAtiva;
    const bolsa = state.bolsas[id];
    if (!bolsa) return;
    const qtd = itensDaBolsa(id).length;
    const ok = await confirmar({
      titulo: 'Excluir bolsa',
      texto: `Excluir a malinha de ${bolsa.nome}?${qtd ? ` As ${qtd} peça(s) voltam para o estoque livre.` : ''}`,
    });
    if (!ok) return;
    try {
      await excluirBolsa(id);
      toast('Bolsa excluída.', 'ok');
    } catch (err) {
      toast(`Falha ao excluir: ${err.message}`, 'err');
    }
  });

  $('#look-list').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-remover]');
    if (!btn) return;
    try {
      await removerPeca(state.bolsaAtiva, btn.dataset.remover);
    } catch (err) {
      toast(`Falha ao remover: ${err.message}`, 'err');
    }
  });

  $('#ws-mostrar-todas').addEventListener('change', (e) => {
    mostrarUsadas = e.target.checked;
    renderStrip();
  });

  ligarDragDrop();
}
