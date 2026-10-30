# CLAUDE.md — Controle Financeiro (Din-Din)

Contexto do projeto para o Claude Code. Este arquivo é versionado: vale em qualquer máquina que clonar o repo.
Mantenha atualizado ao fechar cada etapa (seção "Estado atual").

## O que é

Controle financeiro pessoal: API REST (Node + Express 5 + PostgreSQL) e frontend React 19 + Vite.
Projeto de estudo: o dono escreve o código para aprender backend. Explicar o porquê, não só entregar a resposta.

## Stack e layout

- Raiz é monorepo simples. `package.json` da raiz tem as deps do backend (ESM, `type: module`).
- `backend/server.js` — carrega `dotenv/config`, sobe `src/app.js` na `PORT` (padrão 3000).
- `backend/src/` — `routes/` (index registra despesas e categorias), `controllers/`, `validators/` (Zod 4), `db/db.js` (Pool do `pg`), `db/init.sql` (schema, aplicado à mão).
- `backend/tests/` — Vitest + Supertest.
- `backend/docker-compose.yml` — Postgres 16, porta host `5434`, lê `../.env`.
- `frontend/` — Vite na porta 5173, proxy de `/despesas` para `localhost:3000`. Lint com oxlint. `src/services/api.js` fala com a API.
- `.claude/agents/` — agentes do projeto (orquestrador, designer, mentor-backend, frontend-especialista, cacador-de-bugs).
- `.claude/reports/` — revisões e guias do mentor. Fonte de verdade do roteiro: `revisao-backend-2026-10-29.md`.

## Setup em máquina nova

```bash
npm install
npm --prefix frontend install
cp .env.example .env   # preencher usuário/senha
docker compose -f backend/docker-compose.yml up -d
# aplicar o schema (uma vez):
docker exec -i postgres-dev psql -U <usuario> -d din_din_db < backend/src/db/init.sql
npm run dev            # backend
npm run dev:frontend   # frontend
npm test               # testes
```

`.env` não é commitado (está no `.gitignore`).

## Convenções

- Código, nomes de tabela/coluna e mensagens em português, snake_case no banco (`metodo_pagamento`, `parcelas`).
- Commits: `fix(Cn): ...` / `feat: ...`, em português, um item do roteiro por commit.
- Queries sempre parametrizadas (`$1, $2`). 404 via `rowCount`/`rows.length`.
- Branch de trabalho atual: `backend`. PRs vão para `main`.

## Estado atual (2026-10-29)

- Feitos e commitados: C1 (caminhos/dotenv), C2 (validator categorias), C3 (rotas categorias), C4 (controller categorias), C5 (404 em despesas).
- Em andamento, não commitado: **C6** — renomear colunas de despesas para português (`descricao`, `valor`, `categoria`, `metodo_pagamento`, `parcelas`, `status`) no `init.sql`, controllers, validators, testes e frontend.

## Próximos passos (roteiro do mentor)

1. Fechar C6 e garantir `npm start` e `npm test` sem erro.
2. Erros centralizados (A1) e respostas padronizadas (M2).
3. Validação completa de params/query/body com middleware `validate` (A2).
4. Remodelar banco (A3) via migrations (A4): data, FK, CHECKs.
5. Testes de integração com banco real (M1).
6. Camadas service/repository (M4), paginação e filtros (M3).
7. Autenticação e dono dos dados (A5), depois helmet e rate limit.

## Decisões pendentes

- pg puro ou Prisma (Prisma está nas deps mas não é usado).
- `ON DELETE` da categoria: RESTRICT ou SET NULL.
- Dinheiro na API: string decimal ou centavos inteiros.
- Desligar ou não o fallback local do frontend durante testes da API.
