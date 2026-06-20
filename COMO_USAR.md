# Como usar este sistema de fichas em JSON

## O que mudou
Antes: cada personagem = 1 arquivo HTML de ~3000+ linhas, todo duplicado.
Agora: 1 único `ficha.html` (o "motor") + 1 arquivo `.json` pequeno por personagem.

## Estrutura
```
/
├── index.html              # lista os personagens (lê manifest.json) + cria fichas novas
├── manifest.json           # lista estática de personagens (parte do código)
├── ficha.html               # template único — renderiza qualquer personagem
├── personagens/
│   └── mikhail.json         # dados-base do Mikhail (usado se a API/KV não tiver nada salvo ainda)
└── api/
    ├── ficha.js             # API genérica: GET/POST /api/ficha?id=NOME
    ├── avatar.js             # API de avatar: GET/POST/DELETE /api/avatar?id=NOME
    └── manifest.js           # API da lista dinâmica: GET/POST /api/manifest (fichas criadas pelo site)
```

## Como abrir uma ficha
```
ficha.html?id=mikhail
```
O `id` na URL decide qual personagem carregar. Não precisa mais de um arquivo HTML por personagem.

## Como adicionar um personagem novo

### Opção A — Pelo site (recomendado)
Na página inicial (`index.html`), clique no card tracejado **"+ Nova Ficha"**, digite o nome do personagem e confirme. Isso:
1. Gera um `id` automaticamente a partir do nome (ex: "Kal Calder" → `kal-calder`).
2. Cria uma ficha em branco com todos os campos do sistema já estruturados (atributos 10, as 18 perícias padrão de D&D 5e desmarcadas, HP/CA/etc. zerados) — só falta preencher.
3. Registra o personagem na lista da home automaticamente (via `/api/manifest`, guardado no Vercel KV — aparece pra todo mundo que acessar o site).
4. Já te leva direto para `ficha.html?id=...` para começar a editar.

Se o Vercel KV não estiver configurado (ou estiver offline), o sistema cai automaticamente para o `localStorage` — a ficha funciona normalmente, só que fica visível apenas no seu navegador.

### Opção B — Manual
1. Copie `personagens/mikhail.json`, renomeie para `personagens/novo-id.json`
2. Edite os campos (nome, atributos, perícias, magias, equipamento, etc.)
3. Adicione uma linha em `manifest.json`:
   ```json
   { "id": "novo-id", "nome": "Nome do Personagem", "subtitulo": "Classe / Raça" }
   ```
4. Pronto — `ficha.html?id=novo-id` já funciona, e ele aparece na home.

## Onde os dados ficam salvos
1. Primeiro tenta a API (`/api/ficha?id=...`), que usa o Vercel KV — é o que compartilha entre jogadores.
2. Se a API falhar (sem internet, sem KV configurado), cai pro JSON em `personagens/`.
3. Se nem isso existir, tenta o `localStorage` do navegador.
4. Toda alteração salva automaticamente (com debounce de 600ms) e também no clique do botão "SALVAR".

## Migrando suas fichas atuais (Sasy, Ryuzaki, Kal Calder...)
Para cada ficha antiga, você vai precisar extrair os dados (atributos, perícias, magias, equipamento, texto de antecedente etc.) do HTML antigo e colocar num JSON novo seguindo o modelo de `mikhail.json`. É um trabalho manual de "copiar os valores", mas rápido — uns 10-15 min por ficha.

Se quiser, me manda o conteúdo de uma das fichas antigas (ex: ficha_sasy_v4-1.html) que eu converto pra JSON pra você.

## Próximos passos sugeridos
- Adicionar campo de imagem/arte do personagem (`"arte": "url-ou-caminho"`)
- Adicionar suporte a múltiplos níveis de magia dinamicamente (já dá pra isso, só adicionar mais entradas em `magias.slots`)
- Sistema de autenticação simples por ficha (uma senha por personagem)
- Tela "modo mestre" que lista o HP/status de todas as fichas do `manifest.json` de uma vez
