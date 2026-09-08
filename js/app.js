// Ponto de entrada: portão de acesso, abas, carga inicial e ligação dos
// módulos de tela.

import {
  SENHA_MINIMA, entrar, esqueciSenha, onAuth, restaurar, sair, trocarSenha, usuario,
} from './auth.js';
import { onNetwork } from './db.js';
import { carregar, limpar, marcarSenhaTrocada, onChange, precisaTrocarSenha } from './store.js';
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

async function carregarAcervo(user) {
  try {
    await carregar(user.uid);
    return true;
  } catch (err) {
    toast(`Não consegui carregar os dados: ${err.message}`, 'err');
    renderTudo();
    return false;
  }
}

/* ----------------------------- portão de acesso -------------------------- */

/**
 * Três estados: sem sessão (login), sessão com senha provisória (troca
 * obrigatória) e liberado. Nos dois primeiros o app segue fora da tela — nada
 * do acervo aparece antes da senha ser dela mesma.
 */
function mostrarPortao(cartao) {
  document.body.classList.add('is-locked');
  $('#gate').hidden = false;
  $('#card-login').hidden = cartao !== 'login';
  $('#card-senha').hidden = cartao !== 'senha';
  $(cartao === 'senha' ? '#senha-nova' : '#login-email').focus();
}

function abrirApp() {
  document.body.classList.remove('is-locked');
  $('#gate').hidden = true;
  $('#form-login').reset();
  $('#form-senha').reset();
}

/** Chamado depois de todo login e da sessão restaurada. */
async function aposEntrar(user) {
  $('#conta-email').textContent = user.email || '';
  if (!(await carregarAcervo(user))) { mostrarPortao('login'); return; }
  if (precisaTrocarSenha()) { mostrarPortao('senha'); return; }
  abrirApp();
}

function encerrar(aviso) {
  sair();
  limpar();
  mostrarPortao('login');
  if (aviso) toast(aviso, 'ok');
}

function ligarLogin() {
  $('#form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('#login-err');
    const btn = $('#login-submit');
    err.textContent = '';
    $('#login-ok').textContent = '';
    btn.disabled = true;
    try {
      const user = await entrar($('#login-email').value, $('#login-senha').value);
      await aposEntrar(user);
    } catch (e2) {
      err.textContent = e2.message;
    } finally {
      btn.disabled = false;
    }
  });

  $('#btn-esqueci').addEventListener('click', async () => {
    const err = $('#login-err');
    const ok = $('#login-ok');
    const email = $('#login-email').value.trim();
    err.textContent = '';
    ok.textContent = '';
    if (!email) { err.textContent = 'Escreva seu e-mail acima primeiro.'; return; }
    try {
      await esqueciSenha(email);
      ok.textContent = `Enviamos um link para ${email}. Abra o e-mail para criar uma senha nova.`;
    } catch (e2) {
      err.textContent = e2.message;
    }
  });
}

function ligarTrocaDeSenha() {
  $('#form-senha').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('#senha-err');
    const btn = $('#senha-submit');
    const nova = $('#senha-nova').value;
    err.textContent = '';
    if (nova.length < SENHA_MINIMA) {
      err.textContent = `A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`;
      return;
    }
    if (nova !== $('#senha-repete').value) {
      err.textContent = 'As duas senhas não são iguais.';
      return;
    }
    btn.disabled = true;
    try {
      await trocarSenha(nova);
      await marcarSenhaTrocada(usuario().uid);
      abrirApp();
      toast('Senha alterada.', 'ok');
    } catch (e2) {
      err.textContent = e2.message;
    } finally {
      btn.disabled = false;
    }
  });

  $('#btn-cancelar-senha').addEventListener('click', () => encerrar());
}

function iniciarPortao() {
  // A sessão pode cair sozinha (refresh token revogado); quando isso acontece
  // a tela de login volta sem ninguém precisar clicar em Sair.
  onAuth((user) => { if (!user) mostrarPortao('login'); });
  ligarLogin();
  ligarTrocaDeSenha();
  $('#btn-sair').addEventListener('click', () => encerrar('Você saiu.'));
}

/* --------------------------------- início -------------------------------- */

async function principal() {
  iniciarStatus();
  iniciarModais();
  iniciarEstoque();
  iniciarBolsas();
  iniciarRelatorios();
  iniciarAbas();
  iniciarPortao();

  onChange(renderTudo);

  // Sessão da visita anterior: se o refresh token ainda valer, entra direto.
  try {
    await restaurar();
  } catch {
    // Sem rede na abertura: cai na tela de login, que tenta de novo.
  }
  const user = usuario();
  if (user) await aposEntrar(user);
}

principal();
