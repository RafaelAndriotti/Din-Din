// Dados do relatório de correções de segurança do Din-Din (2026-11-23, branch fix/auditoria-seguranca).
// Fonte do gerar-relatorio-correcoes.mjs. Id, severidade, título e categoria de cada achado vêm de
// achados.mjs; aqui fica só o que foi feito. Mesma convenção de texto: `código` e **negrito**.
// Linhas e trechos citados são do código novo; o gerador confere se cada trecho existe no arquivo.

export const meta = {
  titulo: 'Relatório de Correções de Segurança — Din-Din',
  projeto: 'Din-Din',
  subtitulo: 'O que mudou no projeto para fechar os achados críticos, altos, médios e baixos da auditoria de segurança',
  data: '23/11/2026',
  branch: 'fix/auditoria-seguranca',
  base: 'main @ ace7aec',
  testes: 198,
  arquivosTeste: 9,
  verificacoesApi: 30,
  verificacoesUi: 15
};

export const stackNova = [
  ['Autenticação', 'JWT HS256 de 1 hora (`jsonwebtoken`, já instalado) e senha com scrypt do `node:crypto`'],
  ['Banco', 'Role `din_din_app` sem superusuário; tabela `usuarios`; `usuario_id` com FK'],
  ['Configuração', '`.env` validado com Zod no boot (`backend/src/config.js`)'],
  ['Rede', 'API e Postgres só em `127.0.0.1`'],
  ['Limites', '`express-rate-limit` 8 (única dependência nova) e paginação'],
  ['Frontend', 'Tela de login, token no `Authorization` e volta ao login no 401']
];

export const escopo = [
  "Pedido: aplicar as correções de todos os achados críticos, altos, médios e baixos da auditoria de 23/11/2026, ou seja, F01–F14 e as observações O1–O4.",
  "Fora: os dois informativos, F15 e F16 (a issue 7 e parte da 6). A seção 6 diz o que falta neles.",
  "Base: `main` @ `ace7aec`, a versão auditada, mais o commit do relatório da auditoria (`816e56d`).",
  "Na geração deste relatório, as mudanças estavam na árvore de trabalho da branch `fix/auditoria-seguranca`, ainda sem commit.",
  "Verificado com a suíte de testes, com Postgres 16 e a API reais em contêiner descartável, e no navegador."
];

// Situação de cada critério de aceite das issues (seção 9).
export const estados = {
  feito: { rotulo: 'Feito', cor: '#059669' },
  parcial: { rotulo: 'Parcial', cor: '#D97706' },
  local: { rotulo: 'Na sua máquina', cor: '#2563EB' },
  naoTestado: { rotulo: 'Não testado', cor: '#64748B' },
  fora: { rotulo: 'Fora do escopo', cor: '#475569' }
};

export const mudancasPorCategoria = {
  1: {
    antes: "Nenhum mecanismo de isolamento: sem autenticação, sem coluna de dono e sem RLS. A API conectava como superusuário, e API e banco escutavam em todas as interfaces.",
    depois: "**Autenticação JWT e dono em toda query.** Toda rota fora de `/auth` exige token, e despesas e categorias têm `usuario_id NOT NULL` com FK. A API conecta com uma role sem superusuário, e API e banco só escutam em `127.0.0.1`."
  },
  2: {
    antes: "As escritas em `/categorias` não tinham UI, mas respondiam a qualquer cliente.",
    depois: "**Quem decide é o servidor, não a interface.** As escritas em `/categorias` exigem token e só alcançam as categorias do dono."
  },
  3: {
    antes: "Os 6 handlers por ID filtravam só por `id`, e os IDs são sequenciais: ler, alterar ou apagar tudo era um laço de 1 a N.",
    depois: "**Posse dentro do WHERE.** Os 6 handlers filtram por `id` e por `usuario_id`. Registro de outro usuário responde 404, como um inexistente."
  },
  4: {
    antes: "Nenhum segredo versionado, mas os placeholders públicos do `.env.example` eram aceitos sem validação, e o `.gitignore` não cobria `.env.*`.",
    depois: "**Configuração validada no boot.** Com placeholder, variável faltando ou senha curta, a API não sobe. O `.gitignore` cobre `.env.*`."
  },
  5: {
    antes: "Nenhuma XSS explorável. Dois informativos: HTML bruto guardado sem trava de regressão no lint, e falta de cabeçalhos de segurança.",
    depois: "**Sem mudança de risco.** Continua sem XSS explorável, e a API não envia mais `X-Powered-By`. O lint anti-XSS e os cabeçalhos do servidor do front ficaram fora do escopo (informativos)."
  }
};

// Uma entrada por achado do escopo (F01–F14) e por observação (O1–O4).
// feito: o que mudou. porque: a razão do desenho. verificacao: como foi conferido. acaoLocal: o que falta rodar na sua máquina.
export const correcoes = {
  F01: {
    feito: "Autenticação por e-mail e senha. As rotas públicas `POST /auth/registro` e `POST /auth/login` devolvem um JWT assinado com HS256 que vale 1 hora. O middleware `autenticar`, montado em `routes/index.js` antes dos routers de despesas e categorias, exige `Authorization: Bearer <token>` e grava o dono em `req.usuarioId`; sem token válido, a resposta é 401. A tabela nova `usuarios` guarda o e-mail e o hash da senha, e `despesas` e `categorias` ganharam `usuario_id NOT NULL` com FK. No frontend, a tela de login cria a conta ou entra, e o token vai em toda chamada.",
    porque: "Um middleware só, na frente de todos os routers, protege também as rotas que ainda vão ser criadas: não depende de lembrar a autenticação rota a rota. O algoritmo é fixo na verificação (`algorithms: ['HS256']`), então um token com `\"alg\": \"none\"` é recusado. No login, e-mail inexistente e senha errada recebem a mesma resposta e levam o mesmo tempo: quando a conta não existe, a senha é conferida contra um hash falso, e o tempo de resposta não revela quem tem conta.",
    verificacao: "`seguranca.test.js`: as 10 rotas de dados sem token respondem 401 sem consultar o banco; token vencido, assinado com outro segredo, com `alg: none`, sem `sub` ou malformado também. `auth.test.js`: hash, registro, 409 e a mesma resposta 401 para e-mail inexistente e senha errada. Ponta a ponta com Postgres real (E4) e no navegador (E8).",
    acaoLocal: "Se o seu banco já tinha despesas, elas ficam sem dono e invisíveis até a `migracao-001` passá-las para a sua conta (seção 8, passo 6).",
    refs: [
      { arq: 'backend/src/routes/index.js', lin: '9-14', trecho: [
        '// Públicas. Limite apertado contra força bruta de senha: 10 tentativas por IP a cada 15 minutos.',
        "app.use('/auth', limitar({ minutos: 15, maximo: 10 }), authRoutes);",
        '// Daqui para baixo, toda rota exige token válido (F01): sem ele, 401.',
        'app.use(autenticar);',
        'app.use(despesasRoutes);',
        'app.use(categoriasRoutes);'
      ], nota: "um middleware na frente de todos os routers" },
      { arq: 'backend/src/middleware/autenticar.js', lin: '5-15', trecho: [
        'export function autenticar(req, res, next) {',
        "    const [tipo, token] = (req.get('authorization') ?? '').split(' ');",
        "    const usuarioId = tipo === 'Bearer' && token ? lerToken(token) : null;",
        '',
        '    if (!usuarioId) {',
        "        return res.status(401).set('WWW-Authenticate', 'Bearer').json({ message: 'Faça login para continuar.' });",
        '    }',
        '',
        '    req.usuarioId = usuarioId;',
        '    next();',
        '}'
      ] },
      { arq: 'backend/src/auth/token.js', lin: '8-17', trecho: [
        'export const emitirToken = (usuarioId) =>',
        "    jwt.sign({}, config.JWT_SECRET, { algorithm: 'HS256', expiresIn: VALIDADE, subject: String(usuarioId) });",
        '…',
        "        const { sub } = jwt.verify(token, config.JWT_SECRET, { algorithms: ['HS256'] });",
        '        const id = Number(sub);',
        '        return Number.isInteger(id) && id > 0 ? id : null;'
      ], nota: "algoritmo fixo na verificação; vale 1 hora" },
      { arq: 'backend/src/auth/senha.js', lin: '10-31', nota: "scrypt com N=2^15, r=8, p=3 (OWASP), sal de 16 bytes e comparação com `timingSafeEqual`" },
      { arq: 'backend/src/controllers/authController.js', lin: '9-10,37-42', trecho: [
        'const hashSemConta = () => (hashFalso ??= gerarHash(randomUUID()));',
        '…',
        'const senhaConfere = await conferirSenha(senha, usuario?.senha_hash ?? await hashSemConta());',
        '…',
        'if (!usuario || !senhaConfere) {',
        "    return res.status(401).json({ message: 'E-mail ou senha incorretos.' });",
        '}'
      ], nota: "e-mail inexistente e senha errada: mesma resposta, mesmo tempo" },
      { arq: 'backend/src/db/init.sql', lin: '28-33,37,48', nota: "tabela `usuarios`; `usuario_id INTEGER NOT NULL REFERENCES usuarios (id)` nas duas tabelas" },
      { arq: 'frontend/src/services/api.js', lin: '84-115', nota: "envia o Bearer; 401 com token descarta a sessão e volta ao login" },
      { arq: 'frontend/src/components/Login.jsx', lin: '1-111', nota: "tela de entrada e de criação de conta" }
    ]
  },
  F02: {
    feito: "A listagem filtra por `usuario_id = $1` e é paginada: `ORDER BY id LIMIT $2 OFFSET $3`. `?pagina=` e `?limite=` passam pelo `paginacaoSchema`, com padrão de 50 itens e teto de 100.",
    porque: "O dono vem de `req.usuarioId`, preenchido pelo middleware a partir do token, e nunca do body ou da query: o cliente não escolhe de quem são os dados que lê. O `ORDER BY id` deixa as páginas estáveis, porque sem ele o Postgres não garante a mesma ordem entre uma página e outra.",
    verificacao: "`despesas.routes.test.js`: a query recebe o dono do token e 50 por página; `?pagina=3&limite=20` pula 40; `limite=101`, `limite=0`, `pagina=0` e `pagina=abc` respondem 400 sem consultar o banco. Ponta a ponta: Bruno lista e não vê nada de Ana (E4).",
    refs: [
      { arq: 'backend/src/controllers/despesasController.js', lin: '13-19', trecho: [
        'const { rows } = await pool.query(',
        '    `SELECT ${COLUNAS} FROM despesas',
        '    WHERE usuario_id = $1',
        '    ORDER BY id',
        '    LIMIT $2 OFFSET $3`,',
        '    [req.usuarioId, limite, (pagina - 1) * limite]',
        ');'
      ] },
      { arq: 'backend/src/routes/despesasRoutes.js', lin: '10', trecho: ["routes.get('/despesas', validate({ query: paginacaoSchema }), DespesasController.listarDespesas);"] },
      { arq: 'backend/src/validators/paginacaoSchema.js', lin: '4-7', trecho: [
        'export const paginacaoSchema = z.object({',
        '    pagina: z.coerce.number().int().min(1).max(1000000).default(1),',
        '    limite: z.coerce.number().int().min(1).max(100).default(50)',
        '});'
      ] }
    ]
  },
  F03: {
    feito: "Mesmo filtro e mesma paginação da listagem de despesas. O `UNIQUE` global em `nome` virou o índice único `(usuario_id, nome)`. Nome repetido para o mesmo dono responde 409, com mensagem genérica.",
    porque: "Com o `UNIQUE` global, a categoria \"Lazer\" de um usuário bloquearia o nome para todos os outros, e o erro de duplicidade revelaria que alguém já a criou. O 409 vem do handler central, pelo código `23505` do Postgres, sem expor o nome da constraint.",
    verificacao: "`categorias.routes.test.js`: lista do dono e 409 para nome repetido. Ponta a ponta: Bruno cria \"Lazer\" (201) mesmo com Ana tendo uma; Ana repetindo o nome recebe 409, sem nome de constraint na resposta (E4).",
    refs: [
      { arq: 'backend/src/controllers/categoriasController.js', lin: '13-19', nota: "mesmo filtro por dono e mesma paginação" },
      { arq: 'backend/src/routes/categoriasRoutes.js', lin: '11', nota: "`validate({ query: paginacaoSchema })`" },
      { arq: 'backend/src/db/init.sql', lin: '62-66', trecho: [
        'ALTER TABLE categorias DROP CONSTRAINT IF EXISTS categorias_nome_key;',
        '…',
        '-- Nome único por dono: a categoria de um usuário não bloqueia o nome para os outros (F03).',
        'CREATE UNIQUE INDEX IF NOT EXISTS categorias_usuario_nome_key ON categorias (usuario_id, nome);'
      ] },
      { arq: 'backend/src/middleware/erros.js', lin: '11-14', trecho: [
        '// unique_violation do Postgres: o registro já existe (ex.: categoria com o mesmo nome).',
        "if (err.code === '23505') {",
        "    return res.status(409).json({ message: 'Já existe um registro com esses dados.' });",
        '}'
      ] }
    ]
  },
  F04: {
    feito: "A API conecta com uma role própria, `APP_DB_USER` (padrão `din_din_app`), que o `init.sql` cria com `NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE`. Ela recebe só `SELECT, INSERT, UPDATE, DELETE` em `despesas` e `categorias`, `SELECT, INSERT` em `usuarios` e `USAGE` nas sequences. As tabelas continuam do admin do contêiner, que só aplica o `init.sql`. O `config.js` recusa subir se `APP_DB_USER` for igual a `POSTGRES_USER`.",
    porque: "Menor privilégio: se um dia houver uma injeção ou a senha da API vazar, o estrago fica em ler e alterar linhas, sem `DROP`, sem ler outros bancos e sem `COPY … TO PROGRAM`. A senha da role vem do ambiente do contêiner (`\\getenv`), então não fica escrita em nenhum arquivo versionado. `REVOKE CREATE ON SCHEMA public FROM PUBLIC` impede a role de criar tabelas próprias.",
    verificacao: "Em Postgres 16 descartável: `rolsuper`, `rolbypassrls`, `rolcreatedb` e `rolcreaterole` falsos, e as tabelas pertencem ao admin (E3). Como a role da API, `DROP TABLE`, `CREATE TABLE`, `ALTER TABLE`, `UPDATE usuarios`, ler `pg_authid` e `COPY … TO PROGRAM` falham com `42501` (E5).",
    acaoLocal: "Pôr `APP_DB_USER` e `APP_DB_PASSWORD` no `.env`, recriar o contêiner e rodar o `init.sql` (seção 8, passos 2 a 4).",
    refs: [
      { arq: 'backend/src/db/init.sql', lin: '68-78', trecho: [
        '-- Role da API: sem superusuário, sem BYPASSRLS, sem criar banco nem role.',
        "SELECT format('CREATE ROLE %I', :'usuario_app')",
        " WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = :'usuario_app') \\gexec",
        "ALTER ROLE :\"usuario_app\" LOGIN PASSWORD :'senha_app' NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;",
        '',
        'REVOKE CREATE ON SCHEMA public FROM PUBLIC;',
        '…',
        'GRANT SELECT, INSERT ON usuarios TO :"usuario_app";',
        'GRANT SELECT, INSERT, UPDATE, DELETE ON despesas, categorias TO :"usuario_app";',
        'GRANT USAGE ON SEQUENCE usuarios_id_seq, despesas_id_seq, categorias_id_seq TO :"usuario_app";'
      ] },
      { arq: 'backend/src/db/init.sql', lin: '12-26', nota: "lê a senha do ambiente do contêiner e recusa rodar se a role da API for o próprio admin" },
      { arq: 'backend/src/db/db.js', lin: '6-13', trecho: [
        '// A API conecta com a role da aplicação (APP_DB_USER), sem superusuário, e não com o admin do contêiner (F04).',
        'const pool = new Pool({',
        '    …',
        '    user: config.APP_DB_USER,',
        '    password: config.APP_DB_PASSWORD,',
        '    …',
        '});'
      ] },
      { arq: 'backend/src/config.js', lin: '23-26', nota: "`APP_DB_USER` igual a `POSTGRES_USER` é recusado no boot" }
    ]
  },
  F05: {
    feito: "A API escuta só em `127.0.0.1`, e o compose publica o Postgres em `127.0.0.1:5434`. O proxy do Vite passou a apontar para `127.0.0.1:3000` e ganhou a rota `/auth`.",
    porque: "Isso tira a dependência do Firewall do Windows: mesmo com um “Permitir” no aviso, ninguém de fora alcança as portas. O proxy usa `127.0.0.1` e não `localhost` porque `localhost` pode resolver para `::1` (IPv6), onde a API não escuta mais. Quando for preciso abrir para a rede, o caminho é um proxy com TLS na frente, não trocar o host.",
    verificacao: "`netstat` mostrou a API e o Postgres de teste só em `127.0.0.1`. Num compose de teste, a porta saiu publicada em `127.0.0.1`, e mudar o `.env` recriou o contêiner. O frontend funcionou pelo proxy do Vite (E8, E9).",
    acaoLocal: "O seu `postgres-dev` continua publicado em `0.0.0.0:5434`, porque foi criado com o compose antigo. `docker compose -f backend/docker-compose.yml up -d` recria o contêiner na porta nova, e os dados ficam no volume (seção 8, passo 3).",
    refs: [
      { arq: 'backend/server.js', lin: '5-8', trecho: [
        '// Só a própria máquina alcança a API (F05). Abrir para a rede só com um proxy com TLS na frente.',
        "const HOST = '127.0.0.1'",
        '',
        'app.listen(config.PORT, HOST, () => {'
      ] },
      { arq: 'backend/docker-compose.yml', lin: '8-10', trecho: [
        '# Só a própria máquina alcança o banco (F05). Sem o 127.0.0.1, o Docker publica em todas as interfaces.',
        'ports:',
        '  - "127.0.0.1:5434:5432"'
      ] },
      { arq: 'frontend/vite.config.js', lin: '38-42', trecho: [
        '// 127.0.0.1, não localhost: a API só escuta em IPv4 local, e localhost pode resolver para ::1.',
        'proxy: {',
        "  '/auth': {",
        "    target: 'http://127.0.0.1:3000',",
        '    …'
      ] }
    ]
  },
  F06: {
    feito: "`POST`, `PUT` e `DELETE /categorias` exigem token, como todas as rotas fora de `/auth`, e só alcançam as categorias do dono do token.",
    porque: "Esconder o botão no frontend não protege nada: quem decide é o servidor. Com o middleware na frente dos routers, uma rota sem UI tem a mesma proteção de uma com UI.",
    verificacao: "`seguranca.test.js`: `POST`, `PUT` e `DELETE /categorias` sem token respondem 401. Ponta a ponta: Bruno recebe 404 ao alterar ou apagar uma categoria de Ana (E4).",
    refs: [
      { arq: 'backend/src/routes/index.js', lin: '11-14', nota: "o mesmo `autenticar` cobre as rotas sem UI" },
      { arq: 'backend/src/routes/categoriasRoutes.js', lin: '13-15', nota: "`POST`, `PUT` e `DELETE`: token obrigatório e filtro pelo dono" }
    ]
  },
  F07: {
    feito: "`UPDATE … WHERE id = $7 AND usuario_id = $8`. A despesa de outro usuário não casa com o WHERE, `rows` volta vazio e a resposta é 404, a mesma de uma despesa inexistente.",
    porque: "A posse é conferida dentro da própria query, não num `SELECT` anterior: não há janela entre conferir e alterar, e é uma ida só ao banco. Responder 404, e não 403, não revela que o ID existe.",
    verificacao: "`despesas.routes.test.js`: o id e o dono vão para o banco, e id de outro dono responde 404. Ponta a ponta: o PUT de Bruno numa despesa de Ana responde 404, e a despesa continua intacta (E4).",
    refs: [
      { arq: 'backend/src/controllers/despesasController.js', lin: '53-64', trecho: [
        'const { rows } = await pool.query(',
        '    `UPDATE despesas',
        '        SET descricao=$1,',
        '        …',
        '    WHERE id = $7 AND usuario_id = $8',
        '    RETURNING ${COLUNAS}`,',
        '    [descricao, valor, categoria, metodoPagamento, parcelas, status, id, req.usuarioId]',
        ');'
      ] },
      { arq: 'backend/src/controllers/despesasController.js', lin: '66-68', nota: "nenhuma linha: 404, igual a inexistente" }
    ]
  },
  F08: {
    feito: "`DELETE FROM despesas WHERE id = $1 AND usuario_id = $2`. Com `rowCount` 0, a resposta é 404.",
    porque: "Mesmo princípio do F07. O DELETE é físico, então esta era a falha de maior estrago: um laço apagava o histórico de todos.",
    verificacao: "`despesas.routes.test.js`: id de outro dono responde 404. Ponta a ponta: o DELETE de Bruno numa despesa de Ana responde 404, e ela continua no banco (E4).",
    refs: [
      { arq: 'backend/src/controllers/despesasController.js', lin: '75-82', trecho: [
        'const { rowCount } = await pool.query(',
        '    `DELETE FROM despesas WHERE id = $1 AND usuario_id = $2`,',
        '    [id, req.usuarioId]',
        ')',
        '',
        'if (rowCount === 0){',
        "    return res.status(404).json({ message: 'Despesa nao encontrada.' })",
        '}'
      ] }
    ]
  },
  F09: {
    feito: "`SELECT … WHERE id = $1 AND usuario_id = $2`. A despesa de outro usuário responde 404, então a diferença entre 200 e 404 não revela mais quais IDs existem.",
    porque: "Mesmo princípio do F07, em leitura.",
    verificacao: "`despesas.routes.test.js`: id de outro dono responde 404. Ponta a ponta: Bruno recebe 404 numa despesa de Ana (E4).",
    refs: [
      { arq: 'backend/src/controllers/despesasController.js', lin: '38-41', trecho: [
        'const { rows } = await pool.query(',
        '    `SELECT ${COLUNAS} FROM despesas WHERE id = $1 AND usuario_id = $2`,',
        '    [req.validacao.params.id, req.usuarioId]',
        ');'
      ] }
    ]
  },
  F10: {
    feito: "`UPDATE categorias … WHERE id = $8 AND usuario_id = $9`. A categoria de outro usuário responde 404.",
    porque: "Mesmo princípio do F07.",
    verificacao: "`categorias.routes.test.js`: o id e o dono vão para o banco, e id de outro dono responde 404. Ponta a ponta: o PUT de Bruno numa categoria de Ana responde 404, e ela fica intacta (E4).",
    refs: [
      { arq: 'backend/src/controllers/categoriasController.js', lin: '50-54', trecho: [
        'const { rows } = await pool.query(',
        '    `UPDATE categorias',
        '    SET nome = $1, ativo = $2, descricao = $3, cor = $4, limite_mensal = $5, tipo_custo = $6, icone = $7',
        '    WHERE id = $8 AND usuario_id = $9',
        '    RETURNING ${COLUNAS}`,[nome, ativo, descricao, cor, limiteMensal, tipoCusto, icone, id, req.usuarioId]);'
      ] }
    ]
  },
  F11: {
    feito: "`DELETE FROM categorias WHERE id = $1 AND usuario_id = $2`. Com `rowCount` 0, a resposta é 404.",
    porque: "Mesmo princípio do F07.",
    verificacao: "Ponta a ponta: o DELETE de Bruno numa categoria de Ana responde 404, e ela continua no banco (E4).",
    refs: [
      { arq: 'backend/src/controllers/categoriasController.js', lin: '65', trecho: ['const { rowCount } = await pool.query(`DELETE FROM categorias WHERE id = $1 AND usuario_id = $2`, [id, req.usuarioId])'] }
    ]
  },
  F12: {
    feito: "`SELECT … WHERE id = $1 AND usuario_id = $2`. A categoria de outro usuário responde 404.",
    porque: "Mesmo princípio do F07, em leitura.",
    verificacao: "Ponta a ponta: Bruno recebe 404 numa categoria de Ana (E4).",
    refs: [
      { arq: 'backend/src/controllers/categoriasController.js', lin: '25-28', trecho: [
        'const { rows } = await pool.query(',
        '    `SELECT ${COLUNAS} FROM categorias WHERE id = $1 AND usuario_id = $2`,',
        '    [req.validacao.params.id, req.usuarioId]',
        ');'
      ] }
    ]
  },
  F13: {
    feito: "Novo `backend/src/config.js`: um schema Zod valida o `process.env` assim que a API sobe. Ele recusa variável faltando, valor de exemplo (tudo que termina em `_aqui`), senha com menos de 12 caracteres, `JWT_SECRET` com menos de 32 e `APP_DB_USER` igual ao admin. A mensagem lista o nome de cada variável com problema, nunca o valor. `db.js`, `token.js` e `server.js` leem do `config`, não de `process.env`. O `DATABASE_URL`, duplicado e não usado, saiu do `.env.example`.",
    porque: "Falhar no boot é melhor que falhar na primeira query, ou subir com uma credencial publicada no repositório. Todos os placeholders do `.env.example` terminam em `_aqui` de propósito, para que uma regra só pegue todos. O `.env.example` traz o comando que gera um segredo aleatório.",
    verificacao: "`config.test.js`: 9 casos de recusa (o exemplo copiado sem editar, senha do admin ausente, curta ou de exemplo, senha da API ausente ou curta, `JWT_SECRET` ausente ou curto, API conectando como admin) e a mensagem sem o valor. Boot com o `.env.example` sem editar: sai com código 1 e lista as variáveis (E7).",
    refs: [
      { arq: 'backend/src/config.js', lin: '8-21', trecho: [
        "const semExemplo = (schema) => schema.refine((v) => !v.endsWith('_aqui'), 'ainda é o valor de exemplo do .env.example');",
        '…',
        'POSTGRES_PASSWORD: semExemplo(z.string().min(12)),',
        '…',
        'APP_DB_PASSWORD: semExemplo(z.string().min(12)),',
        '…',
        'JWT_SECRET: semExemplo(z.string().min(32)),'
      ] },
      { arq: 'backend/src/config.js', lin: '29-37', nota: "a mensagem traz o nome da variável, nunca o valor" },
      { arq: 'backend/server.js', lin: '1-3', nota: "com o `.env` inválido, a API nem sobe" },
      { arq: '.env.example', lin: '9-22', nota: "variáveis novas, placeholders em `_aqui`, sem `DATABASE_URL`" }
    ]
  },
  F14: {
    feito: "O `.gitignore` da raiz ganhou `.env.*` e a exceção `!.env.example`, a mesma regra do `frontend/.gitignore`.",
    porque: "Um `.env.local` ou `.env.production` criado na raiz não entra mais num `git add .`, e o arquivo de exemplo continua versionado.",
    verificacao: "`git check-ignore -v .env.local .env.production .env.test` lista os três pela regra `.env.*`, e o `.env.example` não é ignorado.",
    refs: [
      { arq: '.gitignore', lin: '3-5', trecho: ['.env', '.env.*', '!.env.example'] }
    ]
  },
  O1: {
    feito: "Os 10 `try/catch` dos controllers saíram. O Express 5 encaminha o erro de uma função async ao handler central `tratarErros`, o último middleware do `app.js`. Ele loga o erro no servidor e responde `500 { message: 'Erro interno do servidor' }`.",
    porque: "Um lugar só decide o que o cliente vê, então não há como esquecer um `error.message` num controller novo. O detalhe continua no log do servidor, onde serve para depurar.",
    verificacao: "`seguranca.test.js` e `categorias.routes.test.js`: erro do banco responde 500 genérico, sem a mensagem do banco, e o `console.error` recebe o erro.",
    refs: [
      { arq: 'backend/src/middleware/erros.js', lin: '5-22', trecho: [
        'export function tratarErros(err, req, res, next) {',
        '    if (res.headersSent) return next(err);',
        '    …',
        '    console.error(err);',
        "    return res.status(500).json({ message: 'Erro interno do servidor' });",
        '}'
      ] },
      { arq: 'backend/src/app.js', lin: '15', trecho: ['app.use(tratarErros) // O1 e O2: sempre por último'] },
      { arq: 'backend/src/controllers/despesasController.js', lin: '6-8', nota: "controllers sem `try/catch`" },
      { arq: 'backend/src/controllers/categoriasController.js', lin: '6-8', nota: "idem" }
    ]
  },
  O2: {
    feito: "O handler central responde 400 `{ message: 'JSON inválido.' }` para `entity.parse.failed` e repassa o status dos demais erros 4xx do body-parser com uma mensagem genérica. A página HTML padrão do Express não é mais alcançada.",
    porque: "Com o handler respondendo antes, a stack e os caminhos do disco não saem mais, com ou sem `NODE_ENV=production`.",
    verificacao: "`seguranca.test.js`: JSON malformado responde 400 em JSON, sem stack. Ponta a ponta: idem, e sem `X-Powered-By` (E4).",
    refs: [
      { arq: 'backend/src/middleware/erros.js', lin: '8-18', trecho: [
        "if (err.type === 'entity.parse.failed') {",
        "    return res.status(400).json({ message: 'JSON inválido.' });",
        '}',
        '…',
        '// Demais erros do body-parser (corpo grande demais, charset inválido) já trazem um status 4xx.',
        'if (err.status >= 400 && err.status < 500) {',
        "    return res.status(err.status).json({ message: 'Requisição inválida.' });",
        '}'
      ] },
      { arq: 'backend/src/app.js', lin: '9', trecho: ["app.disable('x-powered-by'); // não anuncia o framework em toda resposta"], nota: "parte do F16" }
    ]
  },
  O3: {
    feito: "`nome` ficou com `trim().min(1).max(50)` e `descricao` com `trim().max(200)`. `limiteMensal` não aceita negativo, vai até 99.999.999,99 e tem no máximo 2 casas. `icone` só aceita o formato dos nomes do lucide (`^[a-z0-9-]{1,30}$`).",
    porque: "O teto de `limiteMensal` é o do `NUMERIC(10, 2)` da coluna: acima dele o Postgres estourava com 500, e agora é um 400 antes de chegar ao banco. O formato do ícone impede texto livre, inclusive HTML, num campo que só precisa de um nome.",
    verificacao: "`categorias.validator.test.js`: recusa nome só com espaços, vazio ou com 51 caracteres, descrição de 10 kB, limite negativo, `1e12` ou com 3 casas, e ícone com HTML ou com maiúsculas; aceita limites de 0, 0,01, 1.200,5 e 99.999.999,99.",
    refs: [
      { arq: 'backend/src/validators/categoriasValidator.js', lin: '6-27', trecho: [
        'nome: z.string()',
        '       .trim()',
        '       .min(1)',
        '       .max(50),',
        '…',
        'descricao: z.string()',
        '            .trim()',
        '            .max(200),',
        '…',
        'limiteMensal: z.number()',
        '               .nonnegative()',
        '               .max(99999999.99)',
        '               .multipleOf(0.01),',
        '…',
        'icone: z.string()',
        '        .regex(/^[a-z0-9-]{1,30}$/)'
      ] }
    ]
  },
  O4: {
    feito: "As duas listagens são paginadas, com teto de 100 por página. O `express-rate-limit` limita a API toda a 100 requisições por minuto por IP e `/auth` a 10 a cada 15 minutos; acima disso, a resposta é 429 em JSON. O frontend busca as páginas em sequência até receber uma incompleta.",
    porque: "O limite apertado em `/auth` freia a força bruta de senha, que o scrypt já torna cara de propósito. O `app.js` virou a fábrica `criarApp()`, para que cada teste tenha os contadores zerados.",
    verificacao: "`seguranca.test.js`: a 11ª tentativa em `/auth` e a 101ª requisição numa rota comum respondem 429. Ponta a ponta: 429 na 11ª requisição a `/auth` (E4).",
    refs: [
      { arq: 'backend/src/middleware/limites.js', lin: '6-12', trecho: [
        'export const limitar = ({ minutos, maximo }) => rateLimit({',
        '    windowMs: minutos * 60 * 1000,',
        '    limit: maximo,',
        "    standardHeaders: 'draft-8',",
        '    legacyHeaders: false,',
        "    message: { message: 'Muitas requisições. Tente de novo em alguns minutos.' }",
        '});'
      ] },
      { arq: 'backend/src/app.js', lin: '7-10', trecho: [
        'export function criarApp() {',
        '    const app = express();',
        "    app.disable('x-powered-by'); // não anuncia o framework em toda resposta",
        '    app.use(limitar({ minutos: 1, maximo: 100 })); // O4: teto geral por IP'
      ] },
      { arq: 'backend/src/routes/index.js', lin: '10', nota: "10 tentativas a cada 15 minutos em `/auth`" },
      { arq: 'frontend/src/services/api.js', lin: '137-146', nota: "o front busca as páginas até vir uma incompleta" }
    ]
  }
};

// Os informativos, fora do escopo pedido.
export const foraDoEscopo = {
  F15: {
    situacao: 'Aberto', cor: '#64748B',
    texto: "A regra de lint anti-XSS da issue 7 não entrou. O risco não mudou: o frontend continua sem nenhum ponto que renderize HTML, e o `icone` agora tem formato fixo (O3).",
    falta: "oxlint com `react/no-danger`, `react/no-danger-with-children`, `react/jsx-no-script-url`, `no-eval` e `no-new-func` como erro, e a regra registrada no `CLAUDE.md`."
  },
  F16: {
    situacao: 'Parcial', cor: '#D97706',
    texto: "A API não envia mais `X-Powered-By` (`app.js:9`). O resto depende do servidor que vai publicar o frontend, que ainda não existe.",
    falta: "`helmet()` na API e, no servidor do front, CSP por cabeçalho com `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff` e HSTS."
  }
};

// Caminho de uma requisição depois das correções (seção 2).
export const fluxo = [
  { onde: 'backend/src/app.js:10', camada: 'Rate limit geral', texto: "100 requisições por minuto por IP. Acima disso, 429.", itens: 'O4' },
  { onde: 'backend/src/app.js:11', camada: '`express.json()`', texto: "Lê o corpo. JSON malformado vira erro e vai direto ao último passo.", itens: 'O2' },
  { onde: 'backend/src/routes/index.js:10', camada: '`/auth` (público)', texto: "Limite próprio de 10 tentativas a cada 15 minutos. Registro e login devolvem o token.", itens: 'F01, O4' },
  { onde: 'backend/src/routes/index.js:12', camada: '`autenticar`', texto: "Sem `Authorization: Bearer` válido, 401. Com ele, `req.usuarioId` recebe o dono.", itens: 'F01, F06' },
  { onde: 'backend/src/routes/despesasRoutes.js:10-14', camada: '`validate` (Zod)', texto: "Valida `params`, `query` (página e limite) e `body`. O controller só lê `req.validacao`.", itens: 'O3, O4' },
  { onde: 'backend/src/controllers/despesasController.js:6-8', camada: 'Controller', texto: "Toda query leva `usuario_id = req.usuarioId`. Registro de outro dono: 404.", itens: 'F02, F03, F07–F12' },
  { onde: 'backend/src/db/db.js:7-13', camada: 'Pool do `pg`', texto: "Conecta como `din_din_app`, sem superusuário, em `127.0.0.1:5434`.", itens: 'F04, F05' },
  { onde: 'backend/src/middleware/erros.js:5-22', camada: 'Handler de erro', texto: "Todo erro termina aqui: 400, 409 ou 500 genérico. O detalhe fica no log do servidor.", itens: 'O1, O2' }
];

export const decisoes = [
  { titulo: "Token no cabeçalho, não em cookie", texto: "Com `Authorization: Bearer`, o navegador não envia a credencial sozinho, então não existe CSRF. O custo é guardar o token em JavaScript (ver a seção 6)." },
  { titulo: "scrypt da biblioteca padrão", texto: "O `node:crypto` já traz o scrypt, um hash lento de propósito, como argon2 e bcrypt, sem dependência nativa para compilar. Os parâmetros (N=2^15, r=8, p=3, do OWASP) ficam gravados no próprio hash, então dá para endurecê-los depois sem invalidar as senhas existentes." },
  { titulo: "Posse dentro da query, 404 para o que não é seu", texto: "`WHERE id = $1 AND usuario_id = $2` confere e age numa ida só ao banco, sem janela entre checar e alterar. Responder 404, e não 403, não confirma que o ID existe." },
  { titulo: "O dono vem do token, nunca do cliente", texto: "`usuario_id` não existe nos schemas Zod, então o `z.object` descarta o campo se ele vier no body. O controller usa só `req.usuarioId`." },
  { titulo: "Duas roles no banco", texto: "O admin do contêiner é dono das tabelas e só roda o `init.sql`. A API usa `din_din_app`, que só lê e grava linhas. Sem `BYPASSRLS`, essa role também deixa o caminho aberto para RLS no futuro." },
  { titulo: "Migração de dados explícita", texto: "O `init.sql` não adivinha de quem são as despesas antigas: elas ficam sem dono, invisíveis, até a `migracao-001` passá-las para o e-mail informado, numa transação." },
  { titulo: "Erros num lugar só", texto: "O Express 5 encaminha a rejeição de funções async ao middleware de erro. Os controllers ficaram sem `try/catch`, e o handler central decide o que o cliente vê." },
  { titulo: "Falhar cedo na configuração", texto: "O `config.js` roda antes de qualquer conexão. Uma API que não sobe com o `.env` errado é mais segura do que uma que sobe e falha na primeira query." }
];

export const limitacoes = [
  "**Token no `localStorage`.** Sobrevive ao recarregar a página, mas um XSS conseguiria lê-lo. Hoje não há XSS (categoria 5). A alternativa é um cookie `HttpOnly` com `SameSite`, que pede proteção contra CSRF.",
  "**Sem refresh token nem logout no servidor.** O token vale 1 hora e não pode ser revogado antes disso: \"Sair\" apaga o token só no navegador.",
  "**O 409 do registro revela que um e-mail tem conta.** O login não revela (mesma resposta e mesmo tempo), mas o cadastro sim. Fechar isso exige confirmação por e-mail.",
  "**Rate limit na memória do processo.** Zera quando a API reinicia e não é dividido entre instâncias. Com mais de uma instância, trocar por um store compartilhado, como Redis. Está marcado com `shortcut:` em `limites.js`.",
  "**Paginação por OFFSET.** Uma página alta fica lenta, e uma inserção no meio pode pular ou repetir um item entre duas páginas. Para listas grandes, trocar por cursor (`WHERE id > $ultimo`). Está marcado com `shortcut:` em `api.js`.",
  "**`JWT_SECRET` também chega ao contêiner do banco.** O compose lê o `.env` inteiro com `env_file`. Não sai da máquina, mas quem acessa o contêiner vê o segredo. Separar em dois arquivos resolve.",
  "**Não há teste de integração versionado (M1).** A suíte simula o banco. O isolamento entre dois usuários foi verificado com Postgres real por um script desta sessão, que não está no repositório.",
  "**RLS não foi ligado.** O isolamento depende do `WHERE usuario_id` em cada query. RLS com `FORCE ROW LEVEL SECURITY` seria a segunda tranca, e a role nova, sem `BYPASSRLS`, já permite ligá-lo.",
  "**`npm audit`: 2 vulnerabilidades moderadas no `nodemon`, via `minimatch`.** Afeta só o ambiente de desenvolvimento. A correção sugerida (`npm audit fix --force`) troca a versão do `nodemon` e não foi aplicada.",
  "**Sair durante o \"Desfazer\".** Se a pessoa clicar em Sair nos segundos do \"Desfazer\" de uma exclusão, a exclusão não é enviada, e a despesa continua lá no próximo login. É o lado seguro, mas difere de fechar a aba, que envia a exclusão.",
  "**Dados de exemplo no `npm run dev`.** Com a API desligada, o painel mostra os dados de exemplo, como antes, mas só para quem já tem um token salvo. Sem token, a tela é a de login."
];

// Todos os arquivos alterados, fora os desta pasta. mais/menos: linhas do diff (git diff --numstat).
export const arquivos = [
  { grupo: 'Backend', arq: 'backend/server.js', novo: false, mais: 6, menos: 4, itens: 'F05, F13', texto: "Escuta só em `127.0.0.1` e lê a porta do `config`." },
  { grupo: 'Backend', arq: 'backend/src/app.js', novo: false, mais: 14, menos: 4, itens: 'O1, O2, O4, F16', texto: "Fábrica `criarApp()`, rate limit geral, `x-powered-by` desligado e handler de erro no fim." },
  { grupo: 'Backend', arq: 'backend/src/config.js', novo: true, mais: 37, menos: 0, itens: 'F13, F04', texto: "Valida o `.env` no boot com Zod." },
  { grupo: 'Backend', arq: 'backend/src/auth/senha.js', novo: true, mais: 32, menos: 0, itens: 'F01', texto: "Hash e conferência de senha com scrypt." },
  { grupo: 'Backend', arq: 'backend/src/auth/token.js', novo: true, mais: 21, menos: 0, itens: 'F01', texto: "Emite e confere o JWT (HS256, 1 hora)." },
  { grupo: 'Backend', arq: 'backend/src/middleware/autenticar.js', novo: true, mais: 15, menos: 0, itens: 'F01, F06', texto: "Exige o Bearer e grava `req.usuarioId`." },
  { grupo: 'Backend', arq: 'backend/src/middleware/erros.js', novo: true, mais: 22, menos: 0, itens: 'O1, O2, F03', texto: "Handler central: 400, 409, 4xx e 500 genéricos." },
  { grupo: 'Backend', arq: 'backend/src/middleware/limites.js', novo: true, mais: 12, menos: 0, itens: 'O4', texto: "Rate limit por IP." },
  { grupo: 'Backend', arq: 'backend/src/controllers/authController.js', novo: true, mais: 48, menos: 0, itens: 'F01', texto: "Registro e login." },
  { grupo: 'Backend', arq: 'backend/src/controllers/despesasController.js', novo: false, mais: 60, menos: 77, itens: 'F02, F07–F09, O1, O4', texto: "Dono em toda query, paginação e sem `try/catch`." },
  { grupo: 'Backend', arq: 'backend/src/controllers/categoriasController.js', novo: false, mais: 46, menos: 55, itens: 'F03, F06, F10–F12, O1, O4', texto: "Dono em toda query, paginação e sem `try/catch`." },
  { grupo: 'Backend', arq: 'backend/src/routes/index.js', novo: false, mais: 8, menos: 1, itens: 'F01, F06, O4', texto: "`/auth` com limite, depois `autenticar`, depois os routers." },
  { grupo: 'Backend', arq: 'backend/src/routes/authRoutes.js', novo: true, mais: 12, menos: 0, itens: 'F01', texto: "`POST /auth/registro` e `POST /auth/login`." },
  { grupo: 'Backend', arq: 'backend/src/routes/despesasRoutes.js', novo: false, mais: 2, menos: 1, itens: 'O4', texto: "Valida `?pagina=` e `?limite=`." },
  { grupo: 'Backend', arq: 'backend/src/routes/categoriasRoutes.js', novo: false, mais: 2, menos: 1, itens: 'O4', texto: "Valida `?pagina=` e `?limite=`." },
  { grupo: 'Backend', arq: 'backend/src/validators/authValidator.js', novo: true, mais: 16, menos: 0, itens: 'F01', texto: "E-mail normalizado e senha de 8 a 128 caracteres." },
  { grupo: 'Backend', arq: 'backend/src/validators/paginacaoSchema.js', novo: true, mais: 7, menos: 0, itens: 'O4', texto: "Página e limite, com teto de 100." },
  { grupo: 'Backend', arq: 'backend/src/validators/categoriasValidator.js', novo: false, mais: 13, menos: 4, itens: 'O3', texto: "Limites de conteúdo e de faixa." },
  { grupo: 'Backend', arq: 'backend/src/db/db.js', novo: false, mais: 8, menos: 6, itens: 'F04, F13', texto: "Conecta com a role da API, a partir do `config`." },
  { grupo: 'Backend', arq: 'backend/src/db/init.sql', novo: false, mais: 60, menos: 2, itens: 'F01, F03, F04', texto: "Tabela `usuarios`, `usuario_id`, nome único por dono, role da API e permissões." },
  { grupo: 'Backend', arq: 'backend/src/db/migracao-001-dono-dos-dados.sql', novo: true, mais: 26, menos: 0, itens: 'F01', texto: "Passa os dados antigos para uma conta e torna `usuario_id` obrigatório." },
  { grupo: 'Backend', arq: 'backend/docker-compose.yml', novo: false, mais: 2, menos: 1, itens: 'F05', texto: "Postgres publicado só em `127.0.0.1:5434`." },
  { grupo: 'Testes', arq: 'backend/tests/seguranca.test.js', novo: true, mais: 131, menos: 0, itens: 'F01, O1, O2, O4, F16', texto: "401 sem token, tokens inválidos, erros genéricos, `X-Powered-By` e 429." },
  { grupo: 'Testes', arq: 'backend/tests/auth.test.js', novo: true, mais: 109, menos: 0, itens: 'F01', texto: "Hash, registro, login, 409 e o mesmo 401 nos dois casos." },
  { grupo: 'Testes', arq: 'backend/tests/config.test.js', novo: true, mais: 43, menos: 0, itens: 'F13', texto: "Boot recusado em 9 casos; mensagem sem o valor." },
  { grupo: 'Testes', arq: 'backend/tests/despesas.routes.test.js', novo: false, mais: 70, menos: 14, itens: 'F02, F07–F09, O4', texto: "Dono do token, 404 de outro dono, `usuario_id` do body ignorado e paginação." },
  { grupo: 'Testes', arq: 'backend/tests/categorias.routes.test.js', novo: false, mais: 61, menos: 31, itens: 'F03, F10–F12, O1', texto: "O mesmo para categorias, mais 409 e 500 genérico. `tipoCusto` em maiúsculas corrige 2 testes que já falhavam." },
  { grupo: 'Testes', arq: 'backend/tests/categorias.controller.test.js', novo: false, mais: 52, menos: 55, itens: 'F03, F10–F12, O1', texto: "Controller sem `try/catch`, com o dono nas queries." },
  { grupo: 'Testes', arq: 'backend/tests/categorias.validator.test.js', novo: false, mais: 37, menos: 0, itens: 'O3', texto: "Casos de limite do schema de categorias." },
  { grupo: 'Testes', arq: 'vitest.config.js', novo: true, mais: 15, menos: 0, itens: 'F13', texto: "Variáveis falsas para a suíte, porque o `config` valida também nos testes." },
  { grupo: 'Frontend', arq: 'frontend/src/services/api.js', novo: false, mais: 86, menos: 10, itens: 'F01, O4', texto: "Token na memória e no `localStorage`, Bearer em toda chamada, volta ao login no 401, busca paginada, `entrar` e `criarConta`." },
  { grupo: 'Frontend', arq: 'frontend/src/components/Login.jsx', novo: true, mais: 111, menos: 0, itens: 'F01', texto: "Tela de entrada e de criação de conta." },
  { grupo: 'Frontend', arq: 'frontend/src/App.jsx', novo: false, mais: 32, menos: 2, itens: 'F01', texto: "`App` alterna entre `Login` e `Painel`; ao sair, os dados da conta saem da tela." },
  { grupo: 'Frontend', arq: 'frontend/src/components/Header.jsx', novo: false, mais: 28, menos: 16, itens: 'F01', texto: "Botão Sair; as ações do painel só aparecem com sessão." },
  { grupo: 'Frontend', arq: 'frontend/src/App.css', novo: false, mais: 37, menos: 0, itens: 'F01', texto: "Estilos da tela de login, com as classes do design system." },
  { grupo: 'Frontend', arq: 'frontend/vite.config.js', novo: false, mais: 7, menos: 2, itens: 'F05, F01', texto: "Proxy de `/auth` e alvos em `127.0.0.1`." },
  { grupo: 'Configuração e docs', arq: '.env.example', novo: false, mais: 13, menos: 5, itens: 'F13, F04, F01', texto: "Variáveis novas, placeholders em `_aqui` e sem `DATABASE_URL`." },
  { grupo: 'Configuração e docs', arq: '.gitignore', novo: false, mais: 3, menos: 1, itens: 'F14', texto: "`.env.*` e `!.env.example`." },
  { grupo: 'Configuração e docs', arq: 'package.json', novo: false, mais: 1, menos: 0, itens: 'O4', texto: "`express-rate-limit` 8." },
  { grupo: 'Configuração e docs', arq: 'package-lock.json', novo: false, mais: 29, menos: 0, itens: 'O4', texto: "Lock do `express-rate-limit`." },
  { grupo: 'Configuração e docs', arq: 'README.md', novo: false, mais: 52, menos: 11, itens: '', texto: "Setup novo, autenticação, paginação, limites e variáveis." },
  { grupo: 'Configuração e docs', arq: 'CLAUDE.md', novo: false, mais: 14, menos: 10, itens: '', texto: "Layout, setup, convenções e estado atual." }
];

// Testes executados (seção 7).
export const evidencias = [
  { id: 'E1', titulo: "Suíte de testes", texto: "`npm test`: 9 arquivos, 198 testes, todos passam. Antes das mudanças, 2 testes de `categorias.routes.test.js` já falhavam, porque enviavam `tipoCusto` em minúsculas, que o schema recusa. Os testes reescritos usam maiúsculas." },
  { id: 'E2', titulo: "Lint e build do frontend", texto: "`oxlint` sem nenhum aviso. `vite build` passou depois de um `npm ci` no `frontend/`: o `node_modules` local era anterior ao commit `47714fe` e não tinha `@fontsource-variable/archivo`. O lockfile não mudou." },
  { id: 'E3', titulo: "Banco novo", texto: "Postgres 16 descartável em `127.0.0.1`, com segredos aleatórios. O `init.sql` rodou duas vezes seguidas sem erro. A role `din_din_app` tem `rolsuper`, `rolbypassrls`, `rolcreatedb` e `rolcreaterole` falsos, e as tabelas pertencem ao admin." },
  { id: 'E4', titulo: "API e banco reais, dois usuários (30 verificações)", texto: "Sem token: 401. Registro e login de Ana e Bruno. Bruno recebe 404 nas 6 operações por ID sobre registros de Ana, e eles continuam intactos. Bruno cria a categoria \"Lazer\" (201) mesmo com Ana tendo uma; Ana repetindo o nome recebe 409, sem nome de constraint. `usuario_id` no body é ignorado. Paginação funciona, e `limite=101` responde 400. JSON malformado: 400 em JSON, sem stack e sem `X-Powered-By`. O banco guarda o hash scrypt, não a senha. A 11ª requisição a `/auth` recebe 429." },
  { id: 'E5', titulo: "Privilégios da role da API", texto: "Conectado como `din_din_app`: `DROP TABLE`, `CREATE TABLE`, `ALTER TABLE`, `UPDATE usuarios`, `SELECT` em `pg_authid` e `COPY … TO PROGRAM` falham com `42501` (permissão negada)." },
  { id: 'E6', titulo: "Banco antigo e migração", texto: "Banco criado com o `init.sql` antigo e com dados. O `init.sql` novo rodou por cima sem erro: as linhas ficaram sem dono, e `categorias_nome_key` saiu. Antes da migração, a conta nova vê a lista vazia. A migração com um e-mail sem conta avisa e não muda nada. Com \" Carla@Exemplo.COM \", com espaços e maiúsculas: `UPDATE 2`, `UPDATE 1` e `COMMIT`. A conta passa a ver as despesas antigas e a categoria, e as duas colunas `usuario_id` ficam `NOT NULL`." },
  { id: 'E7', titulo: "Boot com o `.env.example` sem editar", texto: "A API sai com código 1 e lista `POSTGRES_USER`, `POSTGRES_PASSWORD`, `APP_DB_PASSWORD` e `JWT_SECRET`, sem mostrar nenhum valor." },
  { id: 'E8', titulo: "Interface no navegador (15 verificações)", texto: "Chrome headless, com o Vite em `localhost:5173` e a API de teste. Sem sessão, abre o login. Criar conta leva ao painel e guarda o token, e a despesa da conta aparece. Sair volta ao login, apaga o token e não deixa dado da conta na página. Senha errada mostra \"E-mail ou senha incorretos.\". A conta B não vê a despesa da conta A. Um token recusado volta ao login com \"Sua sessão expirou\"." },
  { id: 'E9', titulo: "Endereços de escuta", texto: "`netstat`: as APIs de teste em `127.0.0.1:3000` e `127.0.0.1:3099`, e o Postgres de teste em `127.0.0.1:5499`. Num compose de teste, a porta saiu publicada em `127.0.0.1:5498`; ao mudar o `.env`, `docker compose up -d` recriou o contêiner com as variáveis novas." },
  { id: 'E10', titulo: "Não executado", texto: "Acesso a partir de outra máquina da rede. O seu `postgres-dev` e o seu `.env` não foram tocados nem lidos: o contêiner continua em `0.0.0.0:5434` até a seção 8 ser aplicada. Os contêineres e as APIs de teste foram removidos no fim." }
];

// Seção 8.
export const passos = [
  { titulo: "Instale a dependência nova", texto: "Traz o `express-rate-limit`. Se o build do front reclamar de `@fontsource-variable/archivo`, o `node_modules` do front está desatualizado.", cmd: 'npm install\nnpm --prefix frontend ci' },
  { titulo: "Complete o `.env`", texto: "Adicione `APP_DB_USER` (diferente do `POSTGRES_USER`), `APP_DB_PASSWORD` (12+ caracteres) e `JWT_SECRET` (32+). Confira `POSTGRES_HOST=127.0.0.1` e apague `DATABASE_URL`. Para gerar o segredo:", cmd: `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` },
  { titulo: "Recrie o contêiner do banco", texto: "Ele volta em `127.0.0.1:5434`, com as variáveis novas. Os dados ficam no volume.", cmd: 'docker compose -f backend/docker-compose.yml up -d' },
  { titulo: "Aplique o schema e a role da API", texto: "Roda como o admin do contêiner. Pode repetir sem perder nada.", cmd: `docker exec -i postgres-dev sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < backend/src/db/init.sql` },
  { titulo: "Suba a API e o front e crie a sua conta", texto: "A tela de login abre sozinha; use \"Criar conta\".", cmd: 'npm run dev\nnpm run dev:frontend' },
  { titulo: "Só se já havia despesas: passe-as para a sua conta", texto: "Com o e-mail da conta criada no passo 5. Até lá, as despesas antigas não aparecem para ninguém.", cmd: `docker exec -i postgres-dev sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v email=voce@exemplo.com' < backend/src/db/migracao-001-dono-dos-dados.sql` },
  { titulo: "Confira", texto: "Os testes passam, a API escuta só em `127.0.0.1:3000` e o banco só em `127.0.0.1:5434`.", cmd: 'npm test\nnetstat -ano | findstr :3000\ndocker port postgres-dev' }
];

// Critérios de aceite das issues de issues-github.md, na mesma ordem: [estado, como foi verificado].
// O gerador para com erro se a quantidade não bater com a do arquivo.
export const aceite = {
  1: [
    ['feito', "`seguranca.test.js`: as 10 rotas de dados respondem 401 sem token; `GET /` continua público."],
    ['feito', "`seguranca.test.js`: token vencido, assinado com outro segredo, com `alg: none`, sem `sub` ou malformado."],
    ['feito', "Banco novo: `NOT NULL` e FK no `CREATE TABLE`. Banco antigo: a `migracao-001` aplica o `NOT NULL` (E6)."],
    ['feito', "Testes de rota: a query leva o dono do token. Ponta a ponta: Bruno não vê nada de Ana (E4)."],
    ['feito', "Testes de rota e ponta a ponta: o `usuario_id` do body é descartado."],
    ['parcial', "Verificado com Postgres real por um script desta sessão (E4), fora do repositório. O teste de integração versionado fica para o M1."],
    ['feito', "198 testes passam (E1)."]
  ],
  2: [
    ['feito', "`despesasController.js:39,61,76` e `categoriasController.js:26,53,65`."],
    ['feito', "Ponta a ponta (E4); os testes de rota cobrem o 404 para id de outro dono."],
    ['feito', "Ponta a ponta (E4)."],
    ['feito', "Ponta a ponta: a despesa e a categoria de Ana continuam iguais no banco (E4)."],
    ['feito', "198 testes passam (E1)."]
  ],
  3: [
    ['feito', "`netstat`: `127.0.0.1:3000`, sem `0.0.0.0` nem `[::]` (E9)."],
    ['local', "Num compose de teste, saiu `127.0.0.1`. O seu `postgres-dev` só muda depois do `docker compose up -d` (seção 8, passo 3)."],
    ['naoTestado', "Não havia outra máquina. Decorre do bind em `127.0.0.1`, confirmado pelo `netstat`."],
    ['feito', "A interface foi testada pelo proxy do Vite (E8)."]
  ],
  4: [
    ['feito', "`rolsuper` e `rolbypassrls` falsos (E3)."],
    ['feito', "Os dois falham com `42501` (E5)."],
    ['feito', "As tabelas pertencem ao admin do contêiner (E3)."],
    ['parcial', "A API rodou com a role nova em todos os testes ponta a ponta; os testes de integração versionados (M1) ainda não existem."]
  ],
  5: [
    ['feito', "Sai com código 1 e lista as variáveis com problema (E7)."],
    ['feito', "`config.test.js`: senha do admin ausente."],
    ['feito', "`config.test.js`: senha do admin curta e senha da API com 11 caracteres."],
    ['feito', "`git check-ignore` lista os dois pela regra `.env.*`."],
    ['feito', "Removida do `.env.example`; nenhum código a lia."]
  ],
  6: [
    ['feito', "O handler central responde só mensagens genéricas; o detalhe vai para o log."],
    ['feito', "`seguranca.test.js` e ponta a ponta (E4)."],
    ['feito', "`app.disable('x-powered-by')`; coberto em `seguranca.test.js`."],
    ['feito', "`seguranca.test.js`: os dois casos."]
  ],
  7: [
    ['fora', "Informativo (F15), fora do escopo pedido."],
    ['fora', "Informativo (F15), fora do escopo pedido."],
    ['fora', "Informativo (F15), fora do escopo pedido."]
  ],
  8: [
    ['feito', "`categorias.validator.test.js`: os três casos."],
    ['feito', "`categorias.validator.test.js`: `1e12` recusado pelo schema, antes do banco."],
    ['feito', "`limite` vai até 100; `limite=101` responde 400 (testes e E4)."],
    ['feito', "`categorias.validator.test.js` cobre os casos acima."]
  ]
};
