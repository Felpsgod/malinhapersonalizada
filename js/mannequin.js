// Manequim em SVG: cada categoria de peça tem uma região (slot) recortada.
// Ao arrastar uma roupa para a bolsa, a foto dela é aplicada dentro do
// recorte correspondente — o manequim "veste" a peça.

// Sistema de coordenadas: viewBox 0 0 200 430.
const SLOTS = {
  // Acessório vira uma bolsinha ao lado do corpo — não cobre o look.
  acessorio: {
    box: [4, 190, 52, 70],
    clip: 'M16,206 a14,14 0 0 1 28,0 l-6,0 a8,8 0 0 0 -16,0 z '
        + 'M6,208 h48 v42 a8,8 0 0 1 -8,8 h-32 a8,8 0 0 1 -8,-8 z',
  },
  topo: {
    box: [45, 71, 110, 115],
    clip: 'M62,84 C62,77 70,72 80,71 L120,71 C130,72 138,77 138,84 L150,88 L155,138 L141,142 L136,108 L133,186 L67,186 L64,108 L59,142 L45,138 L50,88 Z',
  },
  baixo: {
    box: [67, 187, 66, 151],
    clip: 'M67,187 L133,187 L130,290 L127,338 L107,338 L100,250 L93,338 L73,338 L70,290 Z',
  },
  vestido: {
    box: [45, 71, 110, 225],
    clip: 'M62,84 C62,77 70,72 80,71 L120,71 C130,72 138,77 138,84 L150,88 L155,138 L141,142 L136,108 L146,296 L54,296 L64,108 L59,142 L45,138 L50,88 Z',
  },
  casaco: {
    box: [40, 68, 120, 164],
    clip: 'M60,82 C60,74 69,69 79,68 L121,68 C131,69 140,74 140,82 L153,88 L160,196 L142,200 L136,120 L135,232 L65,232 L64,120 L58,200 L40,196 L47,88 Z',
  },
  calcado: {
    box: [69, 350, 62, 53],
    clip: 'M71,350 L97,350 L97,390 C97,398 91,403 84,403 C76,403 69,398 69,390 Z M103,350 L129,350 L131,390 C131,398 124,403 116,403 C109,403 103,398 103,390 Z',
  },
};

// Cores usadas quando a peça não tem foto cadastrada.
const TINTAS = ['#8668ff', '#0071e3', '#00a1b3', '#ed6300', '#03aa49', '#707070'];

const CORPO = `
  <g fill="#e2e2e5" stroke="#d6d6d6" stroke-width="1">
    <circle cx="100" cy="40" r="23"/>
    <rect x="91" y="56" width="18" height="20" rx="6"/>
    <path d="M62,84 C62,77 70,72 80,71 L120,71 C130,72 138,77 138,84 L134,146 L131,208 L69,208 L66,146 Z"/>
    <path d="M63,82 L50,88 L43,150 L41,198 L55,200 L60,150 L67,100 Z"/>
    <path d="M137,82 L150,88 L157,150 L159,198 L145,200 L140,150 L133,100 Z"/>
    <path d="M69,206 L99,206 L97,300 L93,392 L74,392 L73,300 Z"/>
    <path d="M101,206 L131,206 L127,300 L126,392 L107,392 L103,300 Z"/>
    <ellipse cx="83" cy="396" rx="12" ry="7"/>
    <ellipse cx="116" cy="396" rx="12" ry="7"/>
  </g>`;

let seq = 0;

/**
 * Monta o SVG do manequim vestido.
 * @param {Array} itens peças já ordenadas pela ordem de vestir (menor z primeiro)
 */
export function renderManequim(itens = []) {
  const defs = [];
  const camadas = [];

  itens.forEach((peca, i) => {
    const slot = SLOTS[peca.cat.slot] || SLOTS.topo;
    const uid = `sl${(seq += 1)}`;
    const [x, y, w, h] = slot.box;

    defs.push(`<clipPath id="${uid}"><path d="${slot.clip}"/></clipPath>`);

    const preenchimento = peca.foto
      ? `<image href="${peca.foto}" x="${x}" y="${y}" width="${w}" height="${h}"
                preserveAspectRatio="xMidYMid slice"/>`
      : `<path d="${slot.clip}" fill="${TINTAS[i % TINTAS.length]}" opacity=".85"/>`;

    camadas.push(`
      <g class="garment" clip-path="url(#${uid})">${preenchimento}</g>
      <path d="${slot.clip}" fill="none" stroke="#1d1d1f" stroke-opacity=".16" stroke-width="1"/>`);
  });

  return `
  <svg viewBox="0 0 200 430" role="img"
       aria-label="Manequim com ${itens.length} peça(s) do look">
    <defs>${defs.join('')}</defs>
    ${CORPO}
    ${camadas.join('')}
  </svg>`;
}
