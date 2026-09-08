// Utilitários gerais: formatação, imagens e feedback visual.

import { FOTO_MAX_LADO, FOTO_QUALIDADE } from './config.js';

const fmtBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function brl(valor) {
  return fmtBRL.format(Number(valor) || 0);
}

/** Aceita "1.234,56", "1234,56", "1234.56" e "1234". */
export function parseValor(texto) {
  if (typeof texto === 'number') return texto;
  const limpo = String(texto || '').trim().replace(/[^\d,.-]/g, '');
  if (!limpo) return NaN;
  // Se tem vírgula, ela é o separador decimal (padrão pt-BR).
  const normalizado = limpo.includes(',')
    ? limpo.replace(/\./g, '').replace(',', '.')
    : limpo;
  return Number(normalizado);
}

export function esc(texto) {
  return String(texto ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

export function dataBR(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR');
}

export function debounce(fn, ms = 200) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

/**
 * Lê um File de imagem, reduz para no máximo FOTO_MAX_LADO e devolve um
 * data URL JPEG — pequeno o bastante para viver dentro do Realtime Database.
 */
export function comprimirImagem(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('Selecione um arquivo de imagem.'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Não consegui ler o arquivo.'));
    reader.onload = () => {
      const img = new Image();
      // HEIC é o caso comum: é o padrão da câmera do iPhone e o navegador não
      // decodifica, então o erro precisa dizer o que fazer.
      img.onerror = () => reject(new Error(
        'Não consegui abrir esta imagem. Formatos como HEIC (foto de iPhone) não '
        + 'são aceitos — envie em JPEG ou PNG.',
      ));
      img.onload = () => {
        const escala = Math.min(1, FOTO_MAX_LADO / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * escala));
        const h = Math.max(1, Math.round(img.height * escala));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff'; // achata PNGs transparentes sobre branco
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', FOTO_QUALIDADE));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

const MAX_TOASTS = 3;

export function toast(mensagem, tipo = '') {
  const wrap = document.getElementById('toasts');
  if (!wrap) return;
  const el = document.createElement('div');
  el.className = `toast${tipo ? ` toast--${tipo}` : ''}`;
  el.textContent = mensagem;
  wrap.appendChild(el);
  // Mantém a pilha curta: em sequências rápidas os avisos antigos saem.
  while (wrap.children.length > MAX_TOASTS) wrap.firstElementChild.remove();
  setTimeout(() => el.remove(), 3200);
}

/** Baixa um CSV com BOM para o Excel abrir com acentos corretos. */
export function baixarCSV(nomeArquivo, linhas) {
  const csv = linhas
    .map((linha) => linha.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';'))
    .join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nomeArquivo;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
