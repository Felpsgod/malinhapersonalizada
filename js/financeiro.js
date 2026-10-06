// Aba Financeiro: cada bolsa é uma conta a receber, dividida em parcelas.
//
// O total vem sozinho do valor de venda das peças que estão na bolsa. O número
// de parcelas é digitado. Cada parcela tem o valor editável e um botão PAGO —
// e a última se ajusta sozinha para fechar o total (ver `planoDaBolsa`).

import { brl, dataBR, esc, parseValor, toast } from './utils.js';
import {
  MAX_PARCELAS, criarPlano, definirValorParcela, listaFinanceiro, marcarParcela,
  planoDaBolsa, removerPlano,
} from './store.js';
import { confirmar } from './modais.js';

const $ = (sel) => document.querySelector(sel);

const dinheiro = (n) => Number(n || 0)
  .toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* --------------------------------- topo ---------------------------------- */

function renderStats(contas) {
  const total = contas.reduce((s, c) => s + c.total, 0);
  const recebido = contas.reduce((s, c) => s + (c.plano?.recebido || 0), 0);
  const quitadas = contas.filter((c) => c.plano?.quitado).length;
  const semPlano = contas.filter((c) => !c.plano).length;

  $('#fin-stats').innerHTML = `
    <div class="stat stat--blue"><p class="stat__label">Total das bolsas</p>
      <div class="stat__value">${brl(total)}</div></div>
    <div class="stat stat--green"><p class="stat__label">Recebido</p>
      <div class="stat__value">${brl(recebido)}</div></div>
    <div class="stat stat--orange"><p class="stat__label">Em aberto</p>
      <div class="stat__value">${brl(Math.max(0, total - recebido))}</div></div>
    <div class="stat"><p class="stat__label">Bolsas quitadas</p>
      <div class="stat__value">${quitadas} <span class="stat__de">de ${contas.length}</span></div></div>
    <div class="stat stat--violet"><p class="stat__label">Sem parcelamento</p>
      <div class="stat__value">${semPlano}</div></div>`;
}

/* ------------------------------- parcelas -------------------------------- */

function linhaParcela(bolsaId, p) {
  const marcado = p.pago ? ' is-pago' : '';
  return `
    <tr class="parc${marcado}">
      <td class="parc__n">${p.n}ª${p.ultima && p.n > 1 ? ' <span class="parc__tag">última</span>' : ''}</td>
      <td class="parc__campo">
        <span class="parc__moeda">R$</span>
        <input class="parc__input" inputmode="decimal" value="${dinheiro(p.valor)}"
               data-bolsa="${bolsaId}" data-parcela="${p.n}"
               ${p.ultima ? 'disabled title="A última fecha o total — ela se ajusta sozinha"' : ''}>
      </td>
      <td class="parc__data">${p.pago ? dataBR(p.pagoEm) : '<span class="muted">—</span>'}</td>
      <td class="ta-r">
        <button class="btn-pago${marcado}" data-pagar="${p.n}" data-bolsa="${bolsaId}">
          ${p.pago ? 'PAGO' : 'Marcar PAGO'}
        </button>
      </td>
    </tr>`;
}

function blocoPlano(bolsaId, plano) {
  const pct = plano.total > 0 ? Math.min(100, (plano.recebido / plano.total) * 100) : 0;
  return `
    <div class="conta__barra"><span style="width:${pct.toFixed(1)}%"></span></div>
    <div class="conta__resumo">
      <span>Recebido <strong>${brl(plano.recebido)}</strong></span>
      <span>Em aberto <strong>${brl(plano.aberto)}</strong></span>
      <span>${plano.qtd}× de ${brl(plano.total / plano.qtd)} <span class="muted">(previsto)</span></span>
    </div>
    <div class="table-wrap">
      <table class="table table--parcelas">
        <thead><tr><th>Parcela</th><th>Valor</th><th>Pago em</th><th class="ta-r">Situação</th></tr></thead>
        <tbody>${plano.parcelas.map((p) => linhaParcela(bolsaId, p)).join('')}</tbody>
      </table>
    </div>`;
}

/* --------------------------------- conta --------------------------------- */

function cartaoConta({ bolsa, total, plano }) {
  const selo = !plano
    ? '<span class="selo selo--cinza">Sem parcelamento</span>'
    : plano.quitado
      ? '<span class="selo selo--verde">Quitada</span>'
      : '<span class="selo selo--laranja">Em aberto</span>';

  const controle = `
    <div class="conta__parcelar">
      <label for="qtd-${bolsa.id}">Parcelar em</label>
      <input id="qtd-${bolsa.id}" class="conta__qtd" type="number" min="1" max="${MAX_PARCELAS}"
             value="${plano ? plano.qtd : 1}" data-qtd="${bolsa.id}">
      <span>×</span>
      <button class="btn btn--neutral btn--sm" data-gerar="${bolsa.id}">
        ${plano ? 'Refazer' : 'Gerar parcelas'}
      </button>
      ${plano ? `<button class="link-danger" data-remover-plano="${bolsa.id}">Remover</button>` : ''}
    </div>`;

  return `
    <article class="card conta" data-conta="${bolsa.id}">
      <div class="conta__head">
        <div>
          <h3 class="h-xs">${esc(bolsa.nome)} ${selo}</h3>
          <p class="muted">${bolsa.obs ? `${esc(bolsa.obs)} · ` : ''}total da bolsa <strong>${brl(total)}</strong></p>
        </div>
        ${controle}
      </div>
      ${plano ? blocoPlano(bolsa.id, plano) : `
        <p class="conta__vazio">Defina em quantas vezes esta bolsa será paga para gerar as parcelas.</p>`}
    </article>`;
}

export function renderFinanceiro() {
  const contas = listaFinanceiro();
  renderStats(contas);

  const lista = $('#fin-list');
  const vazio = $('#fin-empty');
  if (!contas.length) {
    lista.innerHTML = '';
    vazio.hidden = false;
    return;
  }
  vazio.hidden = true;
  lista.innerHTML = contas.map(cartaoConta).join('');
}

/* --------------------------------- init ---------------------------------- */

export function iniciarFinanceiro() {
  const lista = $('#fin-list');

  lista.addEventListener('click', async (e) => {
    const gerar = e.target.closest('[data-gerar]');
    if (gerar) {
      const id = gerar.dataset.gerar;
      const qtd = Number($(`[data-qtd="${id}"]`).value) || 1;
      // Refazer joga fora as marcações de pago: melhor avisar antes.
      if (planoDaBolsa(id)) {
        const ok = await confirmar({
          titulo: 'Refazer parcelamento',
          texto: `As parcelas atuais serão substituídas por ${qtd}×, e o que estava marcado como pago volta a ficar em aberto.`,
          ok: 'Refazer',
        });
        if (!ok) return;
      }
      try {
        await criarPlano(id, qtd);
        toast(`Parcelamento em ${qtd}× criado.`, 'ok');
      } catch (err) {
        toast(`Não consegui gerar: ${err.message}`, 'err');
      }
      return;
    }

    const remover = e.target.closest('[data-remover-plano]');
    if (remover) {
      const id = remover.dataset.removerPlano;
      const ok = await confirmar({
        titulo: 'Remover parcelamento',
        texto: 'A bolsa volta a ficar sem parcelas. O histórico de pagamentos é perdido.',
      });
      if (!ok) return;
      try {
        await removerPlano(id);
        toast('Parcelamento removido.', 'ok');
      } catch (err) {
        toast(`Não consegui remover: ${err.message}`, 'err');
      }
      return;
    }

    const pagar = e.target.closest('[data-pagar]');
    if (!pagar) return;
    const id = pagar.dataset.bolsa;
    const n = Number(pagar.dataset.pagar);
    const atual = planoDaBolsa(id)?.parcelas.find((p) => p.n === n);
    try {
      await marcarParcela(id, n, !atual?.pago);
    } catch (err) {
      toast(`Não consegui salvar: ${err.message}`, 'err');
    }
  });

  // `change` e não `input`: só grava quando a pessoa termina de digitar.
  lista.addEventListener('change', async (e) => {
    const campo = e.target.closest('[data-parcela]');
    if (!campo) return;
    const valor = parseValor(campo.value);
    if (!Number.isFinite(valor) || valor < 0) {
      toast('Valor inválido para a parcela.', 'err');
      renderFinanceiro();
      return;
    }
    try {
      await definirValorParcela(campo.dataset.bolsa, Number(campo.dataset.parcela), valor);
    } catch (err) {
      toast(`Não consegui salvar: ${err.message}`, 'err');
    }
  });
}
