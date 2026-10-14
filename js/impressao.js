// Caixa única de impressão. Quem quer imprimir monta o HTML e chama `imprimir`
// — a folha é escrita no container e a caixa do navegador abre em seguida.
//
// O container vive fora da tela (`#impressao { display: none }`) e só aparece
// dentro do `@media print`.

export function imprimir(html) {
  const caixa = document.getElementById('impressao');
  if (!caixa || !html) return;
  caixa.innerHTML = html;
  window.print();
}

/**
 * Mesmo dia do mês, `meses` à frente. Encurta para o último dia quando o mês
 * de destino é mais curto — 31/01 + 1 mês vira 28/02, não 03/03.
 */
export function somarMeses(iso, meses) {
  const base = new Date(iso);
  if (Number.isNaN(base.getTime())) return null;
  const dia = base.getDate();
  const alvo = new Date(base.getFullYear(), base.getMonth() + meses, 1);
  const ultimoDoMes = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0).getDate();
  alvo.setDate(Math.min(dia, ultimoDoMes));
  return alvo;
}
