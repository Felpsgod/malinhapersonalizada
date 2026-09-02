// Ponto de entrada: abas, carga inicial e ligação dos módulos de tela.

import { onNetwork } from './db.js';
import { carregar, onChange } from './store.js';
import { toast } from './utils.js';
import { iniciarModais } from './modais.js';
import { iniciarEstoque, renderEstoque } from './estoque.js';
import { iniciarBolsas, renderBolsas } from './bolsas.js';
import { iniciarRelatorios, renderRelatorios } from './relatorios.js';

const $ = (sel) => document.querySelector(sel);

/* --------------------------------- abas ---------------------------------- */

function trocarAba(nome) {
  document.querySelectorAll('.tab').forEach((t) => {
    const ativa = t.dataset.tab === nome;
    t.classList.toggle('is-active', ativa);
    t.setAttribute('aria-selected', String(ativa));
  });
  document.querySelectorAll('.panel').forEach((p) => {
    p.classList.toggle('is-active', p.id === `panel-${nome}`);
  });
  if (location.hash.slice(1) !== nome) history.replaceState(null, '', `#${nome}`);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function iniciarAbas() {
  document.querySelector('.tabs').addEventListener('click', (e) => {
    const tab = e.target.closest('.tab');
    if (tab) trocarAba(tab.dataset.tab);
  });
  document.addEventListener('click', (e) => {
    const link = e.target.closest('[data-tab-link]');
    if (link) { e.preventDefault(); trocarAba(link.dataset.tabLink); }
  });
  const inicial = location.hash.slice(1);
  trocarAba(['estoque', 'bolsas', 'relatorios'].includes(inicial) ? inicial : 'estoque');
}

/* ------------------------------ sincronização ---------------------------- */

function iniciarStatus() {
  const box = $('#sync-status');
  const txt = $('#sync-text');
  const rotulos = { busy: 'salvando…', ok: 'sincronizado', err: 'sem conexão', idle: 'pronto' };
  let voltarParaOk;

  onNetwork((estado, detalhe) => {
    box.dataset.state = estado;
    txt.textContent = rotulos[estado] || estado;
    if (detalhe) box.title = detalhe;
    clearTimeout(voltarParaOk);
    if (estado === 'ok') {
      voltarParaOk = setTimeout(() => { txt.textContent = 'sincronizado'; }, 1200);
    }
  });
}

/* -------------------------------- render --------------------------------- */

function renderTudo() {
  renderEstoque();
  renderBolsas();
  renderRelatorios();
}

async function principal() {
  iniciarStatus();
  iniciarModais();
  iniciarEstoque();
  iniciarBolsas();
  iniciarRelatorios();
  iniciarAbas();

  onChange(renderTudo);

  try {
    await carregar();
  } catch (err) {
    toast(`Não consegui carregar os dados: ${err.message}`, 'err');
    renderTudo();
  }
}

principal();
