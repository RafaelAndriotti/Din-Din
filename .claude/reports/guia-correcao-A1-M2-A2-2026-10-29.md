# Guia de correção: erros centralizados (A1), respostas padronizadas (M2) e validação completa (A2) (2026-10-29)

> Escrito pelo agente `mentor-backend`. Nenhum arquivo do projeto foi alterado. **Quem escreve o código é você**: aqui estão o diagnóstico, o conceito por trás de cada item e o caminho. Os trechos de código são só ilustrações genéricas, de outro domínio, e não a resposta.
>
> Base: seções A1, A2, M2 e o "Roteiro sugerido" (etapas 2 e 3) de `revisao-backend-2026-10-29.md`, conferidas de novo contra o código atual. Formato igual ao do `guia-correcao-C1-C6-2026-10-29.md`.

## Estado de hoje (conferido)

- **As correções C2 a C6 estão na branch `backend`, e não na `main`.** A `main` (onde está o seu working tree) tem só o C1 e o commit do `CLAUDE.md`. Na `main`, o código ainda está como antes do guia anterior: `desc`, `cateoriasRoutes.js` sem export, etc. **Todas as linhas citadas neste guia se referem à branch `backend`** (commit `c796c1f`).
- Na branch `backend`, `npm test` passa: **3 arquivos e 19 testes**.
- Subi uma cópia da branch `backend` numa pasta temporária, com um Postgres 16 descartável (seu `postgres-dev` não foi tocado). Respostas reais de hoje:

| Requisição | Status hoje | Corpo hoje |
|---|---|---|
| `GET /despesas/abc` | 500 | `{"message":"erro interno no servidor","erro":"invalid input syntax for type integer: \"abc\""}` |
| `GET /despesas/99999999999` | 500 | `{"message":"erro interno no servidor","erro":"value \"99999999999\" is out of range for type integer"}` |
| `POST /categorias` com nome repetido | 500 | `{"message":"Erro interno do servidor","erro":"duplicate key value violates unique constraint \"categorias_nome_key\""}` |
| `POST /despesas` com `valor: -50`, `descricao: ""`, `parcelas: -3`, `status: "talvez"`, `metodoPagamento: "qualquer"` e campos extras `id` e `admin` | **201** | A despesa foi gravada com valor negativo e status `talvez`. |
| `POST /despesas` com `parcelas: 2.5` | 500 | `{"message":"Erro ao criar despesa","erro":"invalid input syntax for type integer: \"2.5\""}` |
| `POST /despesas` com `valor: 1e12` | 500 | `{"message":"Erro ao criar despesa","erro":"numeric field overflow"}` |
| `POST /despesas` com JSON quebrado (`{"descricao":`) | 400 | **HTML com o stack trace**, incluindo caminhos absolutos da sua máquina (`C:\dev\controle-financeiro\node_modules\body-parser\...`). |
| `GET /naoexiste` | 404 | HTML do Express (`Cannot GET /naoexiste`). |
| `POST /categorias` sem `tipoCusto` | 201 | `"tipoCusto":"fixo"`, embora o `DEFAULT` do banco seja `'variavel'`. |

Pontos bons, que você deve manter:

- O `server.js` faz o `listen` e o `app.js` só monta e exporta o `app`. É **exatamente** essa separação que permite testar o app real com o Supertest sem abrir porta.
- Os dois DELETE já respondem `204` sem corpo e usam `rowCount`. Parte do M2 já foi feita no C5.
- As constantes `COLUNAS` evitam `SELECT *` e já resolvem parte do M3.

---

## Decisões que você precisa tomar antes de começar

Anote a sua escolha em cada uma. Para cada item, indico a minha recomendação e o motivo, mas a decisão é sua.

| # | Decisão | Opções | Recomendo | Por quê |
|---|---|---|---|---|
| D1 | Como trazer C2 a C6 para a `main` | (a) abrir PR de `backend` para `main` e fazer o merge; (b) criar a branch deste guia a partir da `backend` | **(a)** | Senão você vai trabalhar em cima de código velho, e os números de linha deste guia não vão bater. |
| D2 | Formato do erro | Ver M2: manter `{message, erros}`; envelope `{ erro: { codigo, mensagem, detalhes } }`; ou RFC 9457 | **Envelope em português** | Um idioma só e um código estável para o frontend. Os detalhes estão no M2. |
| D3 | Status da falha de validação | 400 ou 422 | **400** | Os testes atuais já esperam 400. O frontend só olha `response.ok`. O 422 também é aceitável; o importante é usar **um** só. |
| D4 | Semântica de `parcelas` (pendente desde o C6) | "0 = à vista" (o que o frontend faz) ou "número de parcelas, 1 = à vista" | Decida agora | Isso define o `.min()` do Zod no A2 e o `CHECK` do A3. |
| D5 | `metodoPagamento` | `z.enum` com os rótulos que o frontend já envia (`'PIX'`, `'Cartão de Crédito'`...) ou com códigos estáveis (`'pix'`, `'cartao_credito'`...) | Os rótulos **agora**, registrados como dívida | Os códigos são melhores (ver A2), mas mudam o frontend. Se for mexer no frontend de qualquer jeito, prefira os códigos. |
| D6 | Campos desconhecidos no body | Descartar em silêncio (`z.object`) ou rejeitar com 400 (`z.strictObject`) | **Rejeitar** | Ver A2. |
| D7 | PATCH | Criar agora ou deixar para depois | **Depois** (desafio opcional no A2) | O PUT completo resolve o que o frontend usa hoje. |
| D8 | Default de `tipoCusto` | `'fixo'` ou `'variavel'` | **`'variavel'`** | É o que o `init.sql` diz, e foi o que o guia C2 pediu. Ver P1. |

---

## Ordem recomendada

| # | Item | Depende de | Motivo da posição |
|---|------|-----------|-------------------|
| 0 | Merge da `backend` na `main` (D1) | nada | Todo o resto parte do código com C2 a C6. |
| 1 | **P** pendências herdadas do C1 a C6 | 0 | O teste de delete hoje passa **por acidente** (ver P2). Se você fizer o A1 antes, ele quebra por um motivo que não tem nada a ver com o A1, e você perde tempo achando que errou o A1. |
| 2 | **A1** erros centralizados | P, D2 | Cria o lugar único por onde **todo** erro passa. M2 e A2 dependem dele. |
| 3 | **M2** respostas padronizadas | A1, D2, D3 | Com um só lugar formatando os erros, padronizar vira trocar uma função, não 15 `catch`. É aqui que o formato do 400 muda, e por isso é aqui que entra o ajuste do frontend. |
| 4 | **A2** validação completa | A1, M2, D4 a D7 | O `validate` genérico só **detecta** o erro e o entrega ao handler do A1, que já sabe formatar no padrão do M2. |

Faça **um commit por item** e rode `npm test` no fim de cada um. Sugestão de mensagens: `fix(P): ...`, `feat(A1): ...`, `refactor(M2): ...`, `feat(A2): ...`.

> **Sobre os `curl`:** os comandos estão na sintaxe do **Git Bash**. No PowerShell, `curl` pode ser um alias do `Invoke-WebRequest`, e as aspas do JSON viram um problema. Se usar o PowerShell, chame `curl.exe` e coloque o JSON num arquivo: `curl.exe -X POST ... -d "@body.json"`.

---

## P. Pendências herdadas do C1 a C6

### P1. Default de `tipoCusto` diferente no Zod e no banco

**Diagnóstico**

- `backend/src/validators/categoriasValidator.js:11` usa `z.enum(['fixo', 'variavel']).default('fixo')`.
- `backend/src/db/init.sql:18` usa `DEFAULT 'variavel'`.
- Conferido: um `POST /categorias` sem `tipoCusto` grava `"fixo"`.

**Por que acontece**

É a lição do C2 aplicada: o controller **sempre** manda o `$6` no INSERT. O `pg` nunca deixa a coluna "vazia" para o banco preencher. Então o `DEFAULT` do banco **nunca é usado** por essa rota, e quem manda é o `.default()` do Zod. Ter dois defaults diferentes é ter duas fontes da verdade. O dado gravado depende de **por onde** ele entrou: pela API sai `'fixo'`; por um `INSERT` manual ou por um seed sai `'variavel'`.

**Passo a passo**

1. Escolha um valor (D8) e deixe os dois iguais.
2. Pense numa regra para o futuro: quando o Zod e o banco tiverem default para a mesma coluna, **os dois precisam ser iguais**. O `CHECK (tipo_custo IN (...))` do A3 vai ser o terceiro lugar que repete esses valores. Anote isso para lembrar.

**Pergunta de fixação:** se você tirasse o `.default()` do Zod e deixasse `tipoCusto` opcional, o que o banco gravaria quando o cliente não mandasse o campo? Por quê?

### P2. O teste de delete de categorias passa por acidente

**Diagnóstico** (`backend/tests/categorias.controller.test.js`)

- `:173`: o mock devolve `{ rows: [{ id: 1 }] }`, **sem `rowCount`**. O controller (`categoriasController.js:70-72`) testa `rowCount === 0`; como `undefined === 0` é falso, ele segue para o 204.
- `:28-32`: o `res` falso tem `status`, `json` e `send`, mas **não tem `end`**. O controller chama `res.status(204).end()` (`:76`), e isso lança `TypeError: res.status(...).end is not a function`.
- Esse `TypeError` cai no `catch` (`:77-78`), que responde 500.
- O teste (`:181`) só verifica `toHaveBeenCalledWith(204)`, e o `status` **foi** chamado com 204 antes de quebrar.

Eu provei isso numa cópia: nesse teste, `res.status` é chamado com `[[204],[500]]`, e o `res.json` recebe `{"message":"Erro interno do servidor","erro":"res.status(...).end is not a function"}`. **O teste passa enquanto o controller responde 500.**

- Não existe teste de 404 no delete, nem no `categorias.controller.test.js` nem no `categorias.routes.test.js` (`:129-137`, que usa o mesmo mock sem `rowCount`).

**Por que importa**

- É a mesma lição do M1: um mock precisa imitar o **contrato real**. Num DELETE sem `RETURNING`, o `pg` devolve `rows: []` e `rowCount` com o número de linhas apagadas.
- O `try/catch` **escondeu** um bug do próprio teste. Quando você tirar o `try/catch` no A1, esse teste vai quebrar. Se ele quebrar no meio do A1, você vai achar que o erro é seu.
- `toHaveBeenCalledWith(204)` só diz "foi chamado com 204 **alguma vez**". Ele não diz "foi a resposta final".

**Passo a passo**

1. Faça o mock do delete devolver o formato real do `pg` para "apagou uma linha".
2. Dê ao `res` falso um `end`, como os outros métodos.
3. Fortaleça a verificação: confirme que o `end` foi chamado e que o `status` **não** foi chamado com 500. Pesquise `toHaveBeenCalledTimes` e `not.toHaveBeenCalledWith` no Vitest.
4. Crie o teste de 404: o mock simula "não apagou nada".
5. Repita os passos 1 e 4 no `categorias.routes.test.js`.

**Como verificar:** `npm test` continua verde, agora com 2 testes a mais. Para provar que o teste ficou honesto, quebre o controller de propósito (troque o `.end()` por `.endd()`): o teste **tem** de ficar vermelho. Depois desfaça.

**Pergunta de fixação:** por que `expect(res.status).toHaveBeenCalledWith(204)` passou mesmo com a resposta final sendo 500? Que asserção teria pegado isso?

---

## A1. Erros centralizados

### Diagnóstico

- Há 10 blocos `catch` que respondem `500` com `erro: error.message`:
  - `backend/src/controllers/despesasController.js:18-19, 35-36, 53-54, 81-82, 99-100`;
  - `backend/src/controllers/categoriasController.js:13-14, 27-28, 39-40, 61-62, 77-78`.
- O texto do Postgres vai direto para o cliente: nome de constraint (`categorias_nome_key`), tipo da coluna (`type integer`) e o valor enviado.
- O 404 está escrito à mão em 6 lugares, cada um com um texto diferente: `despesasController.js:47-49, 75-77, 94-96` e `categoriasController.js:22-24, 56-58, 72-74`.
- `backend/src/app.js` não tem middleware de erro nem 404 de rota. Por isso, JSON quebrado e rota inexistente caem no **handler padrão do Express**, que responde HTML. Sem `NODE_ENV=production`, esse HTML inclui o **stack trace** com caminhos da sua máquina.
- Nada é logado no servidor. Hoje, quando dá 500, a única pessoa que vê o erro é o cliente. Isso é o contrário do que deveria ser.

### Por que acontece

**1. O Express 5 já leva os erros de funções `async` até o middleware de erro.** Conferi no `router@2.2.0` instalado (`node_modules/router/lib/layer.js:145-170`). Quando o handler devolve uma Promise, o router faz `ret.then(null, err => next(err))`. A documentação oficial ("Error handling") diz o mesmo: *"Route handlers and middleware that return a Promise call `next(value)` automatically when they reject or throw an error"*. Na prática:

- `throw` dentro de uma função `async` vira uma Promise rejeitada, que chega ao `next(err)`.
- `throw` numa função síncrona também é pego, pelo `try/catch` do próprio router.
- **Exceção:** um erro lançado dentro de um callback que roda **depois** (`setTimeout`, evento de stream) **não** é pego. Lá você ainda precisa de `try/catch` e `next(err)`. Isso não acontece no seu código, porque o `pool.query` devolve Promise.
- No Express 4 isso **não** existia, e por isso tantos tutoriais ainda têm `try/catch` em todo handler, ou o pacote `express-async-errors`. No Express 5, esse `try/catch` é ruído.

**2. Um middleware de erro precisa ter exatamente 4 parâmetros.** O router olha o `fn.length` (`layer.js:109`): se não for 4, ele trata a função como middleware comum. Eu testei um "handler de erro" com 3 parâmetros `(err, req, res)`. Ele foi chamado para uma rota **inexistente**, como middleware normal: o `err` recebeu o `req`, e a resposta foi `res.status is not a function`. Então, mesmo que você não use o `next`, **declare os 4**.

**3. A ordem de registro é a ordem de execução.** O Express percorre a pilha de cima para baixo:

1. `express.json()`;
2. as rotas;
3. o **404 de rota**: um middleware comum, sem caminho, que só é alcançado se nenhuma rota respondeu;
4. o **middleware de erro**, por último.

Atenção ao Express 5: `app.all('*', ...)` **lança erro** na inicialização (`Missing parameter name at index 1: *`), porque o `path-to-regexp` novo exige curinga com nome. Para o 404, use `app.use(fn)` **sem caminho**.

**4. "Erro esperado" é diferente de "bug".** Esta é a ideia central do A1:

- **Erro operacional (esperado):** recurso não encontrado, nome duplicado, entrada inválida. A mensagem é **sua**, escrita para o cliente, e pode ir na resposta.
- **Erro de programação ou de infraestrutura:** `TypeError`, banco fora do ar, coluna que não existe. A mensagem é técnica, pode revelar detalhes internos e não ajuda o cliente em nada. Vai para o **log**, e o cliente recebe um 500 genérico.

Uma classe de erro própria (`AppError`) é o jeito de marcar "este erro é esperado e eu escrevi a mensagem". O handler pergunta `err instanceof AppError` e decide o que mostrar. Isso é OWASP API8 (Security Misconfiguration): não devolver detalhes internos.

Exemplo **genérico**, de outro domínio, só para mostrar a ideia de herança:

```js
class EmprestimoVencidoError extends Error {
  constructor(livroId) {
    super(`O empréstimo do livro ${livroId} está vencido`)
    this.name = 'EmprestimoVencidoError'
    this.statusCode = 422
  }
}
```

**5. O `pg` entrega um código padronizado em cada erro do banco.** Conferi no `pg-protocol@1.16.1` (`dist/parser.js:307-319`): o `DatabaseError` traz `code` (o SQLSTATE), `detail`, `constraint`, `table` e `column`. O `pg` exporta a classe (`pg.DatabaseError`). Os códigos abaixo foram **disparados de verdade** no Postgres 16 e conferidos no Apêndice A da documentação oficial:

| SQLSTATE | Nome oficial | Quando aparece aqui | Status sugerido |
|---|---|---|---|
| `23505` | `unique_violation` | Categoria com nome repetido | **409** Conflict |
| `23503` | `foreign_key_violation` | Ainda não existe (não há FK). Vai aparecer no A3. | 409 ou 422 (ver abaixo) |
| `22P02` | `invalid_text_representation` | `GET /despesas/abc`, `parcelas: 2.5` | 400 |
| `22003` | `numeric_value_out_of_range` | id `99999999999`; `valor: 1e12` (`numeric field overflow`) | 400 |
| `22001` | `string_data_right_truncation` | `nome` com mais de 50 caracteres | 400 |
| `23502` | `not_null_violation` | Falta um campo `NOT NULL` | 400, com log de aviso |
| `23514` | `check_violation` | Ainda não há CHECK. Vai aparecer no A3. | 400, com log de aviso |

Três detalhes que fazem diferença:

- **O mesmo `23503` tem dois sentidos.** No INSERT, ele quer dizer "a categoria que você mandou não existe" (problema do cliente: 422). No DELETE, quer dizer "essa categoria está em uso" (conflito: 409). Só pelo código não dá para saber qual é. Guarde isso para o A3 e o M4 (camada de service): essa decisão fica melhor perto da regra de negócio do que num mapa genérico.
- **Depois do A2, os `22xxx` não deveriam mais acontecer**, porque o Zod barra antes. Se acontecerem, a validação deixou passar alguma coisa. Por isso o mapeamento deles é uma **rede de segurança**: responda 400, mas **logue um aviso** para você descobrir o furo. O mesmo vale para `23502` e `23514`: eles indicam que o Zod e o banco discordam.
- **Nunca mande o `err.detail` para o cliente.** No `23502`, eu recebi `detail: "Failing row contains (4, Z, null, #64748B, tag, 1.00, variavel, t)"`, ou seja, a **linha inteira**. Quando existirem usuários, isso vaza dados. Para uma mensagem amigável no `23505`, use o `err.constraint` (`categorias_nome_key`) como chave de um dicionário **seu**: `categorias_nome_key` vira "Já existe uma categoria com esse nome".

**6. Erros do `express.json()` também chegam ao handler.** Conferi no `body-parser@2.4.0` (`lib/read.js:194-199`): JSON inválido vira um erro com `status: 400`, `type: 'entity.parse.failed'` e `expose: true`. O `err.message` desse erro é a mensagem do `JSON.parse` (`Unexpected end of JSON input`), que pode trazer um pedaço do corpo enviado. Use **sua** mensagem ("JSON inválido"), não a dele.

**7. O log é para você, não para o cliente.** No 500, logue o `err` inteiro (com stack), mais `req.method` e `req.originalUrl`. **Não logue o `req.body`**: quando existir login, ele vai ter senha. Log estruturado (`pino`) fica para depois. Por enquanto, `console.error` resolve.

### Passo a passo

1. **Classes de erro.** Crie `backend/src/errors/` com:
   - uma classe base que estende `Error` e guarda `statusCode` e um `codigo` (o identificador do erro, ver M2);
   - uma `NotFoundError` que estende a base. Pense em como receber o nome do recurso para montar "Despesa não encontrada" ou "Categoria não encontrada". Cuidado com o gênero das palavras.
   - (Opcional agora) uma `ConflictError`.
2. **Middleware de erro.** Crie `backend/src/middleware/errorHandler.js`, com **4 parâmetros**. Ordem sugerida das checagens:
   1. `res.headersSent`: se a resposta já começou a ser enviada, chame `next(err)` e deixe o Express fechar a conexão. A documentação oficial manda fazer isso.
   2. `instanceof` da sua classe base: use o `statusCode` e a mensagem dela.
   3. Erro do `body-parser` (`err.type === 'entity.parse.failed'`): 400 com mensagem sua.
   4. Erro do banco com `code` conhecido: use o mapa da tabela acima. Deixe o mapa num objeto, fora da função, para ficar fácil de ler e de testar.
   5. Todo o resto: `console.error` com o erro completo e 500 com uma mensagem genérica.
3. **404 de rota.** Em `backend/src/app.js`, depois do `routes(app)` (`:7`), registre um middleware **sem caminho** que lança (ou passa ao `next`) uma `NotFoundError`. Depois dele, registre o `errorHandler`.
4. **Controllers.** Nos dois controllers:
   - Remova **todos** os `try/catch`.
   - Troque cada `return res.status(404).json(...)` por um `throw` da `NotFoundError`.
   - O parâmetro `next` deixa de ser usado nos controllers. Pode tirar.
   - De quebra, padronize o `return` antes do `res`: `despesasController.js:51` e `:98` não têm `return`, os outros têm.
5. **Testes.** Na minha simulação do A1 (feita numa cópia, com o P2 **ainda não** corrigido), quebram **7 testes**: os 5 testes de "500" do `categorias.controller.test.js`, o de delete 204 (por causa do P2) e o "500" do `categorias.routes.test.js:57-64`. Faz sentido que quebrem, porque o comportamento mudou de propósito:
   - **Testes unitários do controller:** o controller não responde mais 500. Ele **rejeita a Promise**, e quem responde é o handler. Teste isso com `await expect(Controller.metodo(req, res)).rejects...`. Pesquise "Vitest expect rejects". Para o 404, verifique que ele rejeita com a sua `NotFoundError`.
   - **Teste de rotas:** o `categorias.routes.test.js:29-37` monta um Express **próprio**, sem o `errorHandler`. Por isso ele nunca vai ver o 500 em JSON. Troque pelo `app` real (`import app from '../src/app.js'`). Isso também cumpre um pedaço do M1.
   - **Teste novo:** use um mock do `pool.query` que rejeita com um erro que **imita o `DatabaseError`**, ou seja, um `Error` com `code: '23505'`. Espere um 409. É o mesmo princípio do P2: o mock imita o contrato real.

### Como verificar

```bash
npm test
npm start
curl -i http://localhost:3000/despesas/abc          # 400, JSON, sem "invalid input syntax"
curl -i http://localhost:3000/naoexiste             # 404 em JSON, não HTML
curl -i -X POST http://localhost:3000/despesas -H "Content-Type: application/json" -d '{"descricao":'
# 400 em JSON, sem stack trace
```

No terminal do `npm start`, o `GET /despesas/abc` deve aparecer como aviso, com o código `22P02`. Esse log é a prova de que a validação (A2) ainda tem um furo. Ele deve sumir depois do A2.

Para provar o 500 genérico, pare o banco (`docker stop postgres-dev`) e faça `curl -i http://localhost:3000/despesas`. O cliente recebe só a mensagem genérica, e o terminal mostra o erro de conexão completo (procure `ECONNREFUSED` no stack). Depois, `docker start postgres-dev`.

### Pergunta de fixação

Por que um middleware `(err, req, res) => {...}`, com 3 parâmetros, foi executado numa rota que **não** deu erro nenhum? O que o `err` recebeu nesse caso?

---

## M2. Respostas padronizadas

### Diagnóstico

Hoje existem **seis formatos** de resposta de erro:

| Formato | Onde |
|---|---|
| `{ message, erro }` | os 10 `catch` (A1) |
| `{ message }` | os 404 dos controllers |
| `{ message, erros: [issues do Zod] }` | `despesasValidator.js:19-22` e `categoriasValidator.js:19-22` |
| HTML com stack trace | JSON quebrado |
| HTML `Cannot GET` | rota inexistente |
| Sem formato | qualquer erro que escape |

E as mensagens variam para a mesma situação:

- `"Erro ao buscar despesas"`, `"erro interno no servidor"`, `"Erro interno no servidor."` e `"Erro interno do servidor"`;
- `"Despesa nao encontrada"`, `"Registro nao encontrado"` e `'Registro nao encontrado.'`;
- nenhuma tem acento, embora o JSON seja UTF-8 e aceite acento sem problema.

Os itens do M2 que **já estão resolvidos** (C5): os dois DELETE respondem `204` sem corpo.

### Por que importa

- **O cliente precisa reconhecer um erro sem adivinhar.** Hoje o frontend tem de testar `message`, `erro` e `erros`. Cada formato novo é um `if` novo no frontend.
- **Mensagem é para humanos; código é para máquinas.** Se o frontend decidir pelo **texto** ("se a mensagem contém 'duplicate'..."), qualquer ajuste de texto quebra o frontend. Um `codigo` estável (`CONFLITO`, `VALIDACAO`, `NAO_ENCONTRADO`) separa as duas coisas.
- **Não exponha o formato do Zod na API.** Hoje o cliente recebe `issues` cruas (`expected`, `code`, `path`). Isso prende o seu contrato a uma biblioteca: do Zod 3 para o 4, vários códigos de issue mudaram de nome (por exemplo, `invalid_enum_value` virou `invalid_value`), e qualquer cliente que dependesse deles quebraria. Converta para um formato **seu**.

### O formato (decisão D2)

| Opção | Exemplo | Prós | Contras |
|---|---|---|---|
| A. Manter o atual | `{ message, erros }` | O frontend não muda. | Mistura inglês e português. `erros` só existe na validação. Não tem código. |
| B. Envelope em português | `{ erro: { codigo, mensagem, detalhes } }` | Um idioma. Código estável. `detalhes` só aparece na validação. | O frontend muda em um ponto (ver abaixo). |
| C. RFC 9457 (Problem Details) | `{ type, title, status, detail, instance }` + `Content-Type: application/problem+json` | É padrão da IETF, e ferramentas reconhecem. | Os nomes dos campos são fixos e em inglês. É mais coisa para aprender agora. |

Recomendo a **B**, com `detalhes` como uma lista de `{ campo, mensagem }`. A **C** vale como leitura: mesmo escolhendo a B, a RFC 9457 explica **por que** cada campo existe.

**E nas respostas de sucesso?** A revisão não pede envelope (`{ dados: ... }`) no sucesso, e eu **não** recomendo criar agora:

- O frontend lê o array direto (`api.js:51`). Um envelope quebraria todas as telas sem ganho imediato.
- O envelope passa a fazer sentido com **paginação** (M3, próximo guia), quando a lista precisar levar junto `total` e `pagina`. Decida lá.

**Dinheiro (`NUMERIC` chega como string):** a decisão continua pendente. Hoje a API **recebe** `valor` como número e **devolve** como string (`"450.00"`). É assimétrico, mas funciona, porque o frontend usa `Number(...)`. Minha sugestão: **não** mexa nisso neste guia, mas escreva no README que o contrato é esse e que ele será revisto no A3. Assim a assimetria fica documentada, em vez de acidental.

### Passo a passo

1. Garanta que o `errorHandler` do A1 é o **único** lugar que monta o corpo de erro. Procure no projeto por `.status(4` e `.status(5`: depois do M2, só o handler pode aparecer.
2. **Validators de agora:** em vez de responder 400 direto (`despesasValidator.js:18-23` e `categoriasValidator.js:18-23`), entregue o erro ao `next`. O handler precisa reconhecer o erro do Zod (`instanceof z.ZodError`; no Zod 4.6.7, `safeParse` devolve o `error` como `ZodError`) e transformar cada issue em `{ campo, mensagem }`. Esses dois validators vão **sumir** no A2. Este passo só serve para o formato já ficar certo agora.
3. **Mensagens em português:** o Zod 4 tem tradução embutida. Eu conferi que `z.config(z.locales.ptBR())` funciona no 4.6.7 (o resultado fica assim: `"Pequeno demais: esperava que o número fosse > 0"`). Chame isso **uma vez**, num módulo que carregue antes de qualquer validação. Para um campo específico, a mensagem pode ser sua: no Zod 4, o parâmetro se chama `error`, por exemplo `.min(1, { error: 'Informe a descrição' })`.
4. Padronize os textos do 404 e do 500, com acento.
5. Testes: os testes do validator (`categorias.validator.test.js:57-63` e `:86`) esperam `res.status(400)` e `message: 'Dados invalidos'`. Depois do passo 2, o validator não responde mais; ele chama o `next` com um erro. Ajuste os testes para verificar **isso**. O teste do formato final do 400 fica no teste de rotas, com o `app` real.

### O que o frontend vai precisar ajustar (não edite agora; só para planejar)

Só se você escolher a opção B ou C. Na A, nada muda.

| Arquivo (branch `backend`) | Linhas | O que muda |
|---|---|---|
| `frontend/src/services/api.js` | 97 | Lê `errJson?.message`. Passa a ler a mensagem de dentro do envelope de erro. |
| | 98 | Lê `errJson?.erros` e monta `e.path?.join('.')` com `e.message`. Passa a ler `detalhes`, com `campo` (já vem como texto, então não precisa de `join`) e `mensagem`. |
| | 59-72, 45-57 | `getDespesaById` e `getDespesas` **não** leem o corpo de erro. Nada muda. |
| | 103-110 | Não muda, mas **atenção**: o fallback local do `createDespesa` (B4) engole qualquer 400. A tela finge que salvou. Teste a API com `curl` antes de confiar na tela. |

Mude o backend e o frontend **no mesmo PR**.

### Como verificar

```bash
curl -s -X POST http://localhost:3000/despesas -H "Content-Type: application/json" -d '{}'
curl -s http://localhost:3000/despesas/99999
curl -s http://localhost:3000/naoexiste
```

Os três corpos devem ter **a mesma forma**. Só mudam o código, a mensagem e a presença de `detalhes`.

### Pergunta de fixação

Se o frontend quiser mostrar "Já existe uma categoria com esse nome" embaixo do campo `nome`, ele deve decidir isso pelo **status 409**, pela **mensagem** ou pelo **código**? E por que não pelos outros dois?

---

## A2. Validação completa

### Diagnóstico

- **Nenhum `:id` é validado.** São 6 rotas: `despesasRoutes.js:9-11` e `categoriasRoutes.js:8, 10, 11`. Hoje o texto do id vai direto para o Postgres, e quem "valida" é o erro `22P02`.
- **Schema de despesas** (`despesasValidator.js:3-12`): só tipos, sem regra nenhuma. Conferido na tabela do início: `valor: -50`, `descricao: ""`, `parcelas: -3` e `status: "talvez"` foram gravados com 201.
- **Schema de categorias** (`categoriasValidator.js:5-13`): está melhor (tem `.max`, `enum` e `regex`), mas `nome: ""` passa, e `limiteMensal` aceita negativo.
- Há **um validator por entidade**, com o mesmo código repetido, e os dois só olham o `body`.
- Os dois schemas usam `z.object`, que **descarta** chaves desconhecidas em silêncio. No teste, `id: 999` e `admin: true` sumiram sem aviso. Isso **protege** contra mass assignment (o `id` não foi gravado), mas o cliente nunca descobre que mandou lixo.
- **Resto do C2:** as fixtures dos testes ainda mandam o campo `tipo`, que não existe mais (`categorias.controller.test.js:104, 142` e `categorias.routes.test.js:83, 109`).

### Por que acontece

**1. A validação é o contrato da API, e o banco é a última linha de defesa.** São duas camadas com papéis diferentes:

- O Zod (na borda) dá um 400 **claro e cedo**, sem gastar uma ida ao banco, e com uma mensagem que o usuário entende.
- O `CHECK` do banco (A3) protege o dado de **qualquer** origem: script, seed, outro serviço.

Uma não substitui a outra. Repare que vários valores inválidos são **válidos para o banco**: valor negativo, `status: "talvez"`, string vazia. Nenhum erro do Postgres vai salvar você deles.

**2. Um middleware genérico é uma função que *devolve* um middleware.** Você já usa isso sem perceber: `express.json()` é uma função que, quando chamada, devolve `(req, res, next) => {...}`. O nome desse padrão é *factory* com *closure*: a função de dentro "lembra" dos argumentos da de fora.

Exemplo **genérico**, de outro domínio:

```js
function exigirCabecalho(nome) {
  return (req, res, next) => {
    if (!req.get(nome)) return next(new Error(`Cabeçalho ${nome} ausente`))
    next()
  }
}
// router.get('/livros', exigirCabecalho('x-api-version'), handler)
```

O seu `validate` segue a mesma ideia. Ele recebe um objeto com schemas opcionais para `body`, `params` e `query`, e devolve **um** middleware que valida as partes que vieram.

**3. Pegadinha do Express 5: o `req.query` não pode ser reatribuído.** Conferi no `express@5.3.0` (`lib/request.js:230`): o `query` é um **getter** sem setter, e ele faz o parse da URL de novo **a cada acesso**. Testei:

- `req.query = {...}` lança `TypeError: Cannot set property query of #<IncomingMessage> which has only a getter`;
- `req.query.x = 1` não lança erro, mas **some**, porque o próximo acesso devolve um objeto novo.

Já o `req.body` e o `req.params` podem ser reatribuídos. Testei um middleware numa rota `/p/:id` que trocou o `req.params`, e o handler seguinte recebeu o `id` como número. Então decida **onde** guardar a query validada: numa propriedade sua no `req`, no `res.locals` ou redefinindo a propriedade (pesquise `Object.defineProperty`). A query só vai ser usada de verdade no M3 (filtros e paginação), mas o `validate` já deve nascer preparado.

**4. Detalhes do `params.id`.** O `params` sempre chega como **string**. A revisão sugeriu `z.coerce.number().int().positive()`. Testei no Zod 4.6.7:

| Entrada | Resultado |
|---|---|
| `"abc"` | erro (NaN) |
| `"1.5"`, `"0"`, `"-1"` | erro |
| `"0x10"` | **passa, vira 16** |
| `"1e3"` | **passa, vira 1000** |
| `" 7 "` | **passa, vira 7** |
| `"99999999999"` | **passa**, e depois o banco dá `22003` |

Duas consequências:

- O `id` da coluna é `INTEGER` (`SERIAL`), cujo máximo é `2147483647`. Sem um `.max(...)`, o `99999999999` continua chegando ao banco.
- O `coerce` usa a conversão do JavaScript (`Number(...)`), que aceita hexadecimal e notação científica. Então `/despesas/0x10` mostra a despesa 16. É inofensivo, mas são duas URLs para o mesmo recurso. A alternativa é validar a **string** com uma regex de "só dígitos" e só então converter. Pesquise `.regex` e `.pipe()` (ou `.transform`) no Zod 4; conferi que os dois existem no 4.6.7. A escolha é sua; o importante é saber o que o `coerce` aceita.

**5. `z.object`, `z.strictObject` e mass assignment.**

- `z.object` (o padrão) **descarta** chaves desconhecidas. Isso é seguro contra mass assignment, mas é silencioso. Se o frontend mandar `metodo_pagamento` (snake_case, um erro de digitação), o campo some e, se for opcional ou tiver default, **ninguém percebe**. O bug do C6 teria se escondido assim.
- `z.strictObject` (ou `.strict()`) **rejeita** com 400 e a issue `unrecognized_keys`. Conferi no 4.6.7: a issue vem com `path: []` e com a lista em `keys`. Atenção: com o `path` vazio, o seu `campo` fica vazio. O `validate` pode completar com o nome da parte (`body`).
- Recomendo `strictObject` nos bodies (D6). O frontend manda exatamente os 6 campos de despesa (`api.js:77-84`), então ele não quebra.

**6. Endurecer não é só pôr `.min(1)`.** Testei no Zod 4.6.7:

- `z.string().min(1)` **aceita** `"   "` (três espaços). Use `.trim()` **antes** do `.min(1)`. O `trim` também limpa o valor que vai para o banco.
- `z.number()` já rejeita `NaN` e `Infinity`.
- `NUMERIC(10,2)` aceita valores com **menos que 10^8** em módulo. Essa informação veio do próprio Postgres, no `detail` do erro. Então o teto do `valor` é `99999999.99`. Sem ele, `1e12` vira `22003`.
- `TEXT` não tem limite no banco. Sem `.max()`, o único teto da `descricao` é o limite do `express.json()`, que por padrão é `100kb` (`body-parser/lib/utils.js:47`). Defina um máximo de negócio. Configurar esse limite de forma explícita é o B1, no próximo guia.
- `.multipleOf(0.01)` existe, mas lembre que `number` é ponto flutuante. Esse é o argumento a favor de centavos inteiros (M2 e A3).

**7. Enum de rótulos ou de códigos (D5).** Se o enum for `'Cartão de Crédito'`, o texto da tela vira o valor gravado. No dia em que alguém trocar o rótulo para "Crédito", as despesas antigas passam a ter um valor que o enum **não aceita mais**, e um PUT nelas dá 400. Com códigos (`'cartao_credito'`), a tela traduz o código para o rótulo, e o dado nunca muda. Se escolher os rótulos agora, anote como dívida.

**8. PUT e PATCH.** A RFC 9110 (seção 9.3.4) define o PUT como **substituição** completa do recurso.

- O seu PUT de categorias, com os `.default()`, já se comporta assim: `PUT {nome, descricao, limiteMensal}` **reseta** `cor`, `icone`, `ativo` e `tipoCusto` para os padrões. Isso está correto para um PUT, mas surpreende quem esperava "só mudar o nome". Por isso o PATCH existe.
- O PATCH (RFC 5789) aplica uma alteração **parcial**. Duas armadilhas, se um dia você fizer:
  - **O `.partial()` do Zod 4 mantém os `.default()`.** Testei: `schema.partial().parse({ nome: 'Casa' })` devolve `{ nome: 'Casa', ativo: true, cor: '#64748B' }`. Um PATCH ingênuo **reescreveria** `ativo` e `cor`. O schema do PATCH precisa nascer de uma base **sem** defaults.
  - **O SET dinâmico.** Os placeholders `$n` só servem para **valores**, nunca para **nomes de coluna**. Se você montar o `SET` a partir das chaves do body, os nomes das colunas precisam vir de um mapa **fixo** seu (campo do JSON para coluna), e nunca do texto do cliente. Senão você abre uma porta de SQL injection pelo **nome** da coluna, mesmo com todos os valores parametrizados.

### Passo a passo

1. Defina D4, D5 e D6.
2. Crie `backend/src/middleware/validate.js`, uma factory que recebe `{ body, params, query }`:
   - valida cada parte que veio, com `safeParse`;
   - **junta** as issues de todas as partes, em vez de parar na primeira, e prefixa o campo com a parte (`params.id`, `body.valor`);
   - em caso de falha, entrega ao `next` um erro que o handler do M2 saiba formatar. Pode ser uma `ValidationError` sua, filha da classe base do A1, carregando os `detalhes`;
   - em caso de sucesso, troca o `req.body` e o `req.params` pelos dados validados, e guarda a query num lugar que funcione (item 3 do "Por que acontece").
3. Crie um schema para o `params` com `id`, seguindo o item 4.
4. Endureça os schemas, campo por campo, espelhando o `init.sql` e as decisões:

   | Campo | Regras a considerar |
   |---|---|
   | `descricao` (despesa) | `trim`, mínimo 1, máximo de negócio |
   | `valor` | positivo, teto `99999999.99` |
   | `categoria` | `trim`, mínimo 1, máximo. **Provisório**: vira `categoriaId` com FK no A3. Não invista aqui. |
   | `metodoPagamento` | enum (D5) |
   | `parcelas` | inteiro, mínimo conforme D4, um máximo razoável |
   | `status` | enum `'pago'` / `'pendente'` |
   | `nome` (categoria) | `trim`, mínimo 1, máximo 50 (já tem o máximo) |
   | `descricao` (categoria) | o banco exige `NOT NULL` (`init.sql:14`). Decida se `""` é aceitável. |
   | `limiteMensal` | não negativo ou positivo (decida), teto `99999999.99` (`NUMERIC(10,2)`, `init.sql:17`) |
   | `tipoCusto` | enum, com o default igual ao do banco (P1) |

5. Troque os bodies para `strictObject` (D6).
6. Nas rotas, use o `validate` em **todas** as que têm `:id` (GET, PUT, DELETE) e em todas as que têm body (POST, PUT). Depois apague os dois validators antigos.
7. Testes:
   - Testes unitários do `validate`, com `req`, `res` e `next` falsos:
     - id `"abc"` chama o `next` com o erro de validação;
     - campo extra é rejeitado;
     - entrada válida substitui o `req.body` (por exemplo, com espaços removidos pelo `trim`).
   - Remova o `tipo` das fixtures dos testes. Com o `app` real e o `strictObject`, essas requisições passariam a dar 400.
   - Pelo menos um teste de rota com o `app` real para despesas: `GET /despesas/abc` dá 400. A cobertura completa de despesas é o M1, no próximo guia.

**Desafio opcional (D7):** crie `PATCH /despesas/:id` que aceita **só** `{ status }`, para "marcar como paga". É um PATCH com um campo só: você pratica a ideia sem o SET dinâmico. Pergunte-se o que um `PATCH` com body `{}` deve responder.

### Como verificar

```bash
npm test
curl -i http://localhost:3000/despesas/abc               # 400, detalhes com campo "params.id"
curl -i http://localhost:3000/despesas/99999999999       # 400 (e nenhum aviso 22003 no log)
curl -i -X POST http://localhost:3000/despesas -H "Content-Type: application/json" \
  -d '{"descricao":"   ","valor":-50,"categoria":"x","metodoPagamento":"qualquer","parcelas":-3,"status":"talvez"}'
# 400, com um item em "detalhes" para cada campo errado (descricao, valor, metodoPagamento, parcelas, status)
curl -i -X POST http://localhost:3000/despesas -H "Content-Type: application/json" \
  -d '{"descricao":"Luz","valor":185.3,"categoria":"Moradia","metodoPagamento":"Boleto","parcelas":1,"status":"pendente","admin":true}'
# 400, chave não reconhecida "admin"
```

Depois do A2, o log do servidor **não** deve mais mostrar avisos de `22P02` ou `22003` para esses `curl`. Se mostrar, ainda há um furo na validação.

### Pergunta de fixação

Este é o desafio do roteiro: o que acontece hoje com `GET /despesas/1 OR 1=1`? Por que **não** há SQL injection, e por que mesmo assim é preciso validar? Responda com o que você viu no log do A1.

---

## Checklist final

**Estrutura**

- [ ] A `main` contém C2 a C6 (D1).
- [ ] Nenhum `try/catch` nos controllers. `grep -rn "catch" backend/src/controllers` não encontra nada.
- [ ] `grep -rn "error.message" backend/src` não encontra nada.
- [ ] Só o `errorHandler` monta corpo de erro. `grep -rn "status(4\|status(5" backend/src` só aparece nele.
- [ ] Os dois validators antigos foram apagados e todas as rotas usam o `validate`.
- [ ] `npm test` passa, com os testes novos do P2, do A1 e do A2.

**Antes e depois** (com o banco no ar; o "depois" supõe a opção B do D2 e o 400 do D3)

| # | Comando | Antes (medido hoje) | Depois (esperado) |
|---|---|---|---|
| 1 | `curl -i http://localhost:3000/despesas/abc` | 500 `invalid input syntax for type integer` | 400 `VALIDACAO`, `detalhes` com `params.id` |
| 2 | `curl -i http://localhost:3000/despesas/99999999999` | 500 `out of range for type integer` | 400 `VALIDACAO` |
| 3 | `curl -i http://localhost:3000/despesas/99999` | 404 `{"message":"Despesa nao encontrada"}` | 404 `NAO_ENCONTRADO`, "Despesa não encontrada" |
| 4 | `curl -i http://localhost:3000/naoexiste` | 404 HTML | 404 JSON no mesmo formato |
| 5 | `curl -i -X POST .../despesas -H "Content-Type: application/json" -d '{"descricao":'` | 400 HTML com stack trace | 400 JSON, "JSON inválido", sem stack |
| 6 | Criar duas vezes `{"nome":"Moradia","descricao":"Aluguel","limiteMensal":2000}` em `POST /categorias` | 500 `duplicate key value violates unique constraint` | 409 `CONFLITO`, "Já existe uma categoria com esse nome" |
| 7 | `POST /despesas` com `"admin":true` a mais | 201 (campo descartado em silêncio) | 400, chave não reconhecida |
| 8 | `POST /despesas` com `"valor":-50` | **201, gravado** | 400, `detalhes` com `body.valor` |
| 9 | `POST /despesas` com `"status":"talvez"` | **201, gravado** | 400 |
| 10 | `POST /despesas` com `"parcelas":2.5` | 500 `invalid input syntax for type integer: "2.5"` | 400 |
| 11 | `POST /despesas` com `"valor":1e12` | 500 `numeric field overflow` | 400 |
| 12 | `POST /categorias` sem `tipoCusto` | 201, `"tipoCusto":"fixo"` | 201, com o default igual ao do banco |
| 13 | `docker stop postgres-dev` e depois `curl -i http://localhost:3000/despesas` | 500 com o `error.message` técnico da falha de conexão no corpo | 500 genérico no corpo, detalhe só no terminal |

Para os itens 7 a 11, parta deste body válido e mude **um** campo por vez:

```bash
curl -i -X POST http://localhost:3000/despesas -H "Content-Type: application/json" \
  -d '{"descricao":"Conta de luz","valor":185.3,"categoria":"Moradia","metodoPagamento":"Boleto","parcelas":1,"status":"pendente"}'
```

O que **ainda vai estar feio** depois disso, e está certo que esteja, porque são os próximos itens:

- `categoria` continua texto livre, e não existe a data da despesa (A3).
- O `init.sql` continua sem `CHECK`. Um `INSERT` manual ainda grava valor negativo (A3 e A4, com migrations).
- O teste de rotas usa mock do banco. O teste contra um Postgres real é o M1.
- As listagens não têm paginação, filtro nem `ORDER BY` (M3).
- O controller ainda monta SQL. A camada de service e repository é o M4. Lá também se resolve o `23503` com dois sentidos.
- Não há autenticação (A5), nem `helmet`, rate limit ou limite explícito de body (B1). Também faltam o `pool.on('error')` e o encerramento limpo (M5).

## Para estudar

- Express 5: guia "Error handling" (seções sobre Promises, `res.headersSent` e o handler padrão); "Writing middleware"; "Migrating to Express 5" (sintaxe de caminhos e `req.query`).
- `node_modules/router/lib/layer.js`, funções `handleRequest` e `handleError`. São 60 linhas e mostram exatamente como o `fn.length` e as Promises são tratados.
- PostgreSQL 16: Apêndice A, "PostgreSQL Error Codes" (classes 22 e 23).
- node-postgres: a página "Errors" e o objeto `DatabaseError` (`code`, `constraint`, `detail`).
- Zod 4: "Basic usage" (`safeParse`), "Defining schemas" (`z.strictObject`, `.trim()`, `z.coerce`, `.partial()`), "Customizing errors" (o parâmetro `error`) e "Formatting errors" (`z.flattenError`, `z.treeifyError`). Também "Internationalization" (`z.locales`).
- MDN: "Classes" (`extends` e `super`), "instanceof" e "Closures".
- RFC 9110, seções 9.3.4 (PUT) e 15.5 (status 4xx); RFC 5789 (PATCH); RFC 9457 (Problem Details).
- OWASP API Security Top 10 2023: API3 (Broken Object Property Level Authorization, que inclui mass assignment) e API8 (Security Misconfiguration).
