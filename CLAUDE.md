# CLAUDE.md — Controle Financeiro (Din-Din)

Contexto do projeto para o Claude Code. Este arquivo é versionado: vale em qualquer máquina que clonar o repo.
Mantenha atualizado ao fechar cada etapa (seção "Estado atual").

## O que é

Controle financeiro pessoal: API REST (Node + Express 5 + PostgreSQL) e frontend React 19 + Vite.
Projeto de estudo: o dono escreve o código para aprender backend. Explicar o porquê, não só entregar a resposta.

## Stack e layout

- Raiz é monorepo simples. `package.json` da raiz tem as deps do backend (ESM, `type: module`).
- `backend/server.js` — carrega `dotenv/config`, sobe `src/app.js` na `PORT` (padrão 3000).
- `backend/src/` — `routes/` (index registra `/auth`, o middleware `autenticar` e depois despesas e categorias), `controllers/`, `validators/` (Zod 4), `middleware/` (validate, autenticar, erros, limites), `auth/` (hash scrypt e JWT), `config.js` (valida o `.env` no boot), `db/db.js` (Pool do `pg`, role sem superusuário), `db/init.sql` (schema e role da API, aplicado à mão) e `db/migracao-001-dono-dos-dados.sql`.
- `backend/tests/` — Vitest + Supertest.
- `backend/docker-compose.yml` — Postgres 16, porta host `5434`, lê `../.env`.
- `render.yaml` — Blueprint do Render: um serviço web (API + build do React), deploy automático a cada push no `main`. Banco no Neon; o `init.sql` não roda no deploy, é aplicado à mão. Segredos com `sync: false` ficam só no painel.
- `frontend/` — Vite na porta 5173, proxy de `/auth`, `/despesas` e `/categorias` para `127.0.0.1:3000`. Lint com oxlint. `src/services/api.js` fala com a API e guarda o token; `components/Login.jsx` é a tela de entrada.
- `docs/security-audit/` — auditoria de segurança (23/11/2026) e o relatório de correções, gerados em HTML e PDF pelos scripts da pasta.
- `PRODUCT.md` e `DESIGN.md` (raiz) — contexto de produto e design system do frontend. Desde 24/11/2026 o visual é "Vidro" (glassy): cena quente ao fundo, palco e painéis de vidro fosco, botões em pílula, fonte Manrope; coral para o que falta pagar, PENDENTE e erro; verde-azulado para PAGO. Tokens em `frontend/src/index.css`, regras em `DESIGN.md`. `.impeccable/` guarda o brief e as capturas da revisão.
- `.claude/agents/` — agentes do projeto (orquestrador, designer, mentor-backend, frontend-especialista, cacador-de-bugs).
- `.claude/reports/` — revisões e guias do mentor. Fonte de verdade: `a-corrigir-2026-11-03.md` (correções) e `a-criar-2026-11-03.md` (o que falta criar).

## Setup em máquina nova

```bash
npm install
npm --prefix frontend install
cp .env.example .env   # trocar todos os valores "_aqui"; a API recusa subir com eles
docker compose -f backend/docker-compose.yml up -d
# aplicar o schema e criar a role da API (pode repetir; lê APP_DB_* do contêiner):
docker exec -i postgres-dev sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < backend/src/db/init.sql
npm run dev            # backend
npm run dev:frontend   # frontend; criar a conta na tela de login
npm test               # testes
```

`.env` e `.env.*` não são commitados (estão no `.gitignore`). Banco com dados de antes da autenticação: rodar `migracao-001-dono-dos-dados.sql` com `-v email=<sua conta>` (ver README).

## Convenções

- Código, nomes de tabela/coluna e mensagens em português, snake_case no banco (`metodo_pagamento`, `parcelas`).
- Commits: `fix(Cn): ...` / `feat: ...`, em português, um item do roteiro por commit.
- Queries sempre parametrizadas (`$1, $2`). 404 via `rowCount`/`rows.length`.
- Toda query de despesas e categorias filtra por `usuario_id = req.usuarioId` (o dono vem do token, nunca do body). Registro de outro usuário responde 404.
- Controllers sem try/catch: o Express 5 leva o erro ao handler central (`middleware/erros.js`), que responde 500 genérico e loga o detalhe.
- Branch de trabalho atual: `backend`. PRs vão para `main`.

## Estado atual (2026-10-29)

- Feitos e commitados: C1 (caminhos/dotenv), C2 (validator categorias), C3 (rotas categorias), C4 (controller categorias), C5 (404 em despesas).
- Em andamento, não commitado: **C6** — renomear colunas de despesas para português (`descricao`, `valor`, `categoria`, `metodo_pagamento`, `parcelas`, `status`) no `init.sql`, controllers, validators, testes e frontend.
- 2026-11-23, branch `fix/auditoria-seguranca`: correções da auditoria de segurança (críticos a baixos). Autenticação JWT e dono dos dados (A5), posse em toda query, role do banco sem superusuário, `.env` validado no boot, API e Postgres só em 127.0.0.1, handler de erro central (parte de A1), paginação (parte de M3) e rate limit. Detalhes em `docs/security-audit/relatorio-correcoes-seguranca.pdf`.

## Próximos passos (roteiro do mentor)

1. Fechar C6 e garantir `npm start` e `npm test` sem erro.
2. Erros centralizados (A1) e respostas padronizadas (M2).
3. Validação completa de params/query/body com middleware `validate` (A2).
4. Remodelar banco (A3) via migrations (A4): data, FK, CHECKs.
5. Testes de integração com banco real (M1), incluindo dois usuários (B não lê nem altera nada de A).
6. Camadas service/repository (M4), filtros (M3; a paginação já existe).
7. Pendências da auditoria (informativas): helmet e cabeçalhos de segurança no servidor do front, regras anti-XSS no oxlint, RLS como segunda tranca.

## Decisões pendentes

- pg puro ou Prisma (Prisma está nas deps mas não é usado).
- `ON DELETE` da categoria: RESTRICT ou SET NULL.
- Dinheiro na API: string decimal ou centavos inteiros.
- Desligar ou não o fallback local do frontend durante testes da API.
