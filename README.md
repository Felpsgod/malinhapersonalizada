# Malinha Personalizada

Sistema de controle de roupas: estoque com foto, montagem de malinhas por pessoa
(arrastando as peças para vestir um manequim) e relatórios de uso.

Site estático — HTML, CSS e JavaScript puro com ES modules. **Sem build, sem
dependências, sem npm.** Basta publicar a pasta.

## Como funciona

| Aba | O que faz |
| --- | --- |
| **Estoque** | Cadastro de peças com foto, nome, valor e categoria. Busca, filtros por categoria e por situação (livre / em uso), editar e excluir. |
| **Bolsas** | Uma malinha por pessoa. Arraste peças do estoque para o manequim (ou para o cartão da bolsa na lista lateral) e o look vai se montando, com nome e valor de cada peça ao lado e o total embaixo. Editar e excluir bolsa. |
| **Relatórios** | O que está em uso e com quem, o que continua livre, valor em circulação x valor parado, resumo por bolsa e exportação em CSV. |

**Regra central:** uma peça só pode estar em uma bolsa por vez. É isso que torna
o relatório de "em uso x livre" confiável — a peça alocada aparece marcada no
estoque com o nome da pessoa e não pode ser colocada em outra malinha.

O manequim é um SVG com regiões recortadas por categoria (topo, baixo, vestido,
casaco, calçado e acessório). A foto da peça é aplicada dentro do recorte
correspondente, respeitando a ordem de vestir (calça por baixo da blusa, casaco
por cima de tudo).

## Dados

Tudo é salvo no Firebase Realtime Database via API REST — sem SDK e sem chave de
API no cliente:

```
https://malinhapersonalizada-default-rtdb.firebaseio.com
```

Estrutura:

```jsonc
{
  "pecas": {
    "-Nxxxx": {
      "nome": "Blusa de linho off-white",
      "valor": 189.9,
      "categoria": "blusa",
      "foto": "data:image/jpeg;base64,...",  // reduzida para 900px / qualidade 0.72
      "criadoEm": "2026-09-02T12:00:00.000Z"
    }
  },
  "bolsas": {
    "-Nyyyy": {
      "nome": "Marina Ribeiro",
      "obs": "entrega quinta · tam M",
      "criadoEm": "2026-09-02T12:00:00.000Z",
      "itens": { "-Nxxxx": true }
    }
  }
}
```

As fotos são comprimidas no navegador antes de subir (redimensionadas para no
máximo 900px no lado maior e convertidas em JPEG), então cabem tranquilamente
como base64 dentro do Realtime Database.

### Regras do banco

O arquivo [`firebase-rules.json`](firebase-rules.json) traz regras com validação
de formato. **O banco está hoje com leitura e escrita públicas** — qualquer
pessoa com o link consegue ler e alterar os dados. Para uso real, vale ativar
autenticação no Firebase e trocar `.read`/`.write` por uma checagem de usuário.

## Rodar localmente

Os ES modules exigem um servidor HTTP (abrir o `index.html` direto pelo
`file://` não funciona):

```powershell
cd C:\Users\Felipe\projetos\malinhapersonalizada
npx serve .        # ou: python -m http.server 8000
```

## Publicar no GitHub Pages

```powershell
git remote add origin https://github.com/<seu-usuario>/malinhapersonalizada.git
git branch -M main
git push -u origin main
```

Depois, em **Settings → Pages**, escolha *Deploy from a branch* → `main` → `/ (root)`.

O arquivo `.nojekyll` já está no repositório para o Pages servir a pasta `js/`
sem processamento do Jekyll.

## Estrutura

```
index.html            marcação das três abas e dos modais
css/styles.css        design tokens e componentes
js/config.js          URL do Firebase e catálogo de categorias
js/db.js              cliente REST do Realtime Database
js/store.js           estado + operações que persistem
js/utils.js           formatação BRL, compressão de imagem, toasts, CSV
js/mannequin.js       SVG do manequim e recortes por categoria
js/estoque.js         aba Estoque
js/bolsas.js          aba Bolsas (drag & drop, look, manequim)
js/relatorios.js      aba Relatórios
js/app.js             abas, carga inicial, status de sincronização
```

## Design

Segue o sistema visual de referência: fundo `#f5f5f7`, cartões brancos, fios de
1px em `#d6d6d6`, **sem sombras**, botões em pílula (`#0071e3` para ação
primária, `#e2e2e5` para neutra), cantos de 28px nos cartões e tipografia SF Pro
com fallback para Inter e system-ui.
