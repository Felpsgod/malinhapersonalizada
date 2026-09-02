// Aba Relatórios: o que está em uso (e com quem) x o que está livre no estoque.

import { categoria } from './config.js';
import { baixarCSV, brl, dataBR, esc } from './utils.js';
import { indiceUso, itensDaBolsa, listaBolsas, listaPecas, valorDaBolsa } from './store.js';
import { midiaPeca } from './estoque.js';

const $ = (sel) => document.querySelector(sel);

const soma = (lista) => lista.reduce((s, p) => s + (Number(p.valor) || 0), 0);

function separar() {
  const uso = indiceUso();
  const pecas = listaPecas();
  return {
    uso,
    pecas,
    emUso: pecas.filter((p) => uso[p.id]),
    livres: pecas.filter((p) => !uso[p.id]),
  };
}

function celulaPeca(peca) {
  const cat = categoria(peca.categoria);
  const media = peca.foto
    ? `<img src="${peca.foto}" alt="">`
    : `<div class="ph">${cat.icon}</div>`;
  return `<div class="cell-piece">${media}<span>${esc(peca.nome)}</span></div>`;
}

function linhaVazia(colspan, texto) {
  return `<tr class="empty-row"><td colspan="${colspan}">${texto}</td></tr>`;
}

export function renderRelatorios() {
  const { pecas, emUso, livres, uso } = separar();
  const bolsas = listaBolsas();

  const total = pecas.length;
  const pct = total ? Math.round((emUso.length / total) * 100) : 0;

  $('#rel-stats').innerHTML = `
    <div class="stat"><p class="stat__label">Acervo total</p>
      <div class="stat__value">${total}</div></div>
    <div class="stat stat--orange"><p class="stat__label">Em uso (${pct}%)</p>
      <div class="stat__value">${emUso.length}</div></div>
    <div class="stat stat--green"><p class="stat__label">Livre em estoque</p>
      <div class="stat__value">${livres.length}</div></div>
    <div class="stat stat--violet"><p class="stat__label">Bolsas ativas</p>
      <div class="stat__value">${bolsas.length}</div></div>
    <div class="stat stat--blue"><p class="stat__label">Valor em circulação</p>
      <div class="stat__value">${brl(soma(emUso))}</div></div>
    <div class="stat"><p class="stat__label">Valor parado</p>
      <div class="stat__value">${brl(soma(livres))}</div></div>`;

  $('#rel-uso-count').textContent = emUso.length;
  $('#rel-livre-count').textContent = livres.length;

  $('#tbl-uso tbody').innerHTML = emUso.length
    ? emUso.map((p) => `
        <tr>
          <td>${celulaPeca(p)}</td>
          <td><span class="pill-cat">${categoria(p.categoria).nome}</span></td>
          <td>${esc(uso[p.id].bolsaNome)}</td>
          <td class="ta-r">${brl(p.valor)}</td>
        </tr>`).join('')
    : linhaVazia(4, 'Nenhuma peça em uso no momento.');

  $('#tbl-livre tbody').innerHTML = livres.length
    ? livres.map((p) => `
        <tr>
          <td>${celulaPeca(p)}</td>
          <td><span class="pill-cat">${categoria(p.categoria).nome}</span></td>
          <td class="ta-r">${brl(p.valor)}</td>
        </tr>`).join('')
    : linhaVazia(3, 'Todo o estoque está alocado em bolsas.');

  $('#tbl-bolsas tbody').innerHTML = bolsas.length
    ? bolsas.map((b) => `
        <tr>
          <td><strong>${esc(b.nome)}</strong>${b.obs ? `<br><span class="muted">${esc(b.obs)}</span>` : ''}</td>
          <td class="ta-r">${itensDaBolsa(b.id).length}</td>
          <td class="ta-r">${brl(valorDaBolsa(b.id))}</td>
          <td>${dataBR(b.criadoEm)}</td>
        </tr>`).join('')
    : linhaVazia(4, 'Nenhuma bolsa criada ainda.');
}

export function iniciarRelatorios() {
  $('#btn-exportar').addEventListener('click', () => {
    const { pecas, uso } = separar();
    const linhas = [['Peça', 'Categoria', 'Valor', 'Situação', 'Bolsa']];
    pecas.forEach((p) => {
      const alocada = uso[p.id];
      linhas.push([
        p.nome,
        categoria(p.categoria).nome,
        Number(p.valor || 0).toFixed(2).replace('.', ','),
        alocada ? 'Em uso' : 'Livre',
        alocada ? alocada.bolsaNome : '',
      ]);
    });
    const hoje = new Date().toISOString().slice(0, 10);
    baixarCSV(`malinha-relatorio-${hoje}.csv`, linhas);
  });
}
