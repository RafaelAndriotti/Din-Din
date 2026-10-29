# Revisão do backend Din-Din (2026-10-29)

> Revisão feita pelo agente `mentor-backend`. Nenhum arquivo do projeto foi alterado.

## Resumo

O backend **não sobe hoje**. Os controllers importam `../db/db.js`, mas o arquivo está em `src/db/db.js` na raiz. Os testes também não rodam: `vitest run` falhou nos 3 arquivos com `Cannot find module '/src/validators/...'`.

Ponto bom: todas as queries usam parâmetros `$1..$n`, então não há SQL injection hoje.

O resto se divide em quatro frentes:

- Muitos bugs de digitação e de lógica em categorias.
- Modelagem do banco fraca: a despesa não tem data e não tem ligação (FK) com categorias.
- Nenhuma camada de segurança: sem autenticação, sem helmet e com mensagens de erro do banco indo para o cliente.
- Testes com mock que escondem bugs reais.

Confirmado: `prisma` e `jsonwebtoken` **não são usados**. Não há nenhum import deles e não existe `schema.prisma`.

---

## CRÍTICO (a API não funciona)

### C1. Caminho do banco e dos testes quebrado

- **Onde:** `backend/src/controllers/categoriasController.js:1`, `despesasController.js:2`, `src/db/db.js`, `tests/*.test.js:2-8`.
- **Problema:** `../db/db.js` aponta para `backend/src/db/db.js`, que não existe. Os testes apontam para `../src/controllers`, que também não existe a partir de `tests/`.
- **Por que importa:** dá `ERR_MODULE_NOT_FOUND` na inicialização. Nada roda.
- **O que fazer:** deixe tudo do backend dentro de `backend/`, inclusive `db/`, `init.sql` e `tests/`. Assim os caminhos relativos ficam previsíveis. A pasta `src/` na raiz deixa de existir.

### C2. `categoriasValidator.js` está quebrado

- `:1` `export * as z from 'zod'` só **reexporta** o `z`, não importa. Por isso `z` fica indefinido e dá ReferenceError.
- `:5,10` `z.Object` e `z.Number` não existem. O Zod usa minúsculas.
- `:11` `z.enum()` está sem os valores. O certo é `['fixo','variavel']`.
- `:7` o campo `tipo` não existe na tabela. Os campos `ativo` e `icone` faltam no schema.
- `:24` não chama `next()`. A requisição fica pendurada até dar timeout.
- **Por que importa:** o arquivo derruba quem o importa e, mesmo depois de corrigido, trava as rotas.

### C3. `cateoriasRoutes.js` nunca é usado

- `:11` falta `export default routes`. Além disso, `routes/index.js:5` só registra as rotas de despesas.
- `:9` `'categorias/:id'` está sem a `/` inicial, e um POST de criação não deveria ter `:id`.
- `:10` `/categiras` tem erro de digitação.
- `:8` usa `validarCategoria` (que valida o **body**) num GET. GET não tem body: ali o que precisa de validação é o `params.id`.
- POST e PUT estão sem validator.
- Renomeie o arquivo para `categoriasRoutes.js`.

### C4. `categoriasController.js`: as queries não recebem os valores

- `:27-28` INSERT e `:42-46` UPDATE estão sem o array de valores. O Postgres responde algo como "bind message supplies 0 parameters".
- `:39` e `:57` `const { id } = req.params.id` desestrutura uma **string**, então `id` vira `undefined`. O certo é `const { id } = req.params`.
- `:19` não devolve 404: se o registro não existe, responde 200 com corpo vazio.
- `:60` usa `204` com `.json(...)`. Resposta 204 não pode ter corpo, então o Express descarta. Use `.end()` ou `.sendStatus(204)`.

### C5. `despesasController.js`: checagens de 404 que nunca disparam

- `:45` `!rows.length === 0` é avaliado como `(!rows.length) === 0`, ou seja `boolean === number`, que é **sempre false**. Despesa inexistente volta 200 vazio.
- `:92` `rows === 0` também é sempre false. E um DELETE sem `RETURNING` devolve `rows = []`. O que você quer é `rowCount`. Pesquise "pg Result rowCount".
- `:1` importa `despesaValidator` e não usa.

### C6. O nome da coluna `payMethod` quebra o contrato com o frontend

- **Onde:** `init.sql:6`, `despesasController.js:25`.
- **Problema:** no Postgres, identificador sem aspas vira minúsculo. A coluna real é `paymethod`, então `RETURNING *` devolve `{ paymethod: ... }` e o frontend lê `payMethod`, que vem `undefined`. Não dá erro de SQL porque os dois lados estão sem aspas, mas o JSON vem errado.
- **O que fazer:** use `snake_case` no banco e converta para camelCase na camada de dados com `SELECT metodo_pagamento AS "metodoPagamento"`. Ou padronize o contrato inteiro. `"desc"` é palavra reservada e obriga aspas para sempre: troque por `descricao`.
- Escolha **um idioma** só. Hoje tem `desc`/`value`/`category` misturado com `nome`/`descricao`.

---

## ALTO

### A1. Detalhe interno do erro vazando para o cliente e try/catch repetido

- **Onde:** todos os `catch` dos dois controllers (ex.: `despesasController.js:17,34,52,80,98`).
- **Problema:** `erro: error.message` manda para o cliente mensagens do Postgres com nome de tabela, de coluna e de constraint. Isso é OWASP API8 (Security Misconfiguration). E cada handler repete o mesmo bloco.
- **Por que importa:** o atacante aprende o schema do banco, e a resposta de erro fica diferente em cada lugar.
- **O que fazer:** o Express 5 **já encaminha** rejeições de funções async para o middleware de erro. Então:
  1. Remova os try/catch.
  2. Crie uma classe `AppError` com `statusCode`, mais subclasses (`NotFoundError`...).
  3. Registre **um** middleware de erro com 4 argumentos, por último no `app.js`. Ele traduz:
     - erros conhecidos para o status deles;
     - `ZodError` para 400/422;
     - códigos do pg: `23505` (unique) para 409, `23503` (FK) para 409/422, `22P02` (tipo inválido) para 400;
     - todo o resto para 500 genérico, com o detalhe só no log.
  4. Adicione também um handler de 404 para rotas inexistentes.
- **Estude:** "Express 5 error handling", "PostgreSQL error codes appendix".

```js
app.use((err, req, res, next) => {
  const status = err.statusCode ?? 500
  if (status === 500) console.error(err)
  res.status(status).json({ error: { message: status === 500 ? 'Erro interno' : err.message } })
})
```

### A2. Validação incompleta: só o body é validado, e de forma frouxa

- **Onde:** `despesasValidator.js:3-12`, `despesasRoutes.js:9,11`.
- **Problema:** `:id` não é validado. `GET /despesas/abc` gera erro `22P02` e, hoje, um 500 com mensagem do banco.
- Os campos aceitam qualquer coisa: `value` negativo ou 0; `installment` com 2.5 ou -3; `status` com qualquer string; strings vazias ou com 1 MB.
- **O que fazer:**
  - Use `z.coerce.number().int().positive()` para params.
  - Nos campos: `.min/.max` nas strings, `z.enum([...])` para `status` e `payMethod`, `.positive()` e um teto para o valor.
  - Crie **um** middleware genérico `validate({ body, params, query })` em vez de um por entidade.
  - Já está certo: `z.object` descarta chaves desconhecidas por padrão, o que protege de mass assignment. Estude `z.strictObject` como alternativa.

### A3. Modelagem do banco

- **Onde:** `src/db/init.sql`.
- Falta a **data da despesa**. Num app financeiro não dá para filtrar "gastos de outubro" sem ela. Use `data DATE NOT NULL`, e `created_at`/`updated_at` como `TIMESTAMPTZ NOT NULL DEFAULT now()`.
- `category TEXT` é texto livre. Deveria ser `categoria_id INTEGER NOT NULL REFERENCES categorias(id)` com um `ON DELETE` pensado. RESTRICT impede apagar categoria em uso; SET NULL deixa a despesa órfã. Crie índice na FK, porque o Postgres **não** cria sozinho.
- Faltam constraints:
  - `CHECK (valor > 0)`
  - `CHECK (parcelas >= 1)`
  - `CHECK (status IN (...))`
  - `CHECK (tipo_custo IN ('fixo','variavel'))`
  - `NOT NULL` em `status`, `ativo`, `cor`.
- **Por que importa:** o banco é a última linha de defesa. O Zod protege a API; o CHECK protege os dados de qualquer origem (script, seed, outro serviço).
- `NUMERIC(10,2)` está **correto** para dinheiro. Prefira `GENERATED ALWAYS AS IDENTITY` a `SERIAL`.
- **Estude:** "PostgreSQL constraints", "foreign key ON DELETE", "identity columns".

### A4. `init.sql` não está automatizado e não há migrations

- **Onde:** `backend/docker-compose.yml`, `src/db/init.sql:1,11`.
- **Problema:** o script não está montado no container. E `CREATE TABLE IF NOT EXISTS` não **altera** uma tabela existente: ao adicionar `data` ou `categoria_id`, o banco antigo não muda.
- **O que fazer:** adote migrations versionadas: `node-pg-migrate` (se continuar com SQL puro) ou Prisma Migrate. **Decida pg ou Prisma**: ter os dois é ruído.
- **Bug extra:** `env_file: .env` é relativo ao `docker-compose.yml`, então procura `backend/.env`. O `.env.example` manda criar o `.env` na raiz.

### A5. Sem autenticação: qualquer pessoa lê e apaga todas as despesas

- **Problema:** não existe usuário. Num app financeiro multiusuário isso é OWASP API1 (BOLA) e API2 (Broken Authentication).
- **O que fazer, depois dos itens acima:**
  - Tabela `usuarios` com hash de senha (argon2 ou bcrypt).
  - Login que emite JWT de vida curta.
  - Middleware que põe `req.userId`.
  - **Toda** query filtrando `WHERE id = $1 AND usuario_id = $2`.
  - `UNIQUE (usuario_id, nome)` em categorias, no lugar do `UNIQUE(nome)` global.
- **Estude:** "OWASP API Security Top 10 2023 API1".

---

## MÉDIO

### M1. Testes

- O teste de rotas (`tests/categorias.routes.test.js:29-37`) monta um Express próprio em vez de importar o `app.js`. Por isso nenhum teste pegou os erros de digitação, o export faltando ou a rota não registrada. Importe o `app` real no Supertest.
- O mock do `pool` escondeu o bug C4: `criarCategoria` passa no teste mesmo sem mandar valores para o INSERT. Faça **testes de integração contra um Postgres real** (container de teste ou Testcontainers). Deixe mock só para regras de negócio isoladas.
- Os testes atuais confirmam comportamento errado: 500 com `erro: error.message`, e 204 sem checar se o registro existia. Ajuste junto com o A1.
- Despesas não tem teste. Para cada rota, cubra: caminho feliz, 400 de validação (body **e** params), 404 de id inexistente e, no futuro, 409 de duplicado.

### M2. Respostas inconsistentes

- DELETE devolve 204 em categorias e 200 com mensagem em despesas. Padronize em 204.
- O formato do erro varia: `{message, erro}` em um lugar, `{message, erros}` em outro. Defina um formato único, ex.: `{ error: { code, message, details } }`, ou estude a RFC 9457 (Problem Details).
- O `pg` devolve `NUMERIC` como **string** (`"450.00"`) para não perder precisão. Decida o contrato: string decimal ou centavos inteiros na API. Não converta para float sem pensar. Estude "node-postgres types / pg-types".

### M3. Listagem sem paginação, filtro ou ordem

- **Onde:** `despesasController.js:11`, `categoriasController.js:7`.
- **Problema:** `SELECT *` sem `ORDER BY` tem ordem indefinida e traz tudo. Além disso, `checkBackendHealth` no frontend usa `GET /despesas`, carregando a tabela inteira só para checar se está no ar.
- **O que fazer:** aceitar `?mes=2026-10&categoriaId=&status=&page=&limit=` validados pelo Zod (com teto no `limit`), mais `ORDER BY data DESC, id DESC`. Liste as colunas em vez de `*` (evita API3, exposição excessiva). Crie uma rota `/health` com `SELECT 1`.

### M4. Arquitetura em camadas

- **Problema:** o controller monta SQL e decide regra de negócio ao mesmo tempo.
- **O que fazer, depois do A1:**
  - **repository**: só SQL;
  - **service**: regras ("categoria existe e está ativa?", "estourou o limite mensal?");
  - **controller**: só HTTP.
- **Por que importa:** dá para testar regra sem HTTP, e trocar pg por Prisma mexe numa camada só.

### M5. Configuração e segredos

- `server.js:3` tem `PORT = 3000` fixo e ignora o `PORT` do `.env`.
- O `dotenv` é carregado dentro do `db.js`. Carregue no ponto de entrada (`server.js`) ou use `node --env-file=.env`.
- `DATABASE_URL` existe no `.env.example` mas não é usado. Escolha um formato.
- Valide as variáveis de ambiente com Zod na inicialização, para falhar cedo.
- Faltam `pool.on('error')` e encerramento limpo (`pool.end()` no SIGTERM).
- O `.gitignore` com `.env` está correto.

---

## BAIXO

- **B1. Cabeçalhos e limites:** falta `helmet` (remove `X-Powered-By`, adiciona cabeçalhos de segurança). Falta `express-rate-limit`, essencial no login quando existir. Use `express.json({ limit: '10kb' })` explícito. CORS: em produção libere **só** a origem do frontend, nunca `*`.
- **B2. Dependências:**
  - `prisma@^8.0.0-rc.23` é **release candidate** e não é usada. Remova; se adotar Prisma, `prisma` vai em devDependencies e `@prisma/client` em dependencies.
  - `jsonwebtoken` só deve entrar quando a auth for feita.
  - `nodemon` vai para devDependencies, ou troque por `node --watch`.
  - Commite o `package-lock.json` da raiz.
  - Considere um `backend/package.json` próprio.
- **B3. Detalhes:** `routes/index.js:4` responde texto `"Despesas"` na raiz. Prefixe a API com `/api/v1` e ajuste o proxy do Vite. POST 201 pode incluir cabeçalho `Location`. Classes só com métodos `static` funcionam, mas um módulo com funções exportadas é mais simples.
- **B4. Frontend (observação):** `createDespesa` simula inclusão local quando o backend falha. Isso **esconde erros do backend** durante o desenvolvimento. Vale desligar esse fallback enquanto testa a API.

---

## Roteiro sugerido (uma etapa por vez)

1. **Fazer subir:** C1 a C6, com `npm install` e `npm start` sem erro. *Desafio:* por que `!rows.length === 0` é sempre false? Escreva a ordem de avaliação.
2. **Erros centralizados** (A1) e **respostas padronizadas** (M2). *Desafio:* que status devolver ao criar categoria com nome duplicado, e qual código de erro do pg detecta isso?
3. **Validação completa** (A2) com o middleware genérico `validate`. *Desafio:* o que acontece hoje com `GET /despesas/1 OR 1=1`? Por que não há SQL injection, e por que mesmo assim é preciso validar?
4. **Remodelar o banco** (A3) **via migrations** (A4), com data, FK e CHECKs. *Desafio:* RESTRICT ou SET NULL no `ON DELETE` da categoria? Justifique pelo ponto de vista do usuário.
5. **Testes de integração com banco real** (M1), cobrindo despesas. *Desafio:* escreva o teste que teria pegado o INSERT sem valores.
6. **Camadas service/repository** (M4) e **paginação/filtros** (M3).
7. **Autenticação e dono dos dados** (A5), depois helmet e rate limit (B1).

## Decisões pendentes

- pg puro ou Prisma.
- `ON DELETE` da categoria: RESTRICT ou SET NULL.
- Dinheiro na API: string decimal ou centavos inteiros.
- Desligar ou não o fallback local do frontend durante os testes da API.

## Ideias para depois

- Tabela `parcelas` (uma linha por parcela) criada numa **transação** (`BEGIN/COMMIT/ROLLBACK` com `pool.connect()`).
- Relatório mensal por categoria com `GROUP BY` + `date_trunc`, comparando com `limite_mensal`.
- Despesas recorrentes (assinaturas) geradas por job agendado.
- Cabeçalho `Idempotency-Key` no POST para evitar despesa duplicada por clique duplo.
- Documentação OpenAPI gerada a partir dos schemas Zod.
- CI no GitHub Actions rodando os testes com um serviço Postgres.
