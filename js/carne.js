// Carnê de pagamento: uma ficha destacável por parcela, para entregar junto
// com a malinha.
//
// Os vencimentos não ficam guardados no banco — são contados a partir da data
// em que o parcelamento foi criado, um mês por parcela. Guardar uma data
// escolhida à mão exigiria um campo novo em /financeiro, e com ele uma nova
// publicação das regras; quando essa escolha for necessária, é só acrescentar
// `primeiroVenc` ao plano e às regras.

import { PIX_CHAVE } from './config.js';
import { brl, dataBR, esc } from './utils.js';
import { planoDaBolsa, state } from './store.js';
import { somarMeses } from './impressao.js';

/** Vencimento da parcela `n`: um mês por parcela a partir da criação do plano. */
export function vencimento(plano, n) {
  const d = somarMeses(plano.criadoEm || new Date().toISOString(), n);
  return d ? d.toISOString() : '';
}

function ficha(bolsa, plano, parcela) {
  const venceEm = dataBR(vencimento(plano, parcela.n));
  const rodape = parcela.pago
    ? `<div class="ficha__pago">PAGO${parcela.pagoEm ? ` em ${dataBR(parcela.pagoEm)}` : ''}</div>`
    : '<div class="ficha__assina">Pago em ____ /____ /______</div>';

  return `
    <article class="ficha${parcela.pago ? ' is-paga' : ''}">
      <div class="ficha__canhoto">
        <span class="ficha__num">${parcela.n}<span>/${plano.qtd}</span></span>
        <span class="ficha__marca">Malinha<br><strong>Personalizada</strong></span>
      </div>
      <div class="ficha__corpo">
        <div class="ficha__cliente">${esc(bolsa.nome)}</div>
        <div class="ficha__grade">
          <div><span>Vencimento</span><strong>${venceEm}</strong></div>
          <div><span>Valor</span><strong class="ficha__valor">${brl(parcela.valor)}</strong></div>
        </div>
        <div class="ficha__pix">PIX <strong>${esc(PIX_CHAVE)}</strong></div>
        ${rodape}
      </div>
    </article>`;
}

/** Carnê completo de uma bolsa. Devolve '' se ela não tiver parcelamento. */
export function montarCarne(bolsaId) {
  const bolsa = state.bolsas[bolsaId];
  const plano = planoDaBolsa(bolsaId);
  if (!bolsa || !plano) return '';

  const primeiro = dataBR(vencimento(plano, 1));
  const ultimo = dataBR(vencimento(plano, plano.qtd));

  return `
    <section class="carne">
      <header class="doc__head">
        <span class="doc__marca">Malinha <strong>Personalizada</strong></span>
        <span class="doc__data">Carnê de pagamento</span>
      </header>

      <h1 class="doc__titulo">${esc(bolsa.nome)}</h1>
      <p class="carne__resumo">
        <strong>${plano.qtd}</strong> ${plano.qtd === 1 ? 'parcela' : 'parcelas'} ·
        total <strong>${brl(plano.total)}</strong> ·
        de ${primeiro} a ${ultimo}
      </p>

      <div class="carne__fichas">
        ${plano.parcelas.map((p) => ficha(bolsa, plano, p)).join('')}
      </div>

      <p class="carne__nota">
        Guarde este carnê. A cada pagamento, marque a data na ficha
        correspondente. Dúvidas? É só chamar a gente. 💛
      </p>
    </section>`;
}
