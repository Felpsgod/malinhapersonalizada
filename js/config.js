// Configuração central do Malinha Personalizada.

export const FIREBASE_URL =
  'https://malinhapersonalizada-default-rtdb.firebaseio.com';

// Chave da Web API do projeto (Configurações do projeto → Geral → Seus apps).
// Ela NÃO é um segredo: identifica o projeto e vai no código do navegador de
// qualquer jeito. Quem protege os dados são as regras do Realtime Database,
// que só liberam leitura e escrita para UIDs listados em /acesso.
export const FIREBASE_API_KEY = 'COLE_AQUI_A_WEB_API_KEY';

// `z` é a ordem de vestir: define a sequência em que as peças aparecem no look
// e na bolsa — calça (1) < blusa (2) < vestido (3) < casaco (4).
export const CATEGORIAS = [
  { id: 'blusa',     nome: 'Blusa / Top', z: 2, icon: '👚' },
  { id: 'camisa',    nome: 'Camisa',      z: 2, icon: '👔' },
  { id: 'vestido',   nome: 'Vestido',     z: 3, icon: '👗' },
  { id: 'calca',     nome: 'Calça',       z: 1, icon: '👖' },
  { id: 'saia',      nome: 'Saia',        z: 1, icon: '🩳' },
  { id: 'casaco',    nome: 'Casaco',      z: 4, icon: '🧥' },
  { id: 'calcado',   nome: 'Calçado',     z: 5, icon: '👠' },
  { id: 'acessorio', nome: 'Acessório',   z: 6, icon: '👜' },
];
export const CAT_BY_ID = Object.fromEntries(CATEGORIAS.map((c) => [c.id, c]));

export function categoria(id) {
  return CAT_BY_ID[id] || { id: id || 'outro', nome: 'Outro', z: 2, icon: '🧺' };
}

// Tamanho máximo do lado maior da foto salva (px) e qualidade do JPEG.
// As fotos vão em base64 dentro do Realtime Database, então precisam ser leves.
export const FOTO_MAX_LADO = 900;
export const FOTO_QUALIDADE = 0.72;
