# Malinha Personalizada

Sistema de controle de roupas: estoque com foto, montagem de malinhas por pessoa
(arrastando as peças para dentro de uma bolsa) e relatórios de uso.

Site estático — HTML, CSS e JavaScript puro com ES modules. **Sem build, sem
dependências, sem npm.** Basta publicar a pasta.

## Como funciona

| Aba | O que faz |
| --- | --- |
| **Estoque** | Cadastro de peças com foto, nome, **custo**, **valor de venda** e categoria. Busca, filtros por categoria e por situação (livre / em uso), editar e excluir. |
| **Bolsas** | Uma malinha por pessoa. Arraste peças do estoque para dentro da bolsa (ou para o cartão da bolsa na lista lateral) e o look vai se montando, com nome, custo e venda de cada peça ao lado e os dois totais embaixo. Editar e excluir bolsa. |
| **Relatórios** | O que está em uso e com quem, o que continua livre, custo e venda em circulação x parados, resumo por bolsa e exportação em CSV com linha de total. |

**Regra central:** uma peça só pode estar em uma bolsa por vez. É isso que torna
o relatório de "em uso x livre" confiável — a peça alocada aparece marcada no
estoque com o nome da pessoa e não pode ser colocada em outra malinha.

A bolsa é um SVG desenhado de frente. Cada peça guardada aparece espetada para
fora da boca, com a foto recortada, e some por trás da frente da bolsa — a
leitura é de peça guardada dentro. As peças entram na ordem de vestir (calça
antes da blusa, casaco por último) e, a partir da sexta, o excedente vira um
selo `+n` na frente da bolsa.

## Dados

Tudo é salvo no Firebase Realtime Database via API REST, sem SDK:

```
https://malinhapersonalizada-default-rtdb.firebaseio.com
```

Estrutura:

```jsonc
{
  "pecas": {
    "-Nxxxx": {
      "nome": "Blusa de linho off-white",
      "custo": 89.9,
      "venda": 189.9,
      "categoria": "blusa",
      "foto": "data:image/jpeg;base64,...",  // reduzida para 900px / qualidade 0.72
      "criadoEm": "2026-09-02T12:00:00.000Z"
    }
  },
  "perfis": {
    "UID_DA_PESSOA": { "senhaTrocada": true }  // já trocou a senha provisória
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

## Acesso

O site é público (GitHub Pages), então **quem protege os dados são as regras do
Realtime Database, não a visibilidade do repositório**. A `FIREBASE_URL` e a
`FIREBASE_API_KEY` vão no código do navegador de qualquer jeito — nenhuma das
duas é segredo. Elas apenas identificam o projeto.

O app abre numa tela de login. A autenticação é por e-mail e senha, via API REST
do Identity Toolkit (sem SDK), e as regras só liberam leitura e escrita para
UIDs listados em `/acesso`. Quem não estiver na lista não passa, mesmo tendo
conta no projeto.

O token de acesso vale 1 hora e é renovado sozinho pelo refresh token, que fica
no `localStorage` — fechar e reabrir a aba não pede a senha de novo.

### Configurar (uma vez, no console do Firebase)

1. **Ativar o login.** Authentication → Sign-in method → ative *E-mail/senha*.
2. **Criar o usuário.** Authentication → Users → *Add user*, com e-mail e senha.
   Copie o **UID** que aparece na lista.
3. **Liberar o UID.** Realtime Database → Dados → crie o nó `acesso` e, dentro
   dele, um filho com o UID como chave e o booleano `true` como valor:

   ```jsonc
   { "acesso": { "SEU_UID_AQUI": true } }
   ```

4. **Publicar as regras.** Realtime Database → Regras → cole o conteúdo de
   [`firebase-rules.json`](firebase-rules.json) e publique.
5. **Apontar a chave.** Configurações do projeto → Geral → Seus apps → copie a
   *Web API Key* e cole em `FIREBASE_API_KEY`, em
   [`js/config.js`](js/config.js).

Faça o passo 3 **antes** do 4: publicar as regras com `/acesso` vazio tranca o
banco para todo mundo, inclusive para você, e a única saída é reabrir as regras
pelo console.

Para dar acesso a outra pessoa, repita os passos 2 e 3 — as regras não mudam.

### Senha provisória e primeira entrada

O usuário criado no passo 2 nasce com uma senha provisória, escolhida por quem
cadastrou. Na primeira entrada o app não abre direto: pede a troca por uma senha
que só a pessoa conheça, e só depois libera o estoque. O que marca isso é
`/perfis/{uid}/senhaTrocada` — sem esse `true`, a troca é pedida de novo.

Vale para todo mundo, inclusive para quem já usava o app antes desta versão: a
primeira entrada depois da atualização pede uma senha nova uma única vez.

### Esqueci minha senha

O botão na tela de login dispara o e-mail de redefinição do Firebase. Ele manda
um **link**, não uma senha: pelo link a própria pessoa escolhe a nova senha, e
ninguém — nem o administrador — chega a conhecê-la.

Enviar uma senha pronta por e-mail exigiria um servidor para gerá-la e disparar
o e-mail, o que este site não tem (é estático), e deixaria a senha em texto na
caixa de entrada. O link resolve a mesma necessidade sem esses dois problemas.
Para que os e-mails saiam com o nome certo, ajuste o remetente e o texto em
Authentication → Templates.

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
index.html            tela de login, marcação das três abas e dos modais
css/styles.css        design tokens e componentes
js/config.js          URL e chave do Firebase, catálogo de categorias
js/auth.js            login por e-mail e senha (REST) e renovação do token
js/db.js              cliente REST do Realtime Database, assinado com o token
js/store.js           estado + operações que persistem
js/utils.js           formatação BRL, compressão de imagem, toasts, CSV
js/tote.js            SVG da bolsa e das peças guardadas dentro
js/estoque.js         aba Estoque
js/bolsas.js          aba Bolsas (drag & drop, look, bolsa)
js/relatorios.js      aba Relatórios
js/app.js             portão de acesso, abas, carga inicial, sincronização
```

## Design

Segue o sistema visual de referência: fundo `#f5f5f7`, cartões brancos, fios de
1px em `#d6d6d6`, **sem sombras**, botões em pílula (`#0071e3` para ação
primária, `#e2e2e5` para neutra), cantos de 28px nos cartões e tipografia SF Pro
com fallback para Inter e system-ui.
