# Guia de correção dos itens críticos C1 a C6 (2026-10-29)

> Escrito pelo agente `mentor-backend`. Nenhum arquivo do projeto foi alterado. **Quem escreve o código é você**: aqui tem o diagnóstico, o conceito por trás e o caminho. Os trechos de código são só ilustrações genéricas, não a resposta.
>
> Base: `revisao-backend-2026-10-29.md`, seção CRÍTICO, conferida de novo contra o código atual.

## Estado de hoje (conferido)

- `npm start` falha com `ERR_MODULE_NOT_FOUND: Cannot find module '...\backend\src\db\db.js' imported from ...\despesasController.js`.
- `npm test` dá 3 arquivos e 3 testes falhando, todos com `Cannot find module '/src/controllers/...'` ou `'/src/validators/...'`.
- **Os seis itens continuam no código.** As diferenças em relação ao relatório:
  - O `backend/docker-compose.yml` **já aponta para `../.env`**, mas essa mudança ainda não foi commitada.
  - O `.env` da raiz não define `POSTGRES_HOST`, `POSTGRES_PORT` nem `PORT`. Então valem os padrões do `db.js` (`localhost` e `5434`) e o `3000` fixo do `server.js`.
  - O C4 tem um problema a mais: o INSERT e o UPDATE de categorias usam uma coluna `tipo` **que não existe na tabela**.
  - Surgiu um problema novo ligado ao C1: existe um `backend/node_modules` **sem** `backend/package.json`. Detalhes no C1.

## Ordem recomendada

| # | Item | Depende de | Motivo da posição |
|---|------|-----------|-------------------|
| 1 | **C1** caminhos, `.env` e `db.js` | nada | Sem ele nenhum módulo carrega, nem os testes. |
| 2 | **C2** validator de categorias | C1 | Hoje esse validator quebrado não derruba o servidor só porque **ninguém importa** as rotas de categorias. Quando o C3 registrar essas rotas, o servidor passa a cair na inicialização. Por isso o C2 vem antes do C3. |
| 3 | **C3** rotas de categorias | C2 | Só depois dele dá para testar categorias por HTTP (`curl`). |
| 4 | **C4** controller de categorias | C2, C3 | O formato do body (sem `tipo`, com `ativo`) é definido no C2. A rota precisa existir para você testar. |
| 5 | **C5** checagens de 404 em despesas | C1 | Não depende de categorias. Faça logo depois do C4, porque o conceito é o mesmo (404, `rowCount`). |
| 6 | **C6** nomes de colunas e contrato | C1 a C5 | Mexe no schema, no SQL, no validator, nos testes e no frontend. Se você fizer isso com o resto já funcionando, qualquer erro novo só pode vir dessa mudança. |

Faça **um commit por item** e rode `npm test` no fim de cada um.

> **Sobre os `curl`:** os comandos deste guia estão na sintaxe do **Git Bash**. No PowerShell, `curl` pode ser um alias do `Invoke-WebRequest`, e as aspas do JSON viram um problema. Se usar o PowerShell, chame `curl.exe` e coloque o JSON num arquivo: `curl.exe -X POST ... -d "@body.json"`.

---

## C1. Caminhos de import, `.env` e `db.js`

### Diagnóstico

- `backend/src/controllers/categoriasController.js:1` e `despesasController.js:2` importam `../db/db.js`. A partir de `backend/src/controllers/`, isso aponta para `backend/src/db/db.js`, que não existe. O arquivo real está em `src/db/db.js`, **na raiz**.
- Os testes em `tests/` importam `../src/...`, que a partir de `tests/` vira `<raiz>/src/...`. Na raiz só existe `src/db/`, então `../src/controllers` e `../src/validators` não existem. Os pontos são:
  - `categorias.controller.test.js:2-3,6`
  - `categorias.routes.test.js:4-5,8`
  - `categorias.validator.test.js:13,40,68`
- `src/db/db.js:1` carrega o `dotenv`. Como o `Pool` lê o `process.env` no topo do módulo, tudo depende de **quando** esse import roda.
- Existem dois `.env` idênticos (`.env` e `backend/.env`). A decisão já tomada é manter só o da raiz.
- **Novo:** existe `backend/node_modules` (322 pacotes, cerca de 1,4 GB, com `express`, `zod`, `dotenv` e `vitest`, mas sem `pg`) e **nenhum** `backend/package.json`. É sobra de algum `npm install` rodado dentro de `backend/`.

### Por que acontece

**1. Import relativo no ESM é resolvido a partir do arquivo que importa.** Ele não depende da pasta onde você rodou o `node` nem da raiz do projeto. Por baixo, o Node faz algo equivalente a isto:

```js
new URL('../db/db.js', 'file:///C:/dev/controle-financeiro/backend/src/controllers/categoriasController.js').href
// -> file:///C:/dev/controle-financeiro/backend/src/db/db.js
```

Rode isso no REPL do Node (`node`) e veja com seus olhos. No ESM, a extensão `.js` também é obrigatória.

**2. O `dotenv` e o Docker Compose procuram o `.env` em lugares diferentes.**

- `import 'dotenv/config'` procura `.env` em `process.cwd()`, a pasta de onde você **rodou** o comando. Com `npm start` na raiz, ele acha o `.env` da raiz.
- O `env_file` do Compose é resolvido a partir da **pasta do `docker-compose.yml`**, ou seja, `backend/`. Por isso o caminho precisa ser `../.env`.

São duas regras diferentes, e é por isso que alguém acabou criando dois `.env`.

**3. A ordem de avaliação no ESM.** Os `import` são resolvidos e **executados antes** do corpo do módulo, em profundidade e na ordem em que aparecem. Hoje o `server.js` importa `app`, que importa `routes`, depois os controllers e por fim o `db.js`. O `db.js` executa `new Pool({...process.env...})` no topo. Então:

- `import 'dotenv/config'` como **primeira linha** do `server.js` roda antes de toda essa árvore. Funciona.
- `import dotenv from 'dotenv'` seguido de `dotenv.config()` no corpo do `server.js` roda **depois** de a árvore toda já ter sido avaliada. O `Pool` já foi criado com `undefined`.

**4. A resolução de pacotes sobe pelas pastas.** Para `import express from 'express'`, o Node procura `node_modules` na pasta do arquivo e vai subindo. Um arquivo em `backend/src/` encontra **primeiro** o `backend/node_modules`. Como esse `node_modules` não tem `package.json` controlando versões, você passa a ter duas cópias de `zod`, `express` e `vitest`, que podem divergir sem você ver. Isso afeta principalmente os testes que você vai mover para `backend/tests/`: eles importariam um `vitest` diferente do que está rodando, e duas instâncias do vitest costumam dar erros estranhos.

### Passo a passo

1. Apague `backend/node_modules`, que não pertence a nenhum `package.json`. As dependências ficam só na raiz, que é onde está o `package.json`.
2. Mova o `src/db/db.js` para `backend/src/db/db.js`. Use `git mv` para preservar o histórico. Os imports `../db/db.js` dos controllers passam a funcionar **sem edição**.
3. Mova o `src/db/init.sql` para `backend/src/db/init.sql`, junto do `db.js`. Depois disso a pasta `src/` da raiz fica vazia: remova.
4. Mova a pasta `tests/` para `backend/tests/`. Repare que os `../src/...` dos testes **passam a estar certos**, porque agora são relativos a `backend/tests/`. Confira que o caminho do `vi.mock(...)` aponta para o **mesmo arquivo** que o controller importa: o `vi.mock` resolve o caminho a partir do arquivo de teste, e o mock só funciona se os dois caminhos chegarem ao mesmo módulo.
5. Tire o `import 'dotenv/config'` do `db.js` e coloque-o como **primeira linha** do `backend/server.js`.
6. (Opcional, mas já que você está ali, é o M5) Faça a porta vir do ambiente, com 3000 como padrão.
7. Apague o `backend/.env` e commite a mudança do compose para `../.env`. O padrão `.env` do `.gitignore` vale para qualquer pasta. Confira com `git check-ignore -v .env`.
8. Não precisa configurar o vitest. Por padrão, ele procura `**/*.test.js` fora de `node_modules`, então o `npm test` na raiz encontra `backend/tests/`.

### Como verificar

```bash
npm install                 # na raiz, garante que tudo está no node_modules da raiz
npm start                   # deve imprimir "Servidor rodando na porta: 3000"
```

O `npm start` sobe **mesmo com o Postgres desligado**, porque o `Pool` só abre conexão na primeira query. Para provar que o `.env` foi lido:

```bash
docker compose -f backend/docker-compose.yml up -d
docker exec postgres-dev printenv POSTGRES_DB    # prova que o compose leu ../.env
curl -i http://localhost:3000/despesas
```

Respostas possíveis para o `curl` acima:

- `200 []`: conectou e a tabela existe.
- `500` com `relation "despesas" does not exist`: conectou, mas o `init.sql` ainda não foi aplicado (veja o checklist final).
- `500` com erro de senha ou autenticação: o `dotenv` não carregou a tempo.

Rode `npm test`. O erro **deve mudar** de "Cannot find module" para falhas reais, que são os próximos itens:

Simulei esse layout numa cópia temporária, fora do projeto. O servidor sobe, e o `npm test` fica com **4 falhas e 15 testes passando**:

- os 3 testes do validator falham com `ReferenceError: z is not defined`, que é o **C2**;
- `deletarCategoria > deve deletar ... 204` falha porque o `pool.query` foi chamado com `[undefined]` em vez de `['1']`, que é o **C4** (a desestruturação do `id`).

Se você vir exatamente isso, o C1 está certo.

### Pergunta de fixação

Se você rodar `cd backend && node server.js`, o que acontece com o `dotenv`, e por quê? Como `node --env-file=../.env server.js` resolveria isso sem pacote nenhum?

---

## C2. `categoriasValidator.js` quebrado

### Diagnóstico (`backend/src/validators/categoriasValidator.js`)

- `:1` `export * as z from 'zod'` **reexporta** o Zod em vez de importar.
- `:5` `z.Object` e `:10` `z.Number` não existem. Conferi no Zod 4.6.7 instalado: os dois são `undefined`.
- `:11` `z.enum()` está sem valores. No Zod 4.6.7 isso **lança erro na hora de criar o schema**: `Cannot convert undefined or null to object`.
- `:7` o campo `tipo` não existe na tabela `categorias`. Os campos `ativo` e `icone` existem na tabela e não estão no schema.
- `:24` não chama `next()`.
- O teste `categorias.validator.test.js:16-22` manda um body **sem** `tipo`, `ativo` e `icone` e espera que ele passe. Então esses campos não podem ser obrigatórios.

### Por que acontece

- **Reexportar e importar são coisas diferentes.** `export * as z from 'zod'` cria um export chamado `z` **para quem importar este arquivo**, mas não cria a variável `z` **dentro** dele. É como pôr um produto na vitrine para os outros sem ficar com um para você. Quando a linha 5 é avaliada, dá `ReferenceError: z is not defined`, e o módulo inteiro falha ao carregar. Compare com a linha 1 do `despesasValidator.js`.
- **JavaScript diferencia maiúsculas de minúsculas.** A API do Zod é `z.object`, `z.string` e `z.number`. Com o import corrigido, `z.Object(...)` vira `TypeError: z.Object is not a function`.
- **O `z.enum` recebe um array com os valores aceitos.** Sem esse array, ele não tem o que aceitar.
- **O schema deve espelhar a tabela.** Um campo que não existe no banco (`tipo`) vai virar erro no SQL lá no C4.
- **`.optional()`, `.default()` e o `DEFAULT` do banco não são a mesma coisa.** Este ponto é sutil e importante:
  - O `pg` converte `undefined` em `NULL` ao montar a query.
  - Num `INSERT`, um `NULL` explícito **vence** o `DEFAULT` da coluna.
  - Então, se `ativo` chegar `undefined` e você mandar o valor no INSERT, o banco grava `NULL`, e não o `TRUE` do default.
  - Você tem duas saídas: usar `.default(...)` no Zod, como o `cor` já faz, ou não incluir a coluna no INSERT.
- **O `next()` é o que faz a cadeia de middlewares andar.** Cada middleware precisa encerrar a resposta **ou** chamar `next()`. Se não fizer nenhum dos dois, o cliente fica esperando até o timeout. O `despesasValidator.js:26` faz isso certo: compare os dois arquivos.

### Passo a passo

1. Troque a linha 1 por um **import** do Zod.
2. Corrija para minúsculas: `object` e `number`.
3. Dê ao `z.enum` os valores `'fixo'` e `'variavel'`, com padrão `'variavel'` igual ao do banco.
4. Remova `tipo`. Adicione `ativo` (booleano, padrão `true`) e `icone` (string de até 30 caracteres, padrão `'tag'`), espelhando o `init.sql`.
5. `descricao` e `limite_mensal` aceitam NULL no banco. Decida se são opcionais (`.optional()`).
6. Pense em limitar o `nome` com `.max(50)`. A coluna é `VARCHAR(50)`; sem o limite, um nome maior vira erro do banco (`22001`) em vez de um 400 claro. Isso é uma prévia do A2.
7. Chame `next()` depois de `req.body = validacao.data`.

Exemplo **genérico**, com outro domínio, só para mostrar a sintaxe:

```js
const tarefaSchema = z.object({
  titulo: z.string().max(50),
  prioridade: z.enum(['baixa', 'alta']).default('baixa'),
  nota: z.number().optional(),
})
```

### Como verificar

```bash
npm test     # os 3 testes de categorias.validator.test.js devem passar
node --input-type=module -e "import s from './backend/src/validators/categoriasValidator.js'; console.log(s.parse({ nome: 'Teste' }))"
```

O segundo comando deve imprimir o objeto já com os padrões aplicados (`cor`, `tipo_custo`, `ativo`, `icone`).

### Pergunta de fixação

Com `ativo: z.boolean().optional()` e com `ativo: z.boolean().default(true)`, o que chega ao controller quando o cliente não manda `ativo`? E o que o Postgres grava em cada caso?

---

## C3. `cateoriasRoutes.js` nunca é usado

### Diagnóstico

- `backend/src/routes/cateoriasRoutes.js`:
  - O arquivo termina na linha 11 **sem** `export default routes`.
  - `:8` usa `validarCategoria` num GET.
  - `:9` a rota `'categorias/:id'` está sem `/` inicial e tem `:id` num POST de criação.
  - `:10` tem o erro de digitação `/categiras/:id`.
  - POST e PUT estão sem validator. O nome do arquivo também tem erro de digitação.
- `backend/src/routes/index.js:1,5` importa e registra **só** as rotas de despesas.

### Por que acontece

- **Import default exige export default.** No ESM, `import x from './arquivo.js'` falha na fase de **link**, antes de qualquer código rodar, se o arquivo não tiver `export default`. O erro é `SyntaxError: The requested module ... does not provide an export named 'default'`. Ou seja, o servidor nem sobe.
- **Todo caminho no Express começa com `/`.** O `req.path` sempre começa com `/`, então o padrão `'categorias/:id'` nunca casa com nada. O resultado é um 404 silencioso, sem erro nenhum.
- **REST: quem cria o id é o banco.** O POST vai na **coleção** (`/categorias`), porque o `SERIAL` gera o id. O `:id` só faz sentido para ler, alterar ou apagar **um** recurso que já existe.
- **GET não tem body.** O `validarCategoria` valida `req.body`. Num GET, o body vem vazio e o `nome` é obrigatório, então **todo** `GET /categorias/1` responderia 400. Num GET, quem precisa de validação é o `params.id`, e isso fica para o A2. Por enquanto basta tirar o validator do GET.
- Um `Router` só entra em ação quando é montado com `app.use(router)`. Um arquivo de rotas que ninguém importa é código morto.

### Passo a passo

1. Renomeie o arquivo para `categoriasRoutes.js` com `git mv`.
2. Corrija os caminhos: POST em `/categorias` (sem `:id`) e PUT em `/categorias/:id`.
3. Tire o validator do GET e coloque-o no POST e no PUT.
4. Adicione o `export default`.
5. Em `routes/index.js`, importe e registre o router de categorias, do mesmo jeito que o de despesas.

> O proxy do Vite (`frontend/vite.config.js`) só repassa `/despesas`. Quando o frontend for usar categorias, vai precisar de uma entrada para `/categorias`. Fica só como lembrete: não é para fazer agora.

### Como verificar

```bash
npm start
curl -i http://localhost:3000/categorias
curl -i -X POST http://localhost:3000/categorias -H "Content-Type: application/json" -d '{}'
```

- O primeiro **não** pode responder `404 Cannot GET /categorias` (HTML do Express). Esse 404 quer dizer "rota não registrada". Se responder 200, ou 500 com erro de banco, a rota existe. Essa diferença já é um diagnóstico.
- O segundo deve responder `400` com a lista `erros`, o que prova que o validator está no POST.

### Pergunta de fixação

Por que um `GET /categorias/1` com o `validarCategoria` responderia 400 mesmo com o id certo?

---

## C4. `categoriasController.js`: as queries não recebem os valores

### Diagnóstico (`backend/src/controllers/categoriasController.js`)

- `:17-19` não devolve 404: se o registro não existe, `rows[0]` é `undefined` e a resposta é um 200 vazio.
- `:27-28` o INSERT não tem o array de valores. O código **nem lê** o `req.body`.
- **Novo:** `:27` e `:44` usam a coluna `tipo`, que não existe na tabela. Depois de corrigir os valores, o próximo erro seria `column "tipo" of relation "categorias" does not exist` (código `42703`).
- `:39` e `:57` `const { id } = req.params.id`.
- `:42-46` o UPDATE não tem o array de valores e não devolve 404.
- `:58-60` o DELETE não devolve 404 e usa `.status(204).json(...)`.

### Por que acontece

- **Na query parametrizada, o SQL e os valores viajam separados.** O `pg` manda o texto com `$1..$n` numa mensagem e os valores em outra (o *extended protocol*: Parse, Bind e Execute). Sem o array, o Bind leva 0 valores, e o Postgres responde `bind message supplies 0 parameters, but prepared statement "" requires 7`. Essa separação é **exatamente** o que impede SQL injection. Por isso o número de `$n` e o tamanho do array precisam bater, **na mesma ordem**.
- **A desestruturação lê uma propriedade do valor da direita.** `const { id } = obj` é o mesmo que `const id = obj.id`.
  - `req.params.id` já é a string `'1'`. Então `const { id } = '1'` lê `'1'.id`, que é `undefined`.
  - Não dá erro, porque o JS "embrulha" a string num objeto.
  - O `pg` manda `NULL`, e `WHERE id = NULL` não casa com nada. Falha silenciosa.
  - Teste no REPL: `const { id } = '42'; id`.
- **"Não encontrei" não é erro para o banco.** Um SELECT sem linhas é um resultado válido e vazio. Quem decide que isso é um 404 é a sua API.
- **O 204 No Content não tem corpo**, por definição (RFC 9110, seção 15.3.5). O Express descarta o corpo de uma resposta 204. Então `.json(...)` engana quem lê o código. Use `res.sendStatus(204)` ou `res.status(204).end()`.
- **Um DELETE sem `RETURNING` sempre devolve `rows = []`.** Para saber se apagou alguma coisa, olhe o `rowCount`, que é o número de linhas afetadas. É o mesmo conceito do C5.

### Passo a passo

1. **Buscar por id:** se não vier linha, responda 404 com uma mensagem. Use o mesmo formato das despesas por enquanto; o A1 padroniza isso depois.
2. **Criar:**
   - Desestruture o `req.body` sem `tipo`.
   - Tire `tipo` da lista de colunas.
   - Passe o array de valores **na mesma ordem** das colunas.
   - Decida se `icone` entra no INSERT.
   - Conte: o número de `$n` deve ser igual ao tamanho do array.
3. **Atualizar:**
   - Corrija a desestruturação do `id`.
   - Tire `tipo` do SET e **renumere** os placeholders. O `$8` do `id` muda.
   - Passe o array com o `id` no fim.
   - Se não vier linha, responda 404. O `despesasController.js:73` já faz isso certo e serve de modelo.
4. **Deletar:** corrija o `id`, use o `rowCount` para decidir entre 404 e 204, e responda o 204 **sem corpo**.
5. **Testes (`backend/tests/categorias.controller.test.js`):**
   - O mock do delete (`:173`) devolve `{ rows: [{ id: 1 }] }`, **sem `rowCount`**. Depois da sua mudança, `rowCount` vai ser `undefined` e o teste vai receber 404. Ajuste o mock para o formato que o `pg` **realmente** devolve num DELETE. Esta é a lição do M1: um mock que não imita o contrato real mente para você.
   - No teste de criar (`:116-119`), acrescente uma verificação de que o `pool.query` foi chamado **com um array de valores**. Era essa verificação que teria pegado o bug original.

### Como verificar

Com o banco no ar:

```bash
curl -i -X POST http://localhost:3000/categorias -H "Content-Type: application/json" \
  -d '{"nome":"Mercado","descricao":"Compras do mes","limite_mensal":800,"tipo_custo":"variavel"}'
# 201, com id, ativo=true, icone='tag' e cor='#64748B'

curl -i http://localhost:3000/categorias/1         # 200
curl -i http://localhost:3000/categorias/99999     # 404
curl -i -X PUT http://localhost:3000/categorias/1 -H "Content-Type: application/json" \
  -d '{"nome":"Supermercado","tipo_custo":"fixo"}'  # 200, com os campos novos
curl -i -X DELETE http://localhost:3000/categorias/1   # 204, sem corpo
curl -i -X DELETE http://localhost:3000/categorias/1   # 404 (já apagado)
```

Bônus: crie duas vezes a mesma categoria. Hoje a segunda dá 500 com a mensagem do `UNIQUE` (código `23505`). No A1, isso vira 409.

### Pergunta de fixação

Por que `const { id } = req.params.id` não lança erro? E que valor o Postgres recebe no `$1`?

---

## C5. `despesasController.js`: checagens de 404 que nunca disparam

### Diagnóstico (`backend/src/controllers/despesasController.js`)

- `:45` `if(!rows.length === 0)`.
- `:87` e `:92` desestruturam `rows` de um DELETE sem `RETURNING` e testam `rows === 0`.
- `:1` importa `despesaValidator` (que, como import default, é o **schema**) e não usa.

### Por que acontece

- **Precedência de operadores.** O `!` (unário) vem antes do `===`. Então `!rows.length === 0` é lido como `(!rows.length) === 0`:
  - `rows = []`: `!0` vale `true`, e `true === 0` vale `false`.
  - `rows = [x]`: `!1` vale `false`, e `false === 0` vale `false`.
  - O `===` não converte tipos, então um booleano **nunca** é igual a um número. A condição é sempre falsa.
  - As formas certas são `rows.length === 0` **ou** `!rows.length`. Escolha uma; não misture as duas.
- **`rows === 0` compara um array com um número**, o que também é sempre falso. E, mesmo que a comparação estivesse certa, um DELETE sem `RETURNING` devolve `rows = []` tenha apagado ou não. A informação certa é o `rowCount`, presente no objeto `Result` do `pg`: num SELECT é o número de linhas retornadas; num UPDATE ou DELETE, o número de linhas afetadas.
- **Import sem uso é ruído e acoplamento.** O controller não valida nada; quem valida é a rota. Um linter (`no-unused-vars` do ESLint) pegaria isso sozinho.

### Passo a passo

1. Corrija a condição da linha 45.
2. No DELETE, use o `rowCount` em vez do `rows`.
3. Apague o import da linha 1.
4. (Opcional, é o M2) O DELETE de despesas devolve 200 com mensagem, e o de categorias devolve 204. O frontend **não** usa o DELETE hoje (o `api.js` não tem essa função), então padronizar em 204 agora não quebra nada.

### Como verificar

```bash
node -e "const rows = []; console.log(!rows.length === 0, rows.length === 0)"   # false true
curl -i http://localhost:3000/despesas/99999              # 404
curl -i -X DELETE http://localhost:3000/despesas/99999    # 404
```

### Pergunta de fixação

Com `rows = []`, escreva passo a passo a ordem de avaliação de `!rows.length === 0`. Depois diga: o que mudaria se fosse `==` em vez de `===`?

---

## C6. Nomes de colunas e o contrato com o frontend

### Diagnóstico

- `backend/src/db/init.sql` (hoje ainda em `src/db/init.sql`):
  - `:3` `"desc"` com aspas (palavra reservada).
  - `:4-8` nomes em inglês (`value`, `category`, `payMethod`, `installment`), enquanto `categorias` (`:11-20`) usa português em snake_case.
- `:6` `payMethod` sem aspas vira, na prática, a coluna `paymethod`.
- `despesasController.js:25` e `:65` usam `payMethod` sem aspas. Funciona porque os dois lados viram minúsculas. Mas o `RETURNING *` e o `SELECT *` devolvem `{ "paymethod": ... }`, e o frontend lê `payMethod`, que chega `undefined`.
- `despesasController.js:25` e `:62` precisam escrever `"desc"` entre aspas para sempre.

### Por que acontece

- **O Postgres converte para minúsculas todo identificador sem aspas.** (O padrão SQL manda converter para maiúsculas; o Postgres faz o contrário.) Com aspas, ele preserva a caixa e aceita palavras reservadas. Só que, uma vez criado com aspas, o nome **tem** de ser escrito com aspas sempre. `desc` é reservada por causa do `ORDER BY ... DESC`.
- **Por que não aparece erro de SQL:** o CREATE e o INSERT estão sem aspas, então os dois viram `paymethod`. O bug só aparece nas **chaves do JSON**, porque o `pg` usa o nome da coluna como está no banco.
- **Por que não usar camelCase com aspas no banco:** toda query, todo `psql` manual e toda ferramenta teria de usar aspas para sempre. Com snake_case em minúsculas, você nunca precisa de aspas.
- **A armadilha do alias:** `AS metodoPagamento` **sem** aspas também vira minúsculas (`metodopagamento`). O alias que vai para o JSON precisa de aspas: `AS "metodoPagamento"`.

### A convenção recomendada (uma só)

- **Banco:** snake_case, minúsculas, sem aspas, em **português**. O domínio já está em português (`categorias`, `nome`, `descricao`, `limite_mensal`).
- **API (JSON):** camelCase em português.
- **A tradução fica na camada de dados**, com alias no `SELECT` e no `RETURNING`. Com isso, `SELECT *` e `RETURNING *` deixam de existir naturalmente, porque você passa a listar as colunas. Isso também já adianta o M3 (não expor colunas a mais). Dica: guarde a lista de colunas com alias numa constante e reuse no SELECT e no RETURNING.

| Hoje no banco | Banco novo | JSON da API |
|---|---|---|
| `"desc"` | `descricao` | `descricao` |
| `value` | `valor` | `valor` |
| `category` | `categoria` | `categoria` |
| `payMethod` (na real, `paymethod`) | `metodo_pagamento` | `metodoPagamento` |
| `installment` | `parcelas` | `parcelas` |
| `status` | `status` | `status` |
| `limite_mensal` (categorias) | `limite_mensal` | `limiteMensal` |
| `tipo_custo` (categorias) | `tipo_custo` | `tipoCusto` |

Observações:

- **Categorias também entram na convenção**, senão a API fica meio snake e meio camel. O frontend ainda não usa categorias, então o custo é ajustar o `categoriasValidator.js`, os aliases e os testes (que hoje mandam `limite_mensal` e `tipo_custo`).
- **Valores do `status`:** hoje são `'paid'` e `'pending'`. Para ter um idioma só, recomendo `'pago'` e `'pendente'`. O contrato vai quebrar de qualquer jeito nesta etapa, então é melhor quebrar uma vez só. A decisão é sua; se mantiver em inglês, registre isso como exceção consciente.
- **`categoria` como texto livre é provisório.** No A3 ela vira `categoria_id` com FK. Não invista em nada em cima dela agora.
- **O `despesasValidator.js` passa a usar os nomes do JSON** (`descricao`, `valor`, `metodoPagamento`...), e o controller mapeia cada campo do body para a sua coluna.

### Como aplicar a mudança no schema em desenvolvimento

O `CREATE TABLE IF NOT EXISTS` **não altera** uma tabela que já existe. Rodar o `init.sql` de novo não muda nada. Você tem duas opções:

**Opção A: recriar o volume**

```bash
docker compose -f backend/docker-compose.yml down -v    # -v apaga o volume postgres_data
docker compose -f backend/docker-compose.yml up -d
# depois, aplique o init.sql de novo (veja o checklist)
```

- **Prós:** o `init.sql` continua sendo a única fonte da verdade, e você prova que ele cria tudo do zero. É simples.
- **Contras:** apaga **todos** os dados. Em produção ou num time, é impensável.

**Opção B: `ALTER TABLE ... RENAME COLUMN`**

```sql
ALTER TABLE despesas RENAME COLUMN "desc" TO descricao;   -- exemplo de uma coluna
```

- **Prós:** preserva os dados. É assim que se trabalha num banco real.
- **Contras:**
  - Você precisa **também** editar o `init.sql` à mão, e as duas fontes podem divergir.
  - Ninguém registra quais ALTERs já rodaram em qual banco.
  - Esse é exatamente o problema que as **migrations** resolvem (A4).

**Recomendação:** hoje o banco só tem dados de teste, então use a **Opção A** agora. A próxima mudança de schema (data, FK e CHECKs do A3) já deve ser feita com migrations.

### O que o frontend vai precisar ajustar (não edite agora; só para planejar)

Os nomes do **estado local** dos componentes (`desc`, `payMethod`...) podem continuar como estão. O que muda são as **chaves** que vão para a API e as que são lidas da resposta.

| Arquivo | Linhas | O que muda |
|---|---|---|
| `frontend/src/services/api.js` | 9-31 | Dados de fallback: chaves e `status`. |
| | 76-83 | Chaves do payload: `desc`, `value`, `category`, `payMethod`, `installment`. |
| | 98 | Lê `errJson?.erros`; atenção quando o A1 mudar o formato do erro. |
| `frontend/src/components/ExpenseModal.jsx` | 58-62 | Chaves do payload. |
| | 32, 202-217 | Valores de `status`, se mudarem. |
| `frontend/src/App.jsx` | 63 | `created.desc`. |
| | 86, 98-99, 109-110 | `category` e `desc`. |
| | 104-105 | `status`. |
| | 117-118 | `value`. |
| `frontend/src/components/ExpenseTable.jsx` | 43, 51, 57, 63, 67, 76 | `status`, `desc`, `category`, `payMethod`, `installment`, `value`. |
| `frontend/src/components/ExpenseDetailsModal.jsx` | 14, 22, 32, 46, 56, 67 | Os mesmos campos. |
| `frontend/src/components/MetricsCards.jsx` | 12, 14-18 | `value` e `status`. |

Dois pontos para decidir junto com o frontend:

- No frontend, `installment: 0` quer dizer "à vista". Já o A3 sugere `CHECK (parcelas >= 1)`. Decida agora o que `parcelas` significa: "número de parcelas", com 1 sendo à vista, ou "0 = à vista".
- O `NUMERIC` chega como string (`"450.00"`). O frontend usa `Number(...)`, então funciona, mas o contrato de dinheiro é uma decisão pendente (M2).

Mude o backend e o frontend **no mesmo commit ou PR**. Atenção: o fallback local do `createDespesa` (B4) **esconde** a quebra. Se o POST falhar, a tela finge que salvou. Teste o backend com `curl` antes de confiar na tela.

### Como verificar

```bash
docker exec -it postgres-dev psql -U <seu_usuario> -d <seu_banco> -c "\d despesas"   # colunas em snake_case
curl -s -X POST http://localhost:3000/despesas -H "Content-Type: application/json" \
  -d '{"descricao":"Mercado","valor":250.5,"categoria":"Alimentação","metodoPagamento":"PIX","parcelas":1,"status":"pago"}'
# o JSON de resposta deve ter a chave "metodoPagamento" (e não "paymethod")
```

### Pergunta de fixação

Se você escrever `SELECT metodo_pagamento AS metodoPagamento` (sem aspas no alias), qual chave chega ao JSON? Por quê?

---

## Checklist final

**Estrutura**

- [ ] A raiz não tem mais `src/` nem `tests/`. Os testes estão em `backend/tests/`, e o `db.js` e o `init.sql` estão em `backend/src/db/`.
- [ ] O `backend/.env` e o `backend/node_modules` foram apagados.
- [ ] O `git status` não mostra nenhum `.env`.

**Banco no ar, com o schema aplicado**

```bash
docker compose -f backend/docker-compose.yml up -d
# Git Bash:
docker exec -i postgres-dev psql -U <seu_usuario> -d <seu_banco> < backend/src/db/init.sql
# PowerShell (não tem redirecionamento com <):
#   Get-Content backend/src/db/init.sql | docker exec -i postgres-dev psql -U <seu_usuario> -d <seu_banco>
```

**Aplicação**

- [ ] `npm start` imprime "Servidor rodando na porta: 3000".
- [ ] `npm test` passa sem falhas.

**CRUD de categorias** (com a convenção do C6 aplicada; se ainda não fez o C6 em categorias, troque `limiteMensal`/`tipoCusto` por `limite_mensal`/`tipo_custo`)

```bash
curl -i http://localhost:3000/categorias                                   # 200 []
curl -i -X POST http://localhost:3000/categorias -H "Content-Type: application/json" \
  -d '{"nome":"Moradia","descricao":"Aluguel e contas","limiteMensal":2000,"tipoCusto":"fixo"}'   # 201
curl -i -X POST http://localhost:3000/categorias -H "Content-Type: application/json" -d '{}'      # 400
curl -i http://localhost:3000/categorias/1                                 # 200
curl -i http://localhost:3000/categorias/99999                             # 404
curl -i -X PUT http://localhost:3000/categorias/1 -H "Content-Type: application/json" \
  -d '{"nome":"Casa","tipoCusto":"fixo"}'                                  # 200
curl -i -X DELETE http://localhost:3000/categorias/1                       # 204, sem corpo
curl -i -X DELETE http://localhost:3000/categorias/1                       # 404
```

**CRUD de despesas**

```bash
curl -i http://localhost:3000/despesas                                     # 200 []
curl -i -X POST http://localhost:3000/despesas -H "Content-Type: application/json" \
  -d '{"descricao":"Conta de luz","valor":185.3,"categoria":"Moradia","metodoPagamento":"Boleto","parcelas":1,"status":"pendente"}'  # 201, com "metodoPagamento"
curl -i -X POST http://localhost:3000/despesas -H "Content-Type: application/json" -d '{}'        # 400
curl -i http://localhost:3000/despesas/1                                   # 200
curl -i http://localhost:3000/despesas/99999                               # 404
curl -i -X PUT http://localhost:3000/despesas/1 -H "Content-Type: application/json" \
  -d '{"descricao":"Conta de luz","valor":190,"categoria":"Moradia","metodoPagamento":"PIX","parcelas":1,"status":"pago"}'          # 200
curl -i -X DELETE http://localhost:3000/despesas/1                         # 204 (ou 200, se não fez o passo 4 do C5)
curl -i -X DELETE http://localhost:3000/despesas/1                         # 404
```

O que **ainda vai estar feio** depois disso, e está certo que esteja, porque são os próximos itens:

- `GET /despesas/abc` dá 500 com a mensagem do banco (A1 e A2).
- Uma categoria com nome duplicado dá 500, e não 409 (A1).
- `valor` negativo é aceito (A2 e A3).

## Para estudar

- Node.js: "ECMAScript modules", seções *Import specifiers* e *Resolution algorithm*. Também a flag `--env-file`.
- MDN: "Operator precedence" e "Destructuring assignment".
- Zod 4: "Defining schemas", "Enums", ".optional() / .default()".
- Express 5: "Writing middleware" (`next`) e "Routing" (caminhos e `Router`).
- node-postgres: "Queries" (parameterized query) e "Result" (`rows`, `rowCount`).
- PostgreSQL: seção 4.1.1, "Identifiers and Key Words"; Apêndice C, "SQL Key Words"; `ALTER TABLE ... RENAME COLUMN`.
- RFC 9110, seção 15.3.5 (204 No Content).
