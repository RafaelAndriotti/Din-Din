# Issues para o GitHub — auditoria de segurança do Din-Din (23/11/2026)

Cada bloco entre `--- ISSUE n ---` e `--- FIM ISSUE n ---` é uma issue completa.
Copie a linha "Título" para o título da issue e o resto para o corpo.
Os códigos F01–F16 e O1–O4 apontam para o relatório `relatorio-auditoria-seguranca.pdf`.

--- ISSUE 1 ---
Título: [Segurança] API sem autenticação: qualquer cliente lê, altera e apaga tudo
Labels sugeridas: security, severidade:crítica
Achados: F01 (crítica), F02 (alta), F03 (média), F06 (média)

## Descrição
A API não tem autenticação nem modelo de dono dos dados. Entre `express.json()` e os
routers não existe middleware de auth, as tabelas `despesas` e `categorias` não têm
coluna de dono e não há RLS no Postgres. Quem alcança a porta 3000 tem os mesmos
poderes do dono: lista, cria, altera e apaga despesas e categorias.

**Por que é explorável:** nenhuma rota devolve 401. Na auditoria, `GET /despesas`,
`GET /despesas/1` e `GET /categorias` sem nenhum cabeçalho chegaram até a camada de
banco. O `server.js` escuta em todas as interfaces (`::`), então a API fica acessível
pela rede local sempre que o firewall do host deixar passar (ver issue 3).

## Evidência
- `backend/src/app.js:5-7`: nenhum middleware de auth antes das rotas
  ```js
  app.use(express.json())

  routes(app)
  ```
- `backend/src/routes/index.js:6-7`
  ```js
  app.use(despesasRoutes);
  app.use(categoriasRoutes);
  ```
- `backend/src/db/init.sql:1-9` e `:11-20`: `despesas` e `categorias` sem `usuario_id`
- `backend/src/controllers/despesasController.js:12-14`: listagem sem filtro nem limite
  ```js
  const { rows } = await pool.query(
      `SELECT ${COLUNAS} FROM despesas`
  );
  ```
- `backend/src/controllers/categoriasController.js:10`: listagem sem filtro
- `backend/src/routes/categoriasRoutes.js:12-14`: `POST`/`PUT`/`DELETE /categorias`
  abertos no servidor, sem nenhuma tela no front (o front só usa o GET,
  `frontend/src/services/api.js:111-118`)
- `package.json:21`: `jsonwebtoken` instalado e não importado em nenhum arquivo

## Impacto
Confidencialidade e integridade de todo o histórico financeiro. Quem alcança a API lê
todas as despesas numa requisição, altera valores e status e apaga registros, sem
deixar rastro de quem fez.

## Sugestão de correção
1. Contenção imediata: issue 3 (API e Postgres só em `127.0.0.1`).
2. Tabela `usuarios` (email único, hash argon2id ou bcrypt), criada por migration.
3. `POST /auth/registro` e `POST /auth/login` emitindo JWT de vida curta. Segredo com
   32+ bytes no `.env`, validado no boot (issue 5).
4. Middleware `autenticar` em `routes/index.js`, antes dos routers: sem token válido,
   401; com token, `req.usuarioId`.
5. `usuario_id INTEGER NOT NULL REFERENCES usuarios(id)` em `despesas` e `categorias`;
   trocar `UNIQUE (nome)` por `UNIQUE (usuario_id, nome)`.
6. Listagens com `WHERE usuario_id = $1`; `INSERT` com o `usuario_id` do token, nunca
   do body. As rotas por ID ficam na issue 2.

## Critérios de aceite
- [ ] Toda rota, exceto `/auth/*` e `GET /`, responde 401 sem token válido.
- [ ] Token expirado ou com assinatura inválida responde 401.
- [ ] `despesas.usuario_id` e `categorias.usuario_id` existem, `NOT NULL`, com FK.
- [ ] `GET /despesas` e `GET /categorias` devolvem só os registros do usuário do token.
- [ ] `POST` grava o `usuario_id` do token, mesmo que o body traga outro valor.
- [ ] Teste de integração: o usuário B não vê nenhum registro de A nas listagens.
- [ ] `npm test` passa.
--- FIM ISSUE 1 ---

--- ISSUE 2 ---
Título: [Segurança] IDOR: rotas por ID não verificam o dono do registro
Labels sugeridas: security, severidade:alta
Achados: F07 (alta), F08 (alta), F09 (média), F10 (média), F11 (média), F12 (baixa)

## Descrição
Os seis handlers que recebem `:id` filtram só por `id`. Os IDs são `SERIAL`
(sequenciais a partir de 1), então um laço lê, altera ou apaga todos os registros.
O `idParamsSchema` valida o formato do número, não a posse.

**Por que é explorável:** sem o dono no WHERE, `DELETE /despesas/1`, `/2`, `/3`...
apaga o histórico inteiro. A diferença entre 200 e 404 também revela quais IDs
existem. O "dono" só passa a existir com a issue 1, mas cada query precisa da correção.

## Evidência
| Rota | Handler | Filtro |
|---|---|---|
| `GET /despesas/:id` | `despesasController.js:42-45` | `WHERE id = $1` |
| `PUT /despesas/:id` | `despesasController.js:62-73` | `WHERE id=$7` |
| `DELETE /despesas/:id` | `despesasController.js:89-92` | `WHERE id=$1` |
| `GET /categorias/:id` | `categoriasController.js:20` | `WHERE id = $1` |
| `PUT /categorias/:id` | `categoriasController.js:50-54` | `WHERE id = $8` |
| `DELETE /categorias/:id` | `categoriasController.js:70` | `WHERE id = $1` |

Rotas: `despesasRoutes.js:11-13` e `categoriasRoutes.js:11,13,14`.
IDs sequenciais: `init.sql:2` e `init.sql:12` (`id SERIAL PRIMARY KEY`).

```js
// backend/src/controllers/despesasController.js:89-92
const { rowCount } = await pool.query(
    `DELETE FROM despesas WHERE id=$1`,
    [id]
)
```

## Impacto
Alteração e exclusão de qualquer despesa ou categoria (integridade e disponibilidade)
e leitura de qualquer registro por ID. O DELETE é físico, sem soft delete.

## Sugestão de correção
1. Incluir o dono em todo WHERE por ID:
   `WHERE id = $1 AND usuario_id = $2`, com `[id, req.usuarioId]`.
2. Registro de outro usuário responde 404, igual a inexistente (não revela existência).
3. Concentrar o filtro na camada repository (roteiro M4), para nenhuma query nova
   esquecer o dono.
4. Opcional: expor UUID na API em vez do `SERIAL`.

## Critérios de aceite
- [ ] As 6 queries por ID incluem `usuario_id` no WHERE.
- [ ] Teste: B recebe 404 em GET, PUT e DELETE de uma despesa de A.
- [ ] Teste: B recebe 404 em GET, PUT e DELETE de uma categoria de A.
- [ ] Depois do PUT e do DELETE de B, o registro de A continua intacto no banco.
- [ ] `npm test` passa.
--- FIM ISSUE 2 ---

--- ISSUE 3 ---
Título: [Segurança] API e Postgres escutam em todas as interfaces de rede
Labels sugeridas: security, severidade:média
Achados: F05 (média); reduz a exposição de F01–F12

## Descrição
`app.listen(PORT)` sem host abre a API em `::` (todas as interfaces, IPv4 e IPv6), e o
compose publica o Postgres em `0.0.0.0:5434`. Enquanto a API não tem autenticação,
qualquer máquina da mesma rede que passe pelo firewall controla os dados.

**Por que é explorável:** na auditoria, `app.listen` sem host devolveu
`{"address":"::"}`. A imagem `postgres:16` aceita login remoto com senha
(`host all all all scram-sha-256`). Hoje o Firewall do Windows desta máquina bloqueia
a entrada (não há regra para node.exe, Docker ou as portas 3000/5434), mas essa
proteção é externa ao projeto: some com um "Permitir" no aviso do Windows, em outra
máquina ou num deploy.

## Evidência
- `backend/server.js:6`
  ```js
  app.listen(PORT, () => {
  ```
- `backend/docker-compose.yml:8-9`
  ```yaml
  ports:
    - "5434:5432"
  ```

## Impacto
Transforma a falta de autenticação numa falha de rede local (Wi-Fi do escritório, da
faculdade). No banco, expõe à rede o login do superusuário (issue 4).

## Sugestão de correção
```js
// backend/server.js
const HOST = process.env.HOST || '127.0.0.1'
app.listen(PORT, HOST, () => { /* ... */ })
```
```yaml
# backend/docker-compose.yml
ports:
  - "127.0.0.1:5434:5432"
```
Abrir para a rede só depois da autenticação, e atrás de um proxy com TLS.

## Critérios de aceite
- [ ] `netstat -ano | findstr :3000` mostra `127.0.0.1:3000`, não `0.0.0.0` nem `[::]`.
- [ ] `docker port postgres-dev` mostra `127.0.0.1:5434`.
- [ ] De outra máquina da rede, `curl http://<ip>:3000/despesas` falha na conexão.
- [ ] `npm run dev` e o proxy do Vite continuam funcionando.
--- FIM ISSUE 3 ---

--- ISSUE 4 ---
Título: [Segurança] Aplicação conecta ao Postgres com o superusuário da imagem
Labels sugeridas: security, severidade:média
Achados: F04 (média)

## Descrição
O `POSTGRES_USER` do `.env` serve a dois fins: a imagem `postgres:16` cria esse
usuário como SUPERUSER na primeira subida, e o Pool da API conecta com ele. A API roda
com poder total sobre o servidor de banco.

**Por que importa:** superusuário ignora RLS, pode `DROP` e `ALTER`, ler outros bancos
do cluster e executar comandos no contêiner com `COPY ... TO PROGRAM`. Hoje não há SQL
injection (todas as queries são parametrizadas), então a exploração exige outra falha
ou a credencial. Esta é a camada que limita o estrago quando algo der errado.

## Evidência
- `backend/docker-compose.yml:6-7`
  ```yaml
  env_file:
    - ../.env
  ```
- `backend/src/db/db.js:8-9`
  ```js
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ```
- Confirmação pendente (o Docker estava parado na auditoria):
  `SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user;`

## Impacto
Uma injeção futura ou o vazamento da credencial vira controle total do banco e
execução de comandos no contêiner. Também impede usar RLS como defesa em profundidade.

## Sugestão de correção
1. Criar uma role só para a API, em migration ou script de init:
   ```sql
   CREATE ROLE din_din_app LOGIN PASSWORD '<senha do .env>' NOSUPERUSER NOBYPASSRLS;
   GRANT CONNECT ON DATABASE din_din_db TO din_din_app;
   GRANT USAGE ON SCHEMA public TO din_din_app;
   GRANT SELECT, INSERT, UPDATE, DELETE ON despesas, categorias TO din_din_app;
   GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO din_din_app;
   ```
2. Separar no `.env`: `POSTGRES_USER` (admin: contêiner e migrations) e
   `APP_DB_USER`/`APP_DB_PASSWORD` (Pool da API).
3. Opcional, depois da issue 1: RLS com `FORCE ROW LEVEL SECURITY` e policy por
   `usuario_id`, como segunda tranca.

## Critérios de aceite
- [ ] O Pool conecta com uma role com `rolsuper = false` e `rolbypassrls = false`.
- [ ] A role da API não consegue `DROP TABLE despesas` nem `CREATE TABLE`.
- [ ] As tabelas pertencem a outra role (o `\dt` mostra o dono).
- [ ] `npm start` e os testes de integração passam com a nova role.
--- FIM ISSUE 4 ---

--- ISSUE 5 ---
Título: [Segurança] Placeholders do .env.example aceitos sem validação no boot
Labels sugeridas: security, severidade:média
Achados: F13 (média), F14 (baixa)

## Descrição
O setup manda copiar o `.env.example` (`README.md:156`, `CLAUDE.md:28`). Se ninguém
editar, o banco nasce com `seu_usuario_aqui` / `sua_senha_aqui`, uma credencial
pública no repositório, e esse usuário é superusuário na porta 5434. Nada no boot
rejeita os placeholders nem a falta das variáveis: sem `POSTGRES_PASSWORD`, a API sobe
e só falha na primeira query. O `DATABASE_URL` repete a credencial e não é lido por
nenhum código. O `.gitignore` da raiz cobre `.env`, mas não `.env.local` ou
`.env.production`.

**Condição:** nesta máquina não ocorre, porque o `.env` local tem usuário e senha
diferentes do exemplo e a senha é forte. Afeta qualquer clone novo que siga o README.

## Evidência
- `.env.example:7-8`
  ```
  POSTGRES_USER=seu_usuario_aqui
  POSTGRES_PASSWORD=sua_senha_aqui
  ```
- `.env.example:14`: `DATABASE_URL=postgresql://seu_usuario_aqui:sua_senha_aqui@...`
- `backend/src/db/db.js:8-9`: lê `process.env` sem validar
- `backend/server.js:1-8`: sobe sem checar a configuração
- `.gitignore:3`: só `.env` (o `frontend/.gitignore:16-18` já cobre `.env.*`)

## Impacto
Clone novo com credencial conhecida, exposta na rede (issues 3 e 4). Arquivos `.env.*`
da raiz podem ser commitados por engano.

## Sugestão de correção
```js
// backend/src/config/env.js (importado no topo do server.js, antes do app)
import * as z from 'zod'

const PLACEHOLDERS = ['seu_usuario_aqui', 'sua_senha_aqui']
const real = (s) => s.refine((v) => !PLACEHOLDERS.includes(v), 'placeholder do .env.example')

const Env = z.object({
  POSTGRES_USER: real(z.string().min(1)),
  POSTGRES_PASSWORD: real(z.string().min(12)),
  POSTGRES_DB: z.string().min(1),
  POSTGRES_HOST: z.string().default('127.0.0.1'),
  POSTGRES_PORT: z.coerce.number().int().default(5434),
  PORT: z.coerce.number().int().default(3000)
})

export const env = Env.parse(process.env) // lança e derruba o boot com a lista de erros
```
- Remover `DATABASE_URL` do `.env.example`, ou passar a usá-la (uma forma só).
- No `.gitignore` da raiz, acrescentar `.env.*` e `!.env.example`.

## Critérios de aceite
- [ ] Com o `.env` copiado sem editar, `npm start` falha na hora, com mensagem clara.
- [ ] Sem `POSTGRES_PASSWORD`, `npm start` falha na hora.
- [ ] Senha com menos de 12 caracteres é recusada no boot.
- [ ] `git check-ignore .env.local .env.production` lista os dois arquivos.
- [ ] O `.env.example` não tem mais `DATABASE_URL` duplicada (ou ela passa a ser usada).
--- FIM ISSUE 5 ---

--- ISSUE 6 ---
Título: [Segurança] Erros vazam detalhes internos e faltam cabeçalhos de segurança
Labels sugeridas: security, severidade:baixa
Achados: O1 (baixa), O2 (baixa), F16 (informativa)

## Descrição
Três pontos ligados à forma como a API responde:
1. Todo 500 devolve `erro: error.message`, o texto cru do Postgres (nome de
   constraint, "numeric field overflow", erro de conexão).
2. JSON malformado cai no handler padrão do Express, que devolve uma página HTML com
   stack trace e caminhos absolutos do disco, porque `NODE_ENV` não é definido.
   O conteúdo ecoado sai escapado (não há XSS), mas a stack expõe a estrutura interna.
3. Não há cabeçalhos de segurança: `X-Powered-By: Express` sai em toda resposta, e a
   CSP do front só existe como `<meta>` no build, que não aceita `frame-ancestors`.

## Evidência
- `erro: error.message` em `despesasController.js:19,36,54,82,100` e
  `categoriasController.js:14,28,40,62,78`
  ```js
  return res.status(500).json({ message: "Erro ao buscar despesas", erro: error.message });
  ```
- `backend/src/app.js:4-7`: sem handler de erro de 4 argumentos e sem helmet
- Teste da auditoria: `POST /despesas` com o corpo `<img src=x onerror=alert(1)>`
  devolveu 400 `text/html` com `SyntaxError: Unexpected token ...` e a stack com os
  caminhos de `node_modules`
- `frontend/vite.config.js:7-8`: o próprio comentário registra o limite do `<meta>`

## Impacto
Reconhecimento facilitado: nomes de tabelas e constraints, framework e caminhos do
servidor. Sem `frame-ancestors`, o front pode ser embutido num iframe (clickjacking)
quando for publicado.

## Sugestão de correção
- Handler de erro central (roteiro A1/M2), registrado por último em `app.js`:
  - `err.type === 'entity.parse.failed'`: 400 JSON `{ message: 'JSON inválido' }`;
  - demais: 500 JSON genérico, com `console.error(err)` só no servidor.
- Tirar `erro: error.message` dos controllers (passar o erro com `next(error)`).
- `helmet()`, ou no mínimo `app.disable('x-powered-by')`.
- `NODE_ENV=production` no `npm start`.
- No servidor que publicar o build: CSP por cabeçalho com `frame-ancestors 'none'`,
  `X-Content-Type-Options: nosniff` e HSTS.

## Critérios de aceite
- [ ] Nenhuma resposta contém mensagem do banco nem stack trace.
- [ ] JSON malformado responde 400 com `application/json`.
- [ ] As respostas não têm `X-Powered-By`.
- [ ] Testes automatizados cobrem o 400 de JSON malformado e o 500 genérico.
--- FIM ISSUE 6 ---

--- ISSUE 7 ---
Título: [Segurança] Travar regressão de XSS no lint do frontend
Labels sugeridas: security, severidade:informativa
Achados: F15 (informativa)

## Descrição
Hoje não há XSS: nenhum `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function`
ou URL dinâmica no `frontend/src`, e todo dado do usuário sai como texto JSX
(escapado). Mas a API aceita e guarda HTML bruto (`<img src=x onerror=...>` em
`descricao`, `categoria` e `nome`), então a proteção depende só do escape na saída.
Nada impede que um commit futuro renderize esses campos como HTML.

## Evidência
- Entrada sem restrição de conteúdo: `despesasValidator.js:4-11` e
  `categoriasValidator.js:6-10`
- Saídas verificadas, todas em texto JSX: `ExpenseList.jsx:143,152,162,168,176,193,198`,
  `ExpenseDetailsModal.jsx:27,44,48`, `FaltaPagar.jsx:74,78,85`, `Toast.jsx:47`,
  `ExpenseFilters.jsx:75,101-102`, `ExpenseModal.jsx:287,404`
- `frontend/.oxlintrc.json`: só `rules-of-hooks` e `only-export-components`
- Teste da auditoria: o `src` atual passa sem erro com as regras abaixo

## Impacto
Nenhum hoje. Evita que um XSS armazenado apareça por descuido (por exemplo, ao
renderizar a descrição com markdown, num relatório HTML ou num e-mail).

## Sugestão de correção
```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "oxc"],
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }],
    "react/no-danger": "error",
    "react/no-danger-with-children": "error",
    "react/jsx-no-script-url": "error",
    "no-eval": "error",
    "no-new-func": "error"
  }
}
```
- Registrar a regra no `CLAUDE.md`: dado do usuário só sai como texto; se um dia
  precisar de HTML, sanitizar com DOMPurify.

## Critérios de aceite
- [ ] `npm --prefix frontend run lint` falha num arquivo com `dangerouslySetInnerHTML`.
- [ ] `npm --prefix frontend run lint` passa no código atual.
- [ ] A regra de saída está registrada no `CLAUDE.md`.
--- FIM ISSUE 7 ---

--- ISSUE 8 ---
Título: [Segurança] Schema de categorias e listagens sem limites de entrada
Labels sugeridas: security, severidade:baixa
Achados: O3 (baixa), O4 (baixa)

## Descrição
O schema de categorias não limita o que entra, e as listagens não limitam o que sai:
- `nome` aceita string vazia ou só espaços (sem `.trim().min(1)`);
- `descricao` não tem `.max()`: aceita até o limite do body (100 kB) por requisição;
- `limiteMensal` aceita negativo e, acima de 99.999.999,99, estoura `NUMERIC(10,2)`
  e vira 500 com a mensagem do banco;
- `icone` aceita qualquer texto de até 30 caracteres;
- `GET /despesas` e `GET /categorias` não têm `LIMIT`, e não há rate limit.

## Evidência
- `backend/src/validators/categoriasValidator.js:6-19`
  ```js
  nome: z.string()
         .max(50),
  // ...
  descricao: z.string(),
  // ...
  limiteMensal: z.number(),
  ```
- `backend/src/db/init.sql:17`: `limite_mensal NUMERIC(10, 2) NOT NULL`
- `backend/src/controllers/despesasController.js:12-14` e `categoriasController.js:10`:
  `SELECT` sem `LIMIT`
- `package.json:18-25`: nenhuma lib de rate limit

## Impacto
Crescimento do banco com textos grandes, dados inválidos (limite negativo) e respostas
cada vez maiores nas listagens (OWASP API4, consumo irrestrito de recursos).

## Sugestão de correção
```js
nome: z.string().trim().min(1).max(50),
descricao: z.string().trim().max(200),
limiteMensal: z.number().nonnegative().max(99999999.99).multipleOf(0.01),
icone: z.string().regex(/^[a-z0-9-]{1,30}$/).default('tag'),
```
- Paginação nas listagens (roteiro M3): `LIMIT $n OFFSET $m`, com teto (ex.: 100).
- `express-rate-limit` geral (roteiro CRI-10).

## Critérios de aceite
- [ ] `POST /categorias` com `nome: "   "`, `descricao` de 10 kB ou `limiteMensal: -1`
      responde 400.
- [ ] `limiteMensal: 1e12` responde 400, não 500.
- [ ] `GET /despesas` devolve no máximo o teto configurado por página.
- [ ] Os testes do validator cobrem os casos acima.
--- FIM ISSUE 8 ---
