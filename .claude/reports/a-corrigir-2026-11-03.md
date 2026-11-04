# A corrigir no backend e no banco (2026-11-03)

> Escrito pelo agente `mentor-backend`. Nenhum código foi alterado. Substitui os reports de 2026-10-29 (revisão, guia C1-C6 e guia A1/M2/A2). O que é **criar algo novo** está em `a-criar-2026-11-03.md`. Aqui fica só o que já existe e está errado ou incompleto.

## Estado conferido hoje

- Branch `main`, working tree limpo. C1 a C6 estão commitados e mergeados (`c796c1f`, merge `1f97656`). O "Estado atual" do `CLAUDE.md` ainda diz "C6 em andamento": está desatualizado.
- `npm test`: **3 arquivos, 19 testes, todos passando** (vitest 5.0.5). Atenção: passar não quer dizer que estão certos (ver COR-6).
- Docker estava desligado, então não testei contra o Postgres. Montei o `app` real com Supertest e o banco inacessível. Resultados:

| Requisição | Status | Corpo |
|---|---|---|
| `GET /naoexiste` | 404 | HTML do Express |
| `POST /despesas` com JSON quebrado | 400 | HTML com stack trace e caminhos `C:\dev\controle-financeiro\node_modules\...` |
| `POST /despesas` com `valor:-50, descricao:"", parcelas:2.5, status:"talvez", admin:true` | 500 | Passou pelo Zod e chegou ao banco |
| `POST /categorias` com `nome:"", descricao:"", limiteMensal:-1` | 500 | Passou pelo Zod e chegou ao banco |
| `GET /despesas/abc` | 500 | `{"message":"erro interno no servidor","erro":""}` |

Todas as respostas trazem o cabeçalho `X-Powered-By: Express`.

Já resolvidos do roteiro antigo (não repetir): C1 a C6, `PORT` via env, `dotenv` no `server.js`, `env_file: ../.env` no compose, `package-lock.json` commitado, 404 com `rows.length`/`rowCount`, `COLUNAS` no lugar de `SELECT *`, 204 com `.end()`. No frontend, o create/update não simula mais sucesso. O fallback ficou só no `GET` em modo DEV.

## Resumo por prioridade

| Prioridade | Itens |
|---|---|
| Crítica | COR-1 |
| Alta | COR-2, COR-3, COR-4, COR-5, COR-6, COR-7 |
| Média | COR-8, COR-9, COR-10, COR-11, COR-12, COR-13 |
| Baixa | COR-14, COR-15 |

---

## COR-1. A validação de despesas aceita dados inválidos, e o banco não barra

- **Prioridade:** crítica
- **Onde:** `backend/src/validators/despesasValidator.js:3-12`, `backend/src/db/init.sql:1-9`
- **Problema:**
  - Todos os campos são `z.string()` ou `z.number()` sem nenhuma regra.
  - Passam: `valor` negativo, zero ou `1e12`; `descricao` e `categoria` vazias ou com 1 MB; `parcelas` 2.5 ou -3; qualquer `status` e qualquer `metodoPagamento`.
  - `valor: 10.005` passa e o `NUMERIC(10,2)` arredonda em silêncio.
  - O banco não tem `CHECK` nenhum para segurar o que escapar.
- **Por que importa:** num app financeiro, uma despesa negativa ou com status `talvez` gravada com 201 corrompe todo total e relatório depois. Os casos que o banco rejeita (2.5 em `INTEGER`, overflow) viram 500 em vez de 400.
- **Direção:**
  - Regras por campo: tamanho mínimo e máximo nas strings; `enum` em `status` e `metodoPagamento`; valor positivo, com teto e no máximo 2 casas; parcelas inteiras com o mínimo da decisão de parcelas (COR-11).
  - Aplicar pelo middleware `validate` (CRI-3).
  - O `CHECK` correspondente no banco vem no COR-9.
- **Estudar:** Zod 4 `z.enum`, `.min/.max`, `.int()`, `.positive()`, `.multipleOf()`.
- **Como verificar:** o mesmo POST da tabela acima devolve 400, com um item de erro por campo, e **não** chega ao banco. Para provar, coloque um mock do pool que falha se for chamado.

## COR-2. A validação de categorias também é frouxa

- **Prioridade:** alta
- **Onde:** `backend/src/validators/categoriasValidator.js:5-13`
- **Problema:**
  - `nome: ""` e `descricao: ""` passam.
  - `limiteMensal` aceita negativo e um valor sem teto, que estoura o `NUMERIC(10,2)`.
  - Chaves desconhecidas são descartadas em silêncio, sem aviso ao cliente.
- **Por que importa:** é o mesmo risco do COR-1. Uma categoria sem nome quebra a tela, e um limite negativo quebra a regra "estourou o limite?".
- **Direção:** as mesmas regras do COR-1, aplicadas a estes campos. Decida `z.object` ou `z.strictObject` (decisão D6 no `a-criar`).
- **Como verificar:** `POST /categorias` com `{"nome":"","descricao":"","limiteMensal":-1}` devolve 400.

## COR-3. Nenhum `:id` é validado

- **Prioridade:** alta
- **Onde:** `backend/src/routes/despesasRoutes.js:9-11`, `backend/src/routes/categoriasRoutes.js:8,10,11`
- **Problema:** `GET /despesas/abc` gera o erro `22P02` do Postgres, e `/despesas/99999999999` gera "out of range for type integer". Os dois viram 500.
- **Por que importa:** é um erro do cliente reportado como falha do servidor. Isso polui o log e os alertas, e ainda vaza mensagem do banco (COR-4). Não há SQL injection, porque as queries são parametrizadas, mas validar continua necessário.
- **Direção:** um schema de params com coerção para inteiro positivo, com teto no limite do `INTEGER`. Aplicar via `validate({ params })` (CRI-3) em todas as rotas `/:id`.
- **Estudar:** `z.coerce.number()`, limite do tipo `integer` do PostgreSQL (2147483647).
- **Como verificar:** `curl -i localhost:3000/despesas/abc` e `/despesas/99999999999` devolvem 400. `/despesas/0` e `/despesas/-1` também.

## COR-4. Detalhe interno do erro vai para o cliente (OWASP API8)

- **Prioridade:** alta
- **Onde:**
  - `backend/src/controllers/categoriasController.js:14,28,40,62,78`
  - `backend/src/controllers/despesasController.js:19,36,54,82,100`
- **Problema:**
  - Todo `catch` responde `erro: error.message`. Com o banco no ar, isso expõe nome de constraint, tabela e tipo de coluna (ex.: `duplicate key value violates unique constraint "categorias_nome_key"`).
  - Com o banco fora do ar, o `message` vem **vazio** (`""`, porque é um `AggregateError`). Ou seja, o vazamento também nem serve para depurar.
  - Nome duplicado em categoria devolve 500, quando deveria ser 409.
- **Por que importa:** o atacante aprende o schema. O mesmo erro sai com formato diferente em cada handler.
- **Direção:** tirar os 10 `try/catch` (o Express 5 já encaminha rejeição de função async) e deixar o handler central (CRI-1) traduzir:
  - `23505` para 409;
  - `22P02` e `22003` para 400;
  - o resto para 500 genérico, com o detalhe só no log do servidor.
- **Como verificar:** com o banco no ar, crie duas categorias com o mesmo nome. A segunda devolve 409 sem citar `categorias_nome_key`. Derrube o Docker: `GET /despesas` devolve 500 genérico e o terminal mostra o erro completo.

## COR-5. Erros fora dos controllers saem em HTML, com stack trace

- **Prioridade:** alta
- **Onde:** `backend/src/app.js:1-9` (não existe handler de erro nem de 404)
- **Problema:**
  - JSON malformado devolve 400 em HTML com stack trace e caminhos absolutos da sua máquina.
  - Rota inexistente devolve HTML.
  - Todo response traz `X-Powered-By: Express`.
- **Por que importa:** o frontend espera JSON (`frontend/src/services/api.js:49-50`) e recebe HTML. O stack trace entrega a estrutura de pastas e as versões das libs. Em produção (`NODE_ENV=production`), o Express esconde o stack, mas continua respondendo HTML.
- **Direção:** um handler de 404 e o handler de erro de 4 argumentos, registrados por último (CRI-1). O erro do body-parser já chega com `status: 400` e `type: 'entity.parse.failed'`: use isso para responder 400 em JSON. O `X-Powered-By` some com o helmet (CRI-10), ou com `app.disable('x-powered-by')`.
- **Como verificar:** `curl -i -X POST localhost:3000/despesas -H "Content-Type: application/json" -d '{"descricao":'` devolve 400 em JSON, sem `node_modules` no corpo. `curl -i localhost:3000/naoexiste` devolve 404 em JSON.

## COR-6. Testes que passam por acidente ou que confirmam o comportamento errado

- **Prioridade:** alta
- **Onde:**
  - `backend/tests/categorias.controller.test.js:28-32` (`res` falso sem `end`), `:173` (mock do DELETE sem `rowCount`), `:181` (asserção fraca), `:59-64` (exige `erro: 'Falha de conexão'`, ou seja, exige o vazamento do COR-4).
  - `backend/tests/categorias.routes.test.js:29-37` (monta um Express próprio, sem os validators e sem o `routes/index.js`), `:131` (mesmo mock sem `rowCount`).
- **Problema:**
  - O delete chama `res.status(204).end()`. Como o `end` não existe no `res` falso, isso lança `TypeError`. O `catch` responde 500, e o teste passa porque `status` foi chamado com 204 antes.
  - Não existe teste de 404 em nenhuma rota.
  - Não existe nenhum teste de despesas.
  - O teste de rotas não testa as rotas reais: um erro em `categoriasRoutes.js` ou no `index.js` passaria.
- **Por que importa:** quando você tirar os `try/catch` (COR-4), esses testes quebram por um motivo que não tem relação com a sua mudança. E hoje eles **protegem** o bug do COR-4.
- **Direção:**
  - Mock com o contrato real do `pg`: um DELETE sem `RETURNING` devolve `{ rows: [], rowCount: n }`.
  - `res` falso com `end`.
  - Asserções que provam a resposta **final**: `toHaveBeenCalledTimes`, `not.toHaveBeenCalledWith(500)`.
  - Nos testes de rota, importar o `app` de `backend/src/app.js`.
  - Ajustar os testes de 500 para o formato novo junto com o CRI-1. Os testes de integração com banco real ficam no CRI-6.
- **Como verificar:** troque `.end()` por `.endd()` no controller de propósito: o teste do delete **precisa** ficar vermelho. Depois desfaça.

## COR-7. Constraints faltando nas colunas que já existem

- **Prioridade:** alta
- **Onde:** `backend/src/db/init.sql:5-8` (despesas) e `:15-19` (categorias)
- **Problema:**
  - Em despesas, `metodo_pagamento`, `parcelas` e `status` aceitam `NULL`.
  - Em categorias, `cor`, `icone`, `tipo_custo` e `ativo` têm `DEFAULT`, mas aceitam `NULL`. Um `UPDATE ... SET ativo = NULL` é aceito.
  - Não existe `CHECK` em `valor > 0`, `limite_mensal >= 0`, `parcelas`, `status IN (...)`, `tipo_custo IN (...)` nem no formato de `cor`.
- **Por que importa:** o Zod protege a API. O banco protege os dados contra **qualquer** origem: seed, script, `psql`, um bug futuro no validator. Hoje a única barreira é um validator frouxo (COR-1).
- **Direção:** `NOT NULL` e `CHECK` coerentes com o Zod, aplicados por migration (CRI-4), e não editando o `init.sql` à mão. Antes, limpe ou corrija as linhas que violariam a regra, senão o `ALTER TABLE` falha. A coluna nova `data`, a FK e os timestamps estão no CRI-5.
- **Estudar:** "PostgreSQL CHECK constraints", `ALTER TABLE ... ADD CONSTRAINT`, `NOT VALID` + `VALIDATE CONSTRAINT`.
- **Como verificar:** `INSERT INTO despesas (descricao, valor) VALUES ('x', -1);` direto no `psql` falha com `23514` (check_violation).

## COR-8. Formato de resposta de erro inconsistente

- **Prioridade:** média
- **Onde:**
  - `backend/src/validators/*Validator.js:19-22` usam `{ message, erros }`.
  - Os controllers usam `{ message, erro }`.
  - As mensagens variam em caixa e pontuação ("Registro nao encontrado" e "Registro nao encontrado.", "erro interno no servidor" e "Erro interno no servidor.").
  - O frontend lê `body.erros` (`frontend/src/services/api.js:63`).
- **Por que importa:** o cliente não tem um campo estável para decidir o que mostrar. Mudar o formato sem combinar quebra a tela de validação do frontend.
- **Direção:** um envelope único (decisão D2) produzido num lugar só (CRI-1/CRI-2). Ajuste o `api.js` do front no mesmo commit.
- **Como verificar:** um 400, um 404, um 409 e um 500 têm as mesmas chaves no topo.

## COR-9. `PUT /categorias/:id` restaura defaults em silêncio

- **Prioridade:** média
- **Onde:** `backend/src/validators/categoriasValidator.js:7,9,11,12` (`.default(...)`) usados também em `backend/src/routes/categoriasRoutes.js:10`, mais `backend/src/controllers/categoriasController.js:52`
- **Problema:** o mesmo schema com `.default()` vale para POST e PUT. Num PUT sem `ativo`, o Zod preenche `true`, e o UPDATE **reativa** uma categoria desativada. O mesmo vale para `cor`, `icone` e `tipoCusto`, que voltam ao padrão.
- **Por que importa:** é perda silenciosa de dado. O cliente não pediu a mudança e não recebe aviso.
- **Direção:** no PUT, exija o recurso completo, sem defaults. Os defaults ficam só na criação. Pesquise como derivar um schema do outro no Zod 4 (`.extend`, `.partial`, `.required`). PATCH fica para depois (D7).
- **Como verificar:** crie uma categoria com `ativo: false` e faça um PUT sem `ativo`. A resposta deve ser 400, e não 200 com `ativo: true`.

## COR-10. Default de `tipoCusto` diferente no Zod e no banco

- **Prioridade:** média
- **Onde:** `backend/src/validators/categoriasValidator.js:11` (`'fixo'`) e `backend/src/db/init.sql:18` (`'variavel'`)
- **Problema:** o INSERT sempre manda o `$6`, então o `DEFAULT` do banco nunca é usado pela API. Pela API grava `fixo`; por seed ou `psql` grava `variavel`.
- **Por que importa:** duas fontes da verdade. O valor gravado depende do caminho por onde o dado entrou.
- **Direção:** escolher um valor (recomendado: `variavel`, o que o banco diz) e deixar os dois iguais. Na migration, o `CHECK` passa a ser o terceiro lugar com a mesma lista: anote isso.
- **Como verificar:** `POST /categorias` sem `tipoCusto` e um `INSERT` manual sem `tipo_custo` gravam o mesmo valor.

## COR-11. Semântica de `parcelas` indefinida

- **Prioridade:** média
- **Onde:**
  - `backend/src/db/init.sql:7` (comentário "0 = a vista").
  - `frontend/src/utils/despesas.js:67` (manda `0` quando vazio).
  - `frontend/src/components/ExpenseModal.jsx:82` (força mínimo 1).
  - `frontend/src/services/api.js:12-14` (fallback com `0`).
- **Problema:** o mesmo pagamento à vista pode chegar como 0 ou como 1.
- **Por que importa:** sem essa decisão, não dá para escrever o `.min()` do COR-1 nem o `CHECK` do COR-7. E qualquer cálculo de "valor por parcela" divide por zero ou dá resultado diferente para o mesmo caso.
- **Direção:** decidir (recomendado: `parcelas >= 1`, com 1 = à vista, porque elimina a divisão por zero) e alinhar banco, Zod e front. Migre as linhas antigas com `UPDATE ... SET parcelas = 1 WHERE parcelas = 0 OR parcelas IS NULL` dentro da migration.
- **Como verificar:** `POST` com `parcelas: 0` devolve 400, e nenhuma linha do banco tem `parcelas < 1`.

## COR-12. Listagens sem `ORDER BY`

- **Prioridade:** média
- **Onde:** `backend/src/controllers/despesasController.js:13`, `backend/src/controllers/categoriasController.js:10`
- **Problema:** sem `ORDER BY`, o Postgres não garante a ordem. Depois de um UPDATE, a linha pode mudar de posição na lista.
- **Por que importa:** a lista "pula" na tela. E a paginação futura (CRI-8) fica inconsistente: itens repetidos ou perdidos entre as páginas.
- **Direção:** uma ordem determinística que termine numa coluna única (ex.: `id`). Quando existir `data` (CRI-5), use `data DESC, id DESC`.
- **Como verificar:** atualize a primeira despesa e liste de novo: a ordem não muda.

## COR-13. Configuração do banco frágil

- **Prioridade:** média
- **Onde:** `backend/src/db/db.js:5-11`, `.env.example:13-14`, `backend/server.js:6`
- **Problema:**
  - O `DATABASE_URL` do `.env.example` não é usado. São duas formas de configurar a mesma coisa, e elas podem divergir.
  - Nenhuma variável é validada: sem `POSTGRES_USER`, o app sobe e só falha na primeira query.
  - Não há `pool.on('error')`. Um erro num cliente ocioso (ex.: o Postgres reinicia) vira evento `error` sem listener e **derruba o processo**.
  - Não há encerramento limpo: nada de `pool.end()` no SIGTERM ou SIGINT.
- **Por que importa:** um erro de config deve falhar no boot, e não na primeira requisição do usuário. A queda por erro de cliente ocioso é difícil de diagnosticar.
- **Direção:** escolher **um** formato (URL ou variáveis separadas) e apagar o outro do `.env.example`. Validar o `process.env` com Zod no boot. Registrar o listener de erro do pool e o shutdown.
- **Estudar:** node-postgres "Pool events", "graceful shutdown Node".
- **Como verificar:** apague `POSTGRES_USER` do `.env`: `npm start` falha na hora, com mensagem clara.

## COR-14. Dependências sem uso ou no lugar errado

- **Prioridade:** baixa
- **Onde:** `package.json:21-24`
- **Problema:** `prisma@^8.0.0-rc.23` (release candidate, não usado), `jsonwebtoken` (não usado) e `nodemon` em `dependencies`.
- **Por que importa:** dependência sem uso aumenta a superfície de ataque, o `npm audit` e o tamanho do deploy. Uma RC pode quebrar sem aviso.
- **Direção:** remova o que não é usado. O `jsonwebtoken` volta no CRI-9, e o Prisma só se for a decisão D-pg. `nodemon` vai para `devDependencies`, ou troque por `node --watch`.
- **Como verificar:** `npm ls prisma jsonwebtoken` vazio, e `npm start` e `npm test` passando.

## COR-15. Detalhes menores

- **Prioridade:** baixa
- **Onde e problema:**
  - `backend/src/routes/index.js:5`: a raiz responde o texto `"Despesas"`, que não é JSON nem health check. Ver CRI-8.
  - `backend/src/app.js:5`: `express.json()` sem `limit` explícito. O padrão é 100kb; deixe a escolha visível (ex.: `10kb`).
  - `backend/src/controllers/despesasController.js:40`: `listarDespesasPorId` devolve um item só; o nome engana.
  - `backend/src/controllers/despesasController.js:3`: comentário morto com o formato antigo.
  - `CLAUDE.md`: a seção "Estado atual" está desatualizada.
- **Por que importa:** são pequenos, mas confundem quem lê, e o limite do body é uma decisão de segurança.
- **Direção:** resolva junto com o item maior que mexe no mesmo arquivo.
- **Como verificar:** um body de 20kb devolve 413 em JSON (depois do CRI-1).

---

## Achados do caçador de bugs

Varredura completa (front, back, banco, integração) feita em 2026-11-03. `npm test` 19/19 verde, `oxlint` 0 avisos. O Docker estava desligado, então os itens que dependem do Postgres foram deduzidos do código, sem execução.

### Já cobertos pelos itens COR/CRI acima

| Bug | Coberto por |
|---|---|
| BUG-2: o validator de despesa aceita valor negativo ou zero, parcelas 1.5, status `xyz` e strings vazias | COR-1, COR-7 |
| BUG-3: `/despesas/abc` e ids fora do range de integer viram 500 | COR-3 |
| BUG-4: `valor` 1e12 estoura `NUMERIC(10,2)` e dá 500; `10.999` é gravado como `11.00` sem aviso | COR-1 |
| BUG-5: `error.message` vaza; nome duplicado de categoria dá 500 em vez de 409 | COR-4, COR-8 |
| BUG-6: JSON malformado e rota inexistente devolvem HTML com stack | COR-5 |
| BUG-7: Pool sem `on('error')` e sem `connectionTimeoutMillis` | COR-13 |
| BUG-8: o GET devolve `valor` como string e o POST/PUT exige number | Decisão "Dinheiro" em `a-criar` |
| BUG-9: o default de `tipoCusto` diverge (Zod `fixo`, banco `variavel`) | COR-10 |
| BUG-10: zero testes de despesas, mock de DELETE sem `rowCount`, teste de cor que falha pelo motivo errado | COR-6, CRI-6 |
| BUG-11: `init.sql` com `IF NOT EXISTS` não migra um banco anterior à C6 | CRI-4 |
| BUG-13: a categoria da despesa é texto livre; `limiteMensal: -1` é aceito | COR-2, CRI-5 |
| BUG-14: parcelas 0 ou 1; editar uma despesa de cartão com 0 grava 1 sem o usuário mexer | COR-11 |
| BUG-15: não existe coluna de data; "mais recentes" ordena por `id` | CRI-5 |
| BUG-18: sem checagem de env, listagens sem `ORDER BY`, deps sem uso, sem CORS | COR-12, COR-13, COR-14 |

### Novos (só o caçador encontrou)

**BUG-1. Modo demonstração grava e apaga dados reais.** Severidade: **alta**. Camada: front/integração.
- **Onde:** `frontend/src/services/api.js:11-15`, `frontend/src/App.jsx:164`, `frontend/src/App.jsx:198`.
- **Problema:** os dados de exemplo usam ids reais (1, 2, 3). Em modo `demo`, "Marcar como pago", "Editar" e "Excluir" disparam `PUT`/`DELETE /despesas/{1,2,3}` sem checar o modo. O banner promete "Alterações não serão salvas".
- **Reproduzir:** suba o front com a API desligada; o fallback entra. Ligue a API sem recarregar a página. Marque "Conta de Energia" (id 2) como paga: o `PUT /despesas/2` sobrescreve a despesa real 2.
- **Direção:** no modo demo, não chamar a API (só estado local) e/ou usar ids que não colidem (negativos ou strings).

**BUG-12. `pagehide` envia o DELETE mas mantém o "Desfazer" ativo.** Severidade: baixa. Camada: front.
- **Onde:** `frontend/src/App.jsx:126-133`.
- **Problema:** depois do DELETE com keepalive, o `toastRef` continua com `pendingDeleteId`. Se a página volta pelo bfcache e a pessoa clica em "Desfazer", o item reaparece na tela, mas já foi apagado no servidor.
- **Direção:** limpar o toast e o pendente no `pagehide`.

**BUG-16. O README documenta payloads que a API rejeita.** Severidade: baixa. Camada: docs.
- **Onde:** `README.md:231-236` (`desc`, `value`, `category`, `payMethod`, `installment`, `"paid"`), `README.md:258-259` (snake_case), `README.md:124-125` (`paid`/`pending`), `README.md:212` (só cita o proxy `/despesas`).
- **Evidência:** os dois exemplos retornam `400 Dados invalidos`.
- **Direção:** atualizar o README para os nomes pós-C6.

**BUG-17. O toggle de status não trava clique duplo.** Severidade: baixa. Camada: front.
- **Onde:** `frontend/src/components/ExpenseDetailsModal.jsx:53-57`, `frontend/src/App.jsx:159-185`.
- **Problema:** dois cliques rápidos geram dois PUTs concorrentes, e a tela adota a resposta que chega por último. O PUT também reenvia o objeto inteiro e pode sobrescrever uma edição feita em outra aba.
- **Direção:** desabilitar o botão enquanto o PUT está em andamento. No backend, considerar `PATCH` só do status no futuro.

> BUG-1, BUG-12 e BUG-17 são de frontend e podem ir para o `frontend-especialista`.
