// Bolsa em SVG: a malinha desenhada de frente, e as peças que entram nela
// aparecem espetadas para fora da abertura — a parte de baixo some atrás da
// frente da bolsa, dando a leitura de "peça guardada dentro".
//
// Sistema de coordenadas: viewBox 0 0 280 320.

// Silhueta: alça, corpo (do fundo até a boca) e a frente que cobre as peças.
const ALCA = 'M96,118 C96,52 110,32 140,32 C170,32 184,52 184,118';
const CORPO = 'M46,108 H234 L221,278 Q220,286 212,286 H68 Q60,286 59,278 Z';
const FRENTE = 'M49,150 H231 L221,278 Q220,286 212,286 H68 Q60,286 59,278 Z';

// Quantas peças aparecem espetadas antes de virar um "+n".
const MAX_VISIVEIS = 5;

// Cores usadas quando a peça não tem foto cadastrada.
const TINTAS = ['#8668ff', '#0071e3', '#00a1b3', '#ed6300', '#03aa49', '#707070'];

const ITEM_W = 56;
const ITEM_H = 96;

let seq = 0;

/**
 * Posição e giro de cada peça espetada na boca da bolsa. O leque é apertado de
 * propósito: com muitas peças elas se sobrepõem como cartas na mão, em vez de
 * escapar da silhueta da bolsa.
 */
function disposicao(indice, total) {
  const passo = total <= 1 ? 0 : Math.min(38, 112 / (total - 1));
  const desvio = indice - (total - 1) / 2;
  return {
    x: 140 + desvio * passo - ITEM_W / 2,
    y: 76 + Math.abs(desvio) * 5,
    giro: desvio * 4.5,
    cx: 140 + desvio * passo,
  };
}

function pecaSvg(peca, indice, total) {
  const { x, y, giro, cx } = disposicao(indice, total);
  const uid = `pc${(seq += 1)}`;
  const miolo = peca.foto
    ? `<image href="${peca.foto}" x="${x}" y="${y}" width="${ITEM_W}" height="${ITEM_H}"
              preserveAspectRatio="xMidYMid slice" clip-path="url(#${uid})"/>`
    : `<rect x="${x}" y="${y}" width="${ITEM_W}" height="${ITEM_H}" rx="10"
             fill="${TINTAS[indice % TINTAS.length]}" opacity=".9"/>
       <text x="${cx}" y="${y + 34}" text-anchor="middle" font-size="22">${peca.cat.icon}</text>`;

  return `
    <g class="tote__item" transform="rotate(${giro.toFixed(1)} ${cx} ${y + ITEM_H / 2})">
      <defs>
        <clipPath id="${uid}">
          <rect x="${x}" y="${y}" width="${ITEM_W}" height="${ITEM_H}" rx="10"/>
        </clipPath>
      </defs>
      ${miolo}
      <rect x="${x}" y="${y}" width="${ITEM_W}" height="${ITEM_H}" rx="10"
            fill="none" stroke="#1d1d1f" stroke-opacity=".14"/>
    </g>`;
}

/**
 * Monta o SVG da bolsa com as peças dentro.
 * @param {Array} itens peças já ordenadas (menor z primeiro)
 */
export function renderBolsa(itens = []) {
  const visiveis = itens.slice(0, MAX_VISIVEIS);
  const restantes = itens.length - visiveis.length;

  const pecas = visiveis
    .map((peca, i) => pecaSvg(peca, i, visiveis.length))
    .join('');

  const extra = restantes > 0
    ? `<g class="tote__more">
         <rect x="112" y="200" width="56" height="26" rx="13" fill="#1d1d1f" opacity=".82"/>
         <text x="140" y="217" text-anchor="middle" font-size="13"
               font-weight="600" fill="#ffffff">+${restantes}</text>
       </g>`
    : '';

  // Sem peças a boca fica tracejada, sinalizando que ali é o alvo do arrasto.
  const boca = itens.length
    ? `<path d="M49,150 H231" stroke="#d6d6d6" stroke-width="1" fill="none"/>`
    : `<path d="M64,182 H216" stroke="#c7c7cc" stroke-width="2"
             stroke-dasharray="7 7" stroke-linecap="round" fill="none"/>`;

  return `
  <svg viewBox="0 0 280 320" role="img"
       aria-label="Bolsa com ${itens.length} peça(s) dentro">
    <path d="${ALCA}" fill="none" stroke="#c7c7cc" stroke-width="8" stroke-linecap="round"/>
    <path d="${CORPO}" fill="#f0f0f2" stroke="#d6d6d6" stroke-width="1"/>
    ${pecas}
    <path d="${FRENTE}" fill="#ffffff" stroke="#d6d6d6" stroke-width="1"/>
    ${boca}
    ${extra}
  </svg>`;
}
