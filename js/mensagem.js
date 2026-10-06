// Mensagem de entrega para a cliente: lista as peças da malinha dela e fecha
// com as formas de pagamento. Sai em texto puro, para ir no WhatsApp.
//
// A mensagem nunca mostra o custo das peças — só o preço de venda. É texto que
// vai para fora da loja.

import { PIX_CHAVE, categoria, parcelasOferecidas } from './config.js';
import { brl, toast } from './utils.js';
import { itensDaBolsa, listaBolsas, state, totaisDaBolsa } from './store.js';

const $ = (sel) => document.querySelector(sel);

/** Bolsa escolhida no seletor. Guardada para a lista poder ser remontada. */
let bolsaEscolhida = null;

function linhaPeca(peca, i) {
  const cat = categoria(peca.categoria);
  const tamanho = peca.tamanho ? ` · Tam. ${peca.tamanho}` : '';
  return `${i + 1}. ${peca.nome} — ${cat.nome}${tamanho} — ${brl(peca.venda)}`;
}

export function montarMensagem(bolsaId) {
  const bolsa = state.bolsas[bolsaId];
  if (!bolsa) return '';

  const itens = itensDaBolsa(bolsaId);
  const total = totaisDaBolsa(bolsaId).venda;
  const vezes = parcelasOferecidas(total);

  const pecas = itens.length
    ? itens.map(linhaPeca).join('\n')
    : '(nenhuma peça nesta malinha ainda)';

  return [
    `💕 Sua Malinha Personalizada chegou! Segue abaixo uma descrição das peças que estamos lhe enviando.`,
    '',
    'Esperamos que você aproveite cada peça e viva essa experiência com leveza e '
      + 'carinho. Nossa seleção foi pensada especialmente para você, para facilitar '
      + 'suas escolhas e trazer novas possibilidades para o seu guarda-roupa. ✨',
    '',
    `👗 Suas peças (${itens.length})`,
    pecas,
    '',
    `Total da malinha: ${brl(total)}`,
    `Pode ser dividido em até ${vezes}x de ${brl(total / vezes)}.`,
    '',
    'Formas de pagamento:',
    '• Até R$ 500,00 → em até 3x',
    '• Acima de R$ 500,00 → em até 5x',
    '💳 Prefere pagar no cartão? É só nos solicitar o link.',
    `💛 PIX: ${PIX_CHAVE}`,
    '',
    'Obrigada por confiar na Malinha Personalizada. Esperamos que você ame suas escolhas! ✨',
  ].join('\n');
}

/* --------------------------------- tela ---------------------------------- */

function gerar() {
  $('#msg-texto').value = bolsaEscolhida ? montarMensagem(bolsaEscolhida) : '';
}

export function renderMensagem() {
  const bolsas = listaBolsas();
  const sel = $('#msg-bolsa');
  const vazio = $('#msg-vazio');
  const corpo = $('#msg-corpo');

  vazio.hidden = bolsas.length > 0;
  corpo.hidden = bolsas.length === 0;
  if (!bolsas.length) { bolsaEscolhida = null; return; }

  if (!bolsas.some((b) => b.id === bolsaEscolhida)) bolsaEscolhida = bolsas[0].id;
  sel.innerHTML = bolsas
    .map((b) => `<option value="${b.id}"${b.id === bolsaEscolhida ? ' selected' : ''}>${b.nome}</option>`)
    .join('');

  // Só reescreve o texto se a pessoa ainda não mexeu nele — quem ajustou a
  // mensagem à mão não perde o ajuste porque o estoque mudou em outra aba.
  if (!$('#msg-texto').dataset.editado) gerar();
}

async function copiar() {
  const texto = $('#msg-texto').value;
  try {
    await navigator.clipboard.writeText(texto);
    toast('Mensagem copiada.', 'ok');
  } catch {
    // Área de transferência bloqueada (http, permissão negada): seleciona o
    // texto para a pessoa copiar com as próprias mãos.
    $('#msg-texto').select();
    toast('Não consegui copiar sozinho — o texto está selecionado.', 'err');
  }
}

export function iniciarMensagem() {
  const texto = $('#msg-texto');

  $('#msg-bolsa').addEventListener('change', (e) => {
    bolsaEscolhida = e.target.value;
    delete texto.dataset.editado;
    gerar();
  });

  texto.addEventListener('input', () => { texto.dataset.editado = '1'; });

  $('#msg-refazer').addEventListener('click', () => {
    delete texto.dataset.editado;
    gerar();
    toast('Mensagem refeita a partir da malinha.', 'ok');
  });

  $('#msg-copiar').addEventListener('click', copiar);

  $('#msg-whats').addEventListener('click', () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(texto.value)}`, '_blank', 'noopener');
  });
}
