// Modais de cadastro (peça / bolsa) e confirmação de exclusão.

import { CATEGORIAS, categoria } from './config.js';
import { comprimirImagem, esc, parseValor, toast } from './utils.js';
import { criarPeca, atualizarPeca, criarBolsa, atualizarBolsa } from './store.js';

const $ = (sel, raiz = document) => raiz.querySelector(sel);

let modalAberto = null;

function abrir(el) {
  fechar();
  modalAberto = el;
  el.hidden = false;
  document.body.style.overflow = 'hidden';
  // Foco imediato no primeiro campo de verdade (nunca o input file, que é
  // oculto). Sem setTimeout: um foco atrasado rouba o cursor de quem já
  // começou a digitar.
  $('[data-autofocus], input:not([type="file"]), select, button', el)?.focus();
}

export function fechar() {
  if (modalAberto) modalAberto.hidden = true;
  modalAberto = null;
  document.body.style.overflow = '';
}

/* ------------------------------ modal peça ------------------------------- */

let pecaEditando = null;
let fotoAtual = '';

function preencherCategorias() {
  const sel = $('#peca-categoria');
  if (sel.options.length) return;
  sel.innerHTML = CATEGORIAS
    .map((c) => `<option value="${c.id}">${c.icon} ${esc(c.nome)}</option>`)
    .join('');
}

function setPreview(dataUrl) {
  fotoAtual = dataUrl || '';
  const img = $('#peca-preview');
  const drop = $('#dropfile');
  if (fotoAtual) {
    img.src = fotoAtual;
    img.hidden = false;
    drop.classList.add('has-image');
    $('.dropfile__text strong', drop).textContent = 'Trocar foto';
  } else {
    img.hidden = true;
    img.removeAttribute('src');
    drop.classList.remove('has-image');
    $('.dropfile__text strong', drop).textContent = 'Foto da peça';
  }
}

export function abrirModalPeca(peca = null) {
  preencherCategorias();
  pecaEditando = peca;
  $('#modal-peca-title').textContent = peca ? 'Editar peça' : 'Adicionar peça';
  $('#peca-submit').textContent = peca ? 'Salvar alterações' : 'Salvar peça';
  $('#peca-nome').value = peca?.nome || '';
  $('#peca-valor').value = peca
    ? Number(peca.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '';
  $('#peca-categoria').value = peca ? categoria(peca.categoria).id : 'blusa';
  $('#peca-err').textContent = '';
  $('#peca-foto').value = '';
  setPreview(peca?.foto || '');
  abrir($('#modal-peca'));
}

async function carregarArquivo(file) {
  if (!file) return;
  try {
    setPreview(await comprimirImagem(file));
  } catch (err) {
    $('#peca-err').textContent = err.message;
  }
}

function ligarModalPeca() {
  const drop = $('#dropfile');
  const input = $('#peca-foto');

  drop.addEventListener('click', () => input.click());
  input.addEventListener('change', () => carregarArquivo(input.files[0]));

  ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => {
    e.preventDefault();
    drop.classList.add('is-over');
  }));
  ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => {
    e.preventDefault();
    drop.classList.remove('is-over');
  }));
  drop.addEventListener('drop', (e) => carregarArquivo(e.dataTransfer.files[0]));

  // Ao sair do campo, normaliza o valor para o formato pt-BR: o que aparece
  // na tela é exatamente o que será salvo.
  $('#peca-valor').addEventListener('blur', (e) => {
    const n = parseValor(e.target.value);
    if (Number.isFinite(n) && n >= 0) {
      e.target.value = n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
  });

  $('#form-peca').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('#peca-err');
    const nome = $('#peca-nome').value.trim();
    const valor = parseValor($('#peca-valor').value);
    if (!nome) { err.textContent = 'Informe o nome da peça.'; return; }
    if (!Number.isFinite(valor) || valor < 0) { err.textContent = 'Informe um valor válido.'; return; }

    const btn = $('#peca-submit');
    btn.disabled = true;
    err.textContent = '';
    const dados = { nome, valor, categoria: $('#peca-categoria').value, foto: fotoAtual };
    try {
      if (pecaEditando) {
        await atualizarPeca(pecaEditando.id, dados);
        toast('Peça atualizada.', 'ok');
      } else {
        await criarPeca(dados);
        toast('Peça adicionada ao estoque.', 'ok');
      }
      fechar();
    } catch (e2) {
      err.textContent = `Não consegui salvar: ${e2.message}`;
    } finally {
      btn.disabled = false;
    }
  });
}

/* ------------------------------ modal bolsa ------------------------------ */

let bolsaEditando = null;

export function abrirModalBolsa(bolsa = null) {
  bolsaEditando = bolsa;
  $('#modal-bolsa-title').textContent = bolsa ? 'Editar bolsa' : 'Nova bolsa';
  $('#bolsa-submit').textContent = bolsa ? 'Salvar alterações' : 'Criar bolsa';
  $('#bolsa-nome').value = bolsa?.nome || '';
  $('#bolsa-obs').value = bolsa?.obs || '';
  $('#bolsa-err').textContent = '';
  abrir($('#modal-bolsa'));
}

function ligarModalBolsa() {
  $('#form-bolsa').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('#bolsa-err');
    const nome = $('#bolsa-nome').value.trim();
    if (!nome) { err.textContent = 'Informe o nome da pessoa.'; return; }

    const btn = $('#bolsa-submit');
    btn.disabled = true;
    err.textContent = '';
    try {
      if (bolsaEditando) {
        await atualizarBolsa(bolsaEditando.id, { nome, obs: $('#bolsa-obs').value });
        toast('Bolsa atualizada.', 'ok');
      } else {
        await criarBolsa({ nome, obs: $('#bolsa-obs').value });
        toast(`Malinha de ${nome} criada.`, 'ok');
      }
      fechar();
    } catch (e2) {
      err.textContent = `Não consegui salvar: ${e2.message}`;
    } finally {
      btn.disabled = false;
    }
  });
}

/* ------------------------------ confirmação ------------------------------ */

export function confirmar({ titulo, texto, ok = 'Excluir' }) {
  return new Promise((resolve) => {
    $('#confirm-title').textContent = titulo;
    $('#confirm-text').textContent = texto;
    const modal = $('#modal-confirm');
    const btn = $('#confirm-ok');
    btn.textContent = ok;

    const responder = (valor) => {
      modal.removeEventListener('click', aoClicar);
      document.removeEventListener('keydown', aoTeclar);
      fechar();
      resolve(valor);
    };
    function aoClicar(e) {
      if (e.target === btn) responder(true);
      else if (e.target.closest('[data-close]')) responder(false);
    }
    function aoTeclar(e) {
      if (e.key === 'Escape') responder(false);
    }

    modal.addEventListener('click', aoClicar);
    document.addEventListener('keydown', aoTeclar);
    abrir(modal);
  });
}

/* --------------------------------- init ---------------------------------- */

export function iniciarModais() {
  ligarModalPeca();
  ligarModalBolsa();

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) fechar();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalAberto) fechar();
  });
}
