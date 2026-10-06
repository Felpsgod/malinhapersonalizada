// Mensagem de entrega para a cliente: lista as peças da malinha dela e fecha
// com as formas de pagamento. Sai em texto puro, para ir no WhatsApp.
//
// A mensagem nunca mostra o custo das peças — só o preço de venda. É texto que
// vai para fora da loja.

import { PIX_CHAVE, categoria, parcelasOferecidas } from './config.js';
import { brl, dataBR, esc, toast } from './utils.js';
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
    `💕 Oi, ${bolsa.nome}! Sua Malinha Personalizada chegou! Segue abaixo uma `
      + 'descrição das peças que estamos lhe enviando.',
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

/* ------------------------------- impressão -------------------------------- */

function linhaImpressa(peca, i) {
  const cat = categoria(peca.categoria);
  const miniatura = peca.foto
    ? `<img src="${peca.foto}" alt="">`
    : `<span class="doc__ph">${cat.icon}</span>`;
  return `
    <tr>
      <td class="doc__n">${i + 1}</td>
      <td class="doc__foto">${miniatura}</td>
      <td class="doc__peca">${esc(peca.nome)}</td>
      <td>${esc(cat.nome)}</td>
      <td>${peca.tamanho ? esc(peca.tamanho) : '—'}</td>
      <td class="ta-r">${brl(peca.venda)}</td>
    </tr>`;
}

/** Folha A4 da malinha, usada pelo botão Imprimir / PDF. */
export function montarImpressao(bolsaId) {
  const bolsa = state.bolsas[bolsaId];
  if (!bolsa) return '';

  const itens = itensDaBolsa(bolsaId);
  const total = totaisDaBolsa(bolsaId).venda;
  const vezes = parcelasOferecidas(total);

  return `
    <article class="doc">
      <header class="doc__head">
        <span class="doc__marca">Malinha <strong>Personalizada</strong></span>
        <span class="doc__data">${dataBR(new Date().toISOString())}</span>
      </header>

      <h1 class="doc__titulo">Malinha de ${esc(bolsa.nome)}</h1>
      <p class="doc__abertura">
        💕 Oi, ${esc(bolsa.nome)}! Sua Malinha Personalizada chegou! Segue abaixo
        uma descrição das peças que estamos lhe enviando.
      </p>
      <p>
        Esperamos que você aproveite cada peça e viva essa experiência com leveza
        e carinho. Nossa seleção foi pensada especialmente para você, para
        facilitar suas escolhas e trazer novas possibilidades para o seu
        guarda-roupa. ✨
      </p>

      <table class="doc__tabela">
        <thead>
          <tr><th></th><th></th><th>Peça</th><th>Categoria</th><th>Tam.</th><th class="ta-r">Valor</th></tr>
        </thead>
        <tbody>
          ${itens.length
            ? itens.map(linhaImpressa).join('')
            : '<tr><td colspan="6" class="doc__vazio">Nenhuma peça nesta malinha.</td></tr>'}
        </tbody>
        <tfoot>
          <tr><td colspan="5">Total da malinha · ${itens.length} ${itens.length === 1 ? 'peça' : 'peças'}</td>
            <td class="ta-r">${brl(total)}</td></tr>
        </tfoot>
      </table>

      <p class="doc__parcela">Pode ser dividido em até <strong>${vezes}x de ${brl(total / vezes)}</strong>.</p>

      <section class="doc__pag">
        <h2>Formas de pagamento</h2>
        <ul>
          <li>Até R$ 500,00 → em até 3x</li>
          <li>Acima de R$ 500,00 → em até 5x</li>
          <li>💳 Prefere pagar no cartão? É só nos solicitar o link.</li>
          <li>💛 PIX: <strong>${esc(PIX_CHAVE)}</strong></li>
        </ul>
      </section>

      <p class="doc__fecho">
        Obrigada por confiar na Malinha Personalizada. Esperamos que você ame
        suas escolhas! ✨
      </p>
    </article>`;
}

/* --------------------------------- tela ---------------------------------- */

function gerar() {
  $('#msg-texto').value = bolsaEscolhida ? montarMensagem(bolsaEscolhida) : '';
  // A folha de impressão é sempre a versão estruturada da malinha escolhida —
  // ela não acompanha o que for editado à mão na caixa de texto, que é o
  // formato de WhatsApp.
  $('#impressao').innerHTML = bolsaEscolhida ? montarImpressao(bolsaEscolhida) : '';
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
  if ($('#msg-texto').dataset.editado) {
    // Mesmo com o texto editado, a folha segue o estado atual da malinha.
    $('#impressao').innerHTML = montarImpressao(bolsaEscolhida);
  } else {
    gerar();
  }
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

  // Sem biblioteca de PDF: a própria caixa de impressão do navegador tem
  // "Salvar como PDF", e no celular sai pelo compartilhamento.
  $('#msg-imprimir').addEventListener('click', () => window.print());

  $('#msg-whats').addEventListener('click', () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(texto.value)}`, '_blank', 'noopener');
  });
}
