// Aba Estoque: grade de peças com foto, nome, valor, filtros e CRUD.

import { CATEGORIAS, categoria } from './config.js';
import { brl, debounce, esc, toast } from './utils.js';
import { excluirPeca, indiceUso, listaPecas, state } from './store.js';
import { abrirModalPeca, confirmar } from './modais.js';

const $ = (sel) => document.querySelector(sel);

const filtros = { busca: '', categoria: '', status: '' };

/** Marca visual reaproveitada por outras telas. */
export function midiaPeca(peca, classe = 'piece__ph') {
  return peca.foto
    ? `<img src="${peca.foto}" alt="${esc(peca.nome)}" loading="lazy">`
    : `<div class="${classe}">${categoria(peca.categoria).icon}</div>`;
}

function aplicarFiltros(pecas, uso) {
  const termo = filtros.busca.toLowerCase();
  return pecas.filter((p) => {
    if (termo && !p.nome.toLowerCase().includes(termo)) return false;
    if (filtros.categoria && p.categoria !== filtros.categoria) return false;
    if (filtros.status === 'uso' && !uso[p.id]) return false;
    if (filtros.status === 'livre' && uso[p.id]) return false;
    return true;
  });
}

function renderStats(pecas, uso) {
  const emUso = pecas.filter((p) => uso[p.id]);
  const livres = pecas.filter((p) => !uso[p.id]);
  const soma = (lista) => lista.reduce((s, p) => s + (Number(p.valor) || 0), 0);

  $('#estoque-stats').innerHTML = `
    <div class="stat"><p class="stat__label">Peças cadastradas</p>
      <div class="stat__value">${pecas.length}</div></div>
    <div class="stat stat--green"><p class="stat__label">Livres em estoque</p>
      <div class="stat__value">${livres.length}</div></div>
    <div class="stat stat--orange"><p class="stat__label">Em uso nas bolsas</p>
      <div class="stat__value">${emUso.length}</div></div>
    <div class="stat stat--blue"><p class="stat__label">Valor total do acervo</p>
      <div class="stat__value">${brl(soma(pecas))}</div></div>`;
}

function cardPeca(peca, uso) {
  const cat = categoria(peca.categoria);
  const alocada = uso[peca.id];
  return `
    <article class="card piece" draggable="true" data-peca="${peca.id}">
      <div class="piece__media">
        ${midiaPeca(peca)}
        <span class="piece__tag">${cat.icon} ${esc(cat.nome)}</span>
        ${alocada ? `<span class="piece__use" title="Na malinha de ${esc(alocada.bolsaNome)}">Com ${esc(alocada.bolsaNome)}</span>` : ''}
      </div>
      <div class="piece__body">
        <div class="piece__name">${esc(peca.nome)}</div>
        <div class="piece__price">${brl(peca.valor)}</div>
      </div>
      <div class="piece__acts">
        <button class="btn btn--neutral btn--sm" data-editar="${peca.id}">Editar</button>
        <button class="link-danger" data-excluir="${peca.id}">Excluir</button>
      </div>
    </article>`;
}

export function renderEstoque() {
  const pecas = listaPecas();
  const uso = indiceUso();
  renderStats(pecas, uso);

  const visiveis = aplicarFiltros(pecas, uso);
  const grid = $('#grid-estoque');
  const vazio = $('#estoque-empty');

  if (!pecas.length) {
    grid.innerHTML = '';
    vazio.hidden = false;
    vazio.querySelector('h3').textContent = 'Nenhuma peça por aqui ainda';
    vazio.querySelector('p').textContent = 'Comece adicionando a primeira roupa do seu estoque.';
    vazio.querySelector('.btn').hidden = false;
    return;
  }
  if (!visiveis.length) {
    grid.innerHTML = '';
    vazio.hidden = false;
    vazio.querySelector('h3').textContent = 'Nada encontrado';
    vazio.querySelector('p').textContent = 'Ajuste a busca ou os filtros para ver outras peças.';
    vazio.querySelector('.btn').hidden = true;
    return;
  }
  vazio.hidden = true;
  grid.innerHTML = visiveis.map((p) => cardPeca(p, uso)).join('');
}

export function iniciarEstoque() {
  // Chips de categoria montados a partir da configuração.
  const chips = $('#filtro-categoria');
  chips.insertAdjacentHTML('beforeend', CATEGORIAS
    .map((c) => `<button class="chip" data-cat="${c.id}">${c.icon} ${esc(c.nome)}</button>`)
    .join(''));

  $('#busca-peca').addEventListener('input', debounce((e) => {
    filtros.busca = e.target.value.trim();
    renderEstoque();
  }, 180));

  document.querySelector('#panel-estoque .toolbar').addEventListener('click', (e) => {
    const btn = e.target.closest('.chip');
    if (!btn) return;
    const grupo = btn.parentElement;
    grupo.querySelectorAll('.chip').forEach((c) => c.classList.remove('is-active'));
    btn.classList.add('is-active');
    if ('cat' in btn.dataset) filtros.categoria = btn.dataset.cat;
    else filtros.status = btn.dataset.status;
    renderEstoque();
  });

  $('#btn-nova-peca').addEventListener('click', () => abrirModalPeca());
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-open-peca]')) abrirModalPeca();
  });

  $('#grid-estoque').addEventListener('click', async (e) => {
    const editar = e.target.closest('[data-editar]');
    if (editar) {
      const id = editar.dataset.editar;
      abrirModalPeca({ id, ...state.pecas[id] });
      return;
    }
    const excluir = e.target.closest('[data-excluir]');
    if (!excluir) return;

    const id = excluir.dataset.excluir;
    const peca = state.pecas[id];
    const alocada = indiceUso()[id];
    const aviso = alocada ? ` Ela será removida da malinha de ${alocada.bolsaNome}.` : '';
    const ok = await confirmar({
      titulo: 'Excluir peça',
      texto: `Excluir "${peca.nome}" do estoque?${aviso} Esta ação não pode ser desfeita.`,
    });
    if (!ok) return;
    try {
      await excluirPeca(id);
      toast('Peça excluída.', 'ok');
    } catch (err) {
      toast(`Falha ao excluir: ${err.message}`, 'err');
    }
  });

  // Arrastar do estoque também funciona: leva a peça para a aba Bolsas.
  $('#grid-estoque').addEventListener('dragstart', (e) => {
    const card = e.target.closest('[data-peca]');
    if (!card) return;
    e.dataTransfer.setData('text/plain', card.dataset.peca);
    e.dataTransfer.effectAllowed = 'copy';
  });
}
