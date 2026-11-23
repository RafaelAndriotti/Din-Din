// Dados da auditoria de segurança do Din-Din (2026-11-23, branch main @ ace7aec).
// Fonte única do relatório: gerar-relatorio.mjs lê este arquivo e o issues-github.md.
// Convenção de texto: crase marca código (`assim`) e **duplo asterisco** marca negrito.
// Trechos de código são listas de linhas, copiadas do arquivo citado ("…" indica linhas omitidas).

export const meta = {
  titulo: 'Relatório de Auditoria de Segurança — Din-Din',
  projeto: 'Din-Din',
  subtitulo: 'Controle financeiro pessoal · API REST (Express + PostgreSQL) e SPA (React)',
  data: '23/11/2026',
  branch: 'main',
  commit: 'ace7aec',
  arquivosVersionados: 68,
  commitsHistorico: 42,
  refsHistorico: 7
};

export const stack = [
  ['Linguagem', 'JavaScript (ESM) em Node.js 24'],
  ['Backend', 'Express 5.3 · `pg` 8 (SQL puro, sem ORM) · Zod 4'],
  ['Banco', 'PostgreSQL 16 em Docker (`backend/docker-compose.yml`)'],
  ['Autenticação', 'Nenhuma (`jsonwebtoken` instalado, não usado)'],
  ['Frontend', 'React 19 + Vite 8 · oxlint · sem lib de sanitização'],
  ['Deploy e CI', 'Só o compose do Postgres. Sem Dockerfile, CI, Helm ou Terraform']
];

export const escopo = [
  "Branch `main` @ `ace7aec`, árvore limpa: os 68 arquivos versionados.",
  "Backend: `server.js`, `app.js`, rotas, controllers, validators, middleware, `db.js`, `init.sql` e os 6 testes.",
  "Frontend: 16 arquivos de `frontend/src`, `public/tema.js`, `index.html`, `vite.config.js` e o bundle `dist/` (build de 10/11/2026).",
  "Configuração e docs: `.env.example`, os `.gitignore`, `README.md`, `CLAUDE.md`, `.claude/` e o compose.",
  "Histórico git: 42 commits em 7 refs (`main` e 6 branches remotas).",
  "Runtime: sondas Supertest só de leitura, endereço de escuta e Firewall do Windows. Banco não consultado (Docker parado).",
  "Fora do escopo: CVEs de dependências (`npm audit`) e hospedagem, que ainda não existe."
];

export const severidades = {
  critica: { rotulo: 'Crítica', cor: '#B91C1C', criterio: "Falha estrutural: qualquer pessoa que alcance a API lê e altera todos os dados." },
  alta: { rotulo: 'Alta', cor: '#EA580C', criterio: "Exploração direta, sem pré-requisito, sobre dados financeiros (leitura ou escrita)." },
  media: { rotulo: 'Média', cor: '#D97706', criterio: "Exige condição adicional (outra falha, credencial, configuração) ou atinge dados pouco sensíveis." },
  baixa: { rotulo: 'Baixa', cor: '#2563EB', criterio: "Endurecimento: impacto pequeno ou indireto." },
  info: { rotulo: 'Informativa', cor: '#64748B', criterio: "Não explorável hoje: registra um limite ou um risco latente." }
};

export const COR_PONTO_FORTE = '#059669';

export const categorias = [
  {
    n: 1,
    nome: 'Banco sem tranca',
    sub: 'isolamento de dono ou inquilino',
    mapeamento: "Sem Supabase. Em Express + `pg` puro, a tranca seria autenticação + filtro `usuario_id` em toda query, ou RLS do Postgres. Conferidos: `init.sql` (dono, RLS, policies), as 10 queries, os middlewares e a role do Pool.",
    mecanismo: "**Mecanismo de isolamento detectado: nenhum.** Não há tabela de usuários, coluna de dono, middleware de autenticação nem `ENABLE ROW LEVEL SECURITY`/`CREATE POLICY`. O isolamento por dono está no roteiro do projeto (item A5 do `CLAUDE.md`) e ainda não foi implementado.",
    cobertura: "11 rotas, 10 queries em 2 controllers, `app.js`, `routes/index.js`, `init.sql`, `db.js` e `docker-compose.yml`. Endereço de escuta e firewall verificados em runtime."
  },
  {
    n: 2,
    nome: 'Permissão definida no navegador',
    sub: 'gate de papel só no frontend',
    mapeamento: "Busca de gates de papel no React (`isAdmin`, `role`, `canEdit`, `permission`) e cruzamento das ações da UI com as 11 rotas. Conferido se as regras do formulário são reimpostas pelo Zod.",
    mecanismo: "**Não se aplica no sentido estrito:** o frontend não tem papéis nem gates. As únicas ocorrências de `role=` são atributos ARIA. Não existe, portanto, UI que esconda ações por papel. O cruzamento das ações com as rotas encontrou o caso análogo abaixo: uma operação de configuração sem UI e aberta no servidor.",
    cobertura: "Os 16 arquivos JS/JSX de `frontend/src`, todas as chamadas de `services/api.js` e as rotas de despesas e categorias."
  },
  {
    n: 3,
    nome: 'IDOR',
    sub: 'objeto por ID sem checagem de posse',
    mapeamento: "Os 6 handlers com `:id` (GET, PUT e DELETE em despesas e categorias), todos lidos: o WHERE inclui o dono? Os IDs são enumeráveis?",
    mecanismo: "**Os 6 handlers por ID filtram só por `id`.** Os IDs são `SERIAL` (`init.sql:2` e `init.sql:12`), sequenciais a partir de 1: enumerar é um laço. O `idParamsSchema` garante o formato do número, não a posse. Como não existe dono, hoje cada registro pertence a qualquer um. A correção entra junto com a autenticação, mas cada query precisa dela.",
    cobertura: "100% dos handlers por ID: 3 em `despesasController.js` e 3 em `categoriasController.js`, com as rotas correspondentes."
  },
  {
    n: 4,
    nome: 'Chaves expostas',
    sub: 'segredos e credenciais no código',
    mapeamento: "Árvore (68 arquivos) e histórico (42 commits, 7 refs) varridos com regex de segredos; `.env.example`, README, `CLAUDE.md`, compose, `.claude/` e bundle `dist/`. `.env` local comparado ao exemplo sem expor valores.",
    mecanismo: "**Nenhum segredo real versionado:** nem na árvore, nem no histórico, nem no bundle. Os dois achados são de configuração: placeholders públicos aceitos sem validação e `.gitignore` da raiz incompleto.",
    cobertura: "Padrões buscados: senhas, `DATABASE_URL` e URLs `postgres://`, chaves AWS (`AKIA…`), GitHub (`ghp_`, `github_pat_`), `sk-…`, Slack (`xox…`), JWT (`eyJ…`), `PRIVATE KEY` e variáveis `VITE_`."
  },
  {
    n: 5,
    nome: 'Inputs sem tratamento (XSS)',
    sub: 'injeção de HTML ou JS no navegador',
    mapeamento: "React 19: busca de `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function` e `href`/`src`/`style` dinâmicos. Backend só JSON; página de erro do Express testada com payload HTML; CSP do build; lib de sanitização.",
    mecanismo: "**Nenhuma XSS explorável.** Todo dado do usuário sai como texto JSX, escapado pelo React. O backend só responde JSON e uma string fixa em `GET /`. Não há templates, e-mails nem markdown. Não há lib de sanitização (DOMPurify ausente), e hoje ela não faz falta, porque nenhum ponto renderiza HTML.",
    cobertura: "16 arquivos de `frontend/src`, `public/tema.js`, `index.html`, `vite.config.js` e `dist/`. Teste em runtime da página de erro e oxlint com regras anti-XSS."
  }
];

// sev: critica | alta | media | baixa | info. issue: número da issue em issues-github.md.
export const achados = [
  // ---------- 1. Banco sem tranca ----------
  {
    id: 'F01', cat: 1, sev: 'critica', issue: 1,
    titulo: "API sem autenticação e dados sem dono: não existe mecanismo de isolamento",
    descricao: "Entre `express.json()` e os routers não há middleware de autenticação. As tabelas não têm coluna de dono e não há RLS. Quem alcança a porta 3000 tem os poderes do dono: lista, cria, altera e apaga despesas e categorias. O `jsonwebtoken` está nas dependências, mas nenhum arquivo o importa.",
    exploracao: "Verificado com Supertest: `GET /despesas`, `GET /despesas/1` e `GET /categorias` sem nenhum cabeçalho chegaram até a camada de banco. A resposta foi 500 só porque o Postgres estava desligado; com o banco no ar, é 200 com os dados. Nenhum caminho do código responde 401.",
    condicao: "Alcance de rede. `server.js:6` escuta em `::` (todas as interfaces). Nesta máquina o Firewall do Windows bloqueia a entrada (não há regra para node.exe nem para a porta 3000). É uma proteção externa ao projeto: some com um “Permitir” no aviso do Windows, em outra máquina ou num deploy.",
    refs: [
      { arq: 'backend/src/app.js', lin: '5-7', trecho: ['app.use(express.json())', '', 'routes(app)'], nota: "nenhum middleware de auth antes das rotas" },
      { arq: 'backend/src/routes/index.js', lin: '6-7', trecho: ['app.use(despesasRoutes);', 'app.use(categoriasRoutes);'] },
      { arq: 'backend/src/db/init.sql', lin: '1-9', nota: "tabela `despesas` sem coluna de dono" },
      { arq: 'backend/src/db/init.sql', lin: '11-20', nota: "tabela `categorias` sem coluna de dono" },
      { arq: 'frontend/src/services/api.js', lin: '38-41', nota: "`fetch` sem `Authorization` nem credenciais" },
      { arq: 'package.json', lin: '21', trecho: ['"jsonwebtoken": "^9.0.3",'], nota: "instalado, nunca importado" }
    ]
  },
  {
    id: 'F02', cat: 1, sev: 'alta', issue: 1,
    titulo: "`GET /despesas` devolve todas as despesas, sem filtro de dono e sem limite",
    descricao: "A listagem não tem `WHERE` nem `LIMIT`. Uma requisição entrega o histórico financeiro completo: descrição, valor, categoria, forma de pagamento, parcelas e status. Com mais de um usuário, cada um veria as despesas de todos.",
    exploracao: "`curl http://<host>:3000/despesas`.",
    condicao: "A mesma de F01.",
    refs: [
      { arq: 'backend/src/controllers/despesasController.js', lin: '12-14', trecho: ['const { rows } = await pool.query(', '    `SELECT ${COLUNAS} FROM despesas`', ');'] },
      { arq: 'backend/src/routes/despesasRoutes.js', lin: '9', trecho: ["routes.get('/despesas', DespesasController.listarDespesas);"] }
    ]
  },
  {
    id: 'F03', cat: 1, sev: 'media', issue: 1,
    titulo: "`GET /categorias` devolve todas as categorias, sem filtro de dono",
    descricao: "Mesmo padrão de F02, com dados menos sensíveis: nome, cor, ícone, limite mensal e tipo de custo. Ao introduzir o dono, o `UNIQUE` global em `nome` precisa virar `UNIQUE (usuario_id, nome)`. Do contrário, a categoria de um usuário bloqueia o nome para os outros, e o erro de duplicidade revela que ele existe.",
    exploracao: "`curl http://<host>:3000/categorias`.",
    condicao: "A mesma de F01.",
    refs: [
      { arq: 'backend/src/controllers/categoriasController.js', lin: '10', trecho: ['const { rows } = await pool.query(`SELECT ${COLUNAS} FROM categorias`);'] },
      { arq: 'backend/src/routes/categoriasRoutes.js', lin: '10', nota: "rota sem autenticação" },
      { arq: 'backend/src/db/init.sql', lin: '13', trecho: ['nome           VARCHAR(50) NOT NULL UNIQUE,'], nota: "unicidade global, não por dono" }
    ]
  },
  {
    id: 'F04', cat: 1, sev: 'media', issue: 4,
    titulo: "A API conecta ao Postgres com o superusuário criado pela imagem",
    descricao: "O `POSTGRES_USER` do `.env` serve a dois fins: a imagem oficial `postgres:16` cria esse usuário como SUPERUSER na primeira subida, e o Pool da API conecta com ele. A aplicação roda com poder total sobre o servidor de banco.",
    exploracao: "Superusuário ignora RLS, que então não serve como tranca. Também pode `DROP` e `ALTER`, ler outros bancos do cluster e executar comandos no contêiner com `COPY … TO PROGRAM`. A exploração exige outra falha (injeção, hoje inexistente) ou a credencial.",
    condicao: "Não verificado em runtime: o Docker estava parado. Para confirmar: `SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user;`.",
    refs: [
      { arq: 'backend/docker-compose.yml', lin: '6-7', trecho: ['env_file:', '  - ../.env'], nota: "o mesmo usuário inicializa o contêiner" },
      { arq: 'backend/src/db/db.js', lin: '8-9', trecho: ['user: process.env.POSTGRES_USER,', 'password: process.env.POSTGRES_PASSWORD,'], nota: "e conecta a API" }
    ]
  },
  {
    id: 'F05', cat: 1, sev: 'media', issue: 3,
    titulo: "API e Postgres escutam em todas as interfaces de rede",
    descricao: "`app.listen(PORT)` sem host abre a API em `::` (IPv4 e IPv6), e o compose publica o Postgres em `0.0.0.0:5434`. Para a API, isso transforma F01 numa falha de rede local. Para o banco, expõe o login do superusuário (F04): a imagem aceita conexões remotas com senha (`host all all all scram-sha-256`).",
    exploracao: "Verificado: `app.listen` sem host devolve `{\"address\":\"::\",\"family\":\"IPv6\"}`.",
    condicao: "Firewall do host. Nesta máquina não há regra de entrada para node.exe, Docker ou as portas 3000 e 5434, e a senha local é forte. Com a senha placeholder (F13), o banco fica aberto a quem alcançar a porta.",
    refs: [
      { arq: 'backend/server.js', lin: '6', trecho: ['app.listen(PORT, () => {'], nota: "sem host: escuta em `::`" },
      { arq: 'backend/docker-compose.yml', lin: '8-9', trecho: ['ports:', '  - "5434:5432"'], nota: "sem IP: publica em 0.0.0.0" }
    ]
  },

  // ---------- 2. Permissão definida no navegador ----------
  {
    id: 'F06', cat: 2, sev: 'media', issue: 1,
    titulo: "Escritas em `/categorias`: sem UI no frontend, abertas no servidor",
    descricao: "A gestão de categorias não aparece na interface (o front só faz `GET /categorias`), mas `POST`, `PUT` e `DELETE /categorias` respondem a qualquer cliente. Omitir o botão não é controle de acesso.",
    exploracao: "`PUT /categorias/1` com `{\"nome\":\"x\",\"descricao\":\"x\",\"limiteMensal\":0,\"ativo\":false}` desativa a categoria, que some da tela, porque o front filtra as inativas (`api.js:114`).",
    condicao: "A mesma de F01.",
    refs: [
      { arq: 'backend/src/routes/categoriasRoutes.js', lin: '12-14', trecho: [
        "routes.post('/categorias', validate({ body: categoriaSchema }), …);",
        "routes.put('/categorias/:id', validate({ params: idParamsSchema, body: categoriaSchema }), …);",
        "routes.delete('/categorias/:id', validate({ params: idParamsSchema }), …);"
      ] },
      { arq: 'frontend/src/services/api.js', lin: '111-118', nota: "a única chamada de categorias é o GET" }
    ]
  },

  // ---------- 3. IDOR ----------
  {
    id: 'F07', cat: 3, sev: 'alta', issue: 2,
    titulo: "IDOR: `PUT /despesas/:id` altera qualquer despesa",
    descricao: "O `UPDATE` filtra só por `id`. Com IDs sequenciais, qualquer cliente reescreve valor, descrição, forma de pagamento e status de qualquer lançamento, por exemplo marcando contas pendentes como pagas.",
    exploracao: "`PUT /despesas/1`, `/2`, `/3`… com um corpo válido.",
    refs: [
      { arq: 'backend/src/routes/despesasRoutes.js', lin: '12', nota: "rota" },
      { arq: 'backend/src/controllers/despesasController.js', lin: '62-73', trecho: [
        'const { rows } = await pool.query(',
        '    `UPDATE despesas',
        '        SET descricao=$1,',
        '        …',
        '    WHERE id=$7',
        '    RETURNING ${COLUNAS}`,',
        '    [descricao, valor, categoria, metodoPagamento, parcelas, status, id]',
        ');'
      ] }
    ]
  },
  {
    id: 'F08', cat: 3, sev: 'alta', issue: 2,
    titulo: "IDOR: `DELETE /despesas/:id` apaga qualquer despesa",
    descricao: "O `DELETE` filtra só por `id` e é físico (não há soft delete). Um laço de 1 a N apaga o histórico inteiro.",
    exploracao: "`DELETE /despesas/1`, `/2`, `/3`…",
    refs: [
      { arq: 'backend/src/routes/despesasRoutes.js', lin: '13', nota: "rota" },
      { arq: 'backend/src/controllers/despesasController.js', lin: '89-92', trecho: ['const { rowCount } = await pool.query(', '    `DELETE FROM despesas WHERE id=$1`,', '    [id]', ')'] }
    ]
  },
  {
    id: 'F09', cat: 3, sev: 'media', issue: 2,
    titulo: "IDOR: `GET /despesas/:id` lê qualquer despesa",
    descricao: "O mesmo defeito, em leitura. O impacto incremental é pequeno hoje, porque F02 já entrega tudo. Mas a diferença entre 200 e 404 revela quais IDs existem, e a correção é a mesma.",
    refs: [
      { arq: 'backend/src/routes/despesasRoutes.js', lin: '11', nota: "rota" },
      { arq: 'backend/src/controllers/despesasController.js', lin: '42-45', trecho: ['const { rows } = await pool.query(', '    `SELECT ${COLUNAS} FROM despesas WHERE id = $1`,', '    [req.validacao.params.id]', ');'] }
    ]
  },
  {
    id: 'F10', cat: 3, sev: 'media', issue: 2,
    titulo: "IDOR: `PUT /categorias/:id` altera qualquer categoria",
    descricao: "O `UPDATE` filtra só por `id`: qualquer cliente renomeia, desativa ou muda o limite mensal de qualquer categoria.",
    refs: [
      { arq: 'backend/src/routes/categoriasRoutes.js', lin: '13', nota: "rota" },
      { arq: 'backend/src/controllers/categoriasController.js', lin: '50-54', trecho: ['`UPDATE categorias', 'SET nome = $1, ativo = $2, descricao = $3, cor = $4, …', 'WHERE id = $8', 'RETURNING ${COLUNAS}`,[nome, ativo, descricao, cor, limiteMensal, tipoCusto, icone, id]'] }
    ]
  },
  {
    id: 'F11', cat: 3, sev: 'media', issue: 2,
    titulo: "IDOR: `DELETE /categorias/:id` apaga qualquer categoria",
    descricao: "O `DELETE` filtra só por `id`. As despesas guardam a categoria como texto, sem FK, então não há cascata, mas a cor e o limite configurados se perdem.",
    refs: [
      { arq: 'backend/src/routes/categoriasRoutes.js', lin: '14', nota: "rota" },
      { arq: 'backend/src/controllers/categoriasController.js', lin: '70', trecho: ['const { rowCount } = await pool.query(`DELETE FROM categorias WHERE id = $1`, [id])'] }
    ]
  },
  {
    id: 'F12', cat: 3, sev: 'baixa', issue: 2,
    titulo: "IDOR: `GET /categorias/:id` lê qualquer categoria",
    descricao: "Leitura de dados pouco sensíveis, já expostos por F03. Corrigir junto com as demais.",
    refs: [
      { arq: 'backend/src/routes/categoriasRoutes.js', lin: '11', nota: "rota" },
      { arq: 'backend/src/controllers/categoriasController.js', lin: '20', trecho: ['const { rows } = await pool.query(`SELECT ${COLUNAS} FROM categorias WHERE id = $1`, [req.validacao.params.id]);'] }
    ]
  },

  // ---------- 4. Chaves expostas ----------
  {
    id: 'F13', cat: 4, sev: 'media', issue: 5,
    titulo: "Credenciais placeholder públicas aceitas sem validação no boot",
    descricao: "O setup manda copiar o `.env.example` (`README.md:156`, `CLAUDE.md:28`). Sem edição, o banco nasce com `seu_usuario_aqui` / `sua_senha_aqui`, uma credencial publicada no repositório, e esse usuário é superusuário (F04) na porta 5434 (F05). Nada no boot rejeita os placeholders ou a falta das variáveis: sem `POSTGRES_PASSWORD`, a API sobe e só falha na primeira query. `DATABASE_URL` repete a credencial e não é lida por nenhum código.",
    exploracao: "`psql -h <host> -p 5434 -U seu_usuario_aqui` com a senha do exemplo, em qualquer clone que siga o README sem editar o `.env`.",
    condicao: "Não ocorre nesta máquina: o `.env` local difere do exemplo em usuário e senha, e a senha é forte (verificado sem exibir o valor).",
    refs: [
      { arq: '.env.example', lin: '7-8', trecho: ['POSTGRES_USER=seu_usuario_aqui', 'POSTGRES_PASSWORD=sua_senha_aqui'] },
      { arq: '.env.example', lin: '14', trecho: ['DATABASE_URL=postgresql://seu_usuario_aqui:sua_senha_aqui@localhost:5434/din_din_db'], nota: "duplicada e não usada" },
      { arq: 'backend/src/db/db.js', lin: '8-9', nota: "lê `process.env` sem validar" },
      { arq: 'backend/server.js', lin: '1-8', nota: "sobe sem checar a configuração" },
      { arq: 'README.md', lin: '156', nota: "`cp .env.example .env`" }
    ]
  },
  {
    id: 'F14', cat: 4, sev: 'baixa', issue: 5,
    titulo: "`.gitignore` da raiz não cobre variações de `.env`",
    descricao: "Só `.env` é ignorado. Um `.env.local`, `.env.production` ou `.env.test` criado na raiz entra no próximo `git add .`. O `frontend/.gitignore` já tem a regra certa.",
    refs: [
      { arq: '.gitignore', lin: '3', trecho: ['.env'] },
      { arq: 'frontend/.gitignore', lin: '16-18', trecho: ['.env', '.env.*', '!.env.example'], nota: "contraste: a regra correta" }
    ]
  },

  // ---------- 5. Inputs sem tratamento (XSS) ----------
  {
    id: 'F15', cat: 5, sev: 'info', issue: 7,
    titulo: "A API guarda HTML bruto; a proteção depende só do escape na saída",
    descricao: "`<img src=x onerror=alert(1)>` em `descricao`, `categoria` ou `nome` é aceito e salvo como está. Hoje é inofensivo: todas as saídas verificadas são texto JSX, escapado pelo React. Escapar na saída é o desenho correto, mas nada impede uma regressão: um `dangerouslySetInnerHTML`, um relatório HTML ou um e-mail com esses campos viraria XSS armazenado.",
    condicao: "Só se um novo consumidor renderizar esses campos como HTML sem escape.",
    refs: [
      { arq: 'backend/src/validators/despesasValidator.js', lin: '4-11', nota: "só trim e tamanho" },
      { arq: 'backend/src/validators/categoriasValidator.js', lin: '6-10', nota: "sem restrição de conteúdo" },
      { arq: 'frontend/src/components/ExpenseList.jsx', lin: '143,152,162,168,176,193,198', nota: "saídas em texto JSX" },
      { arq: 'frontend/src/components/ExpenseDetailsModal.jsx', lin: '27,44,48', nota: "saídas em texto JSX" },
      { arq: 'frontend/src/components/FaltaPagar.jsx', lin: '74,78,85', nota: "saídas em texto JSX" },
      { arq: 'frontend/src/components/ExpenseFilters.jsx', lin: '75,101-102', nota: "saídas em texto JSX" },
      { arq: 'frontend/src/components/Toast.jsx', lin: '47', nota: "mensagens com a descrição" },
      { arq: 'frontend/src/components/ExpenseModal.jsx', lin: '287,404', nota: "método antigo vindo da API" }
    ]
  },
  {
    id: 'F16', cat: 5, sev: 'info', issue: 6,
    titulo: "CSP só por `<meta>` e só no build; sem cabeçalhos de segurança",
    descricao: "A CSP do build é restritiva, mas `<meta>` não aceita `frame-ancestors` (clickjacking), e não há `X-Content-Type-Options` nem HSTS, porque o repositório não define o servidor que vai publicar o front. A API não envia cabeçalhos de segurança e expõe `X-Powered-By: Express` (verificado).",
    condicao: "Relevante quando o front for publicado.",
    refs: [
      { arq: 'frontend/vite.config.js', lin: '7-8', trecho: ['// frame-ancestors, HSTS e X-Content-Type-Options não funcionam em <meta>:', '// precisam vir como cabeçalho HTTP do servidor que hospedar o site.'] },
      { arq: 'backend/src/app.js', lin: '4-7', nota: "sem helmet nem `x-powered-by` desligado" }
    ]
  }
];

// Fora das cinco categorias: verificadas e acionáveis, mas fora da contagem dos gráficos.
export const observacoes = [
  {
    id: 'O1', sev: 'baixa', issue: 6,
    titulo: "Respostas 500 devolvem `error.message` do banco",
    descricao: "Os 10 `catch` dos controllers devolvem `erro: error.message`: o texto cru do Postgres (nome de constraint, `numeric field overflow`) e dos erros de conexão. Facilita o reconhecimento do sistema.",
    refs: [
      { arq: 'backend/src/controllers/despesasController.js', lin: '19,36,54,82,100', trecho: ['return res.status(500).json({ message: "Erro ao buscar despesas", erro: error.message });'] },
      { arq: 'backend/src/controllers/categoriasController.js', lin: '14,28,40,62,78', nota: "mesmo padrão" }
    ]
  },
  {
    id: 'O2', sev: 'baixa', issue: 6,
    titulo: "JSON malformado devolve página HTML com stack trace",
    descricao: "Sem handler de erro, a falha do body-parser cai no handler padrão do Express. Como nenhum script define `NODE_ENV`, ele roda em modo development e devolve HTML com a stack e caminhos absolutos do disco. A entrada ecoada sai escapada (não há XSS).",
    refs: [
      { arq: 'backend/src/app.js', lin: '5', trecho: ['app.use(express.json())'], nota: "sem handler de erro depois das rotas" },
      { arq: 'package.json', lin: '6-12', nota: "nenhum script define `NODE_ENV`" }
    ]
  },
  {
    id: 'O3', sev: 'baixa', issue: 8,
    titulo: "Schema de categorias sem limites de conteúdo e de faixa",
    descricao: "`nome` aceita string vazia (sem `.trim().min(1)`), `descricao` não tem `.max()`, `limiteMensal` aceita negativo e, acima de 99.999.999,99, estoura `NUMERIC(10,2)` e vira 500. `icone` aceita qualquer texto.",
    refs: [
      { arq: 'backend/src/validators/categoriasValidator.js', lin: '6-7,10,14,17-19', trecho: ['nome: z.string()', '       .max(50),', '…', 'descricao: z.string(),', '…', 'limiteMensal: z.number(),'] },
      { arq: 'backend/src/db/init.sql', lin: '17', nota: "`limite_mensal NUMERIC(10, 2) NOT NULL`" }
    ]
  },
  {
    id: 'O4', sev: 'baixa', issue: 8,
    titulo: "Listagens sem paginação e sem rate limit",
    descricao: "As duas listagens fazem `SELECT` sem `LIMIT`, e não há lib de rate limit: o custo de cada resposta cresce com a tabela (OWASP API4, consumo irrestrito de recursos).",
    refs: [
      { arq: 'backend/src/controllers/despesasController.js', lin: '12-14', nota: "sem `LIMIT`" },
      { arq: 'backend/src/controllers/categoriasController.js', lin: '10', nota: "sem `LIMIT`" },
      { arq: 'package.json', lin: '18-25', nota: "nenhuma lib de rate limit" }
    ]
  }
];

export const pontosFortes = [
  { id: 'S01', cat: 1, titulo: "SQL 100% parametrizado", texto: "As 10 queries usam `$1…$n`. A única interpolação é a constante `COLUNAS`, sem dado do usuário. Não há caminho de SQL injection para contornar o banco.", refs: ['backend/src/controllers/despesasController.js:6', 'backend/src/controllers/categoriasController.js:4'] },
  { id: 'S02', cat: 1, titulo: "Dev server do Vite só em localhost", texto: "Sem `server.host` no `vite.config.js`, o Vite escuta só em `localhost`, e o proxy para a API também é local.", refs: ['frontend/vite.config.js:36-48'] },
  { id: 'S03', cat: 2, titulo: "Regras do formulário reimpostas no servidor", texto: "Os limites do front (`LIMITES`) espelham o Zod do backend: o servidor não confia no navegador. Valor, tamanho dos textos, método e parcelas são validados nas duas pontas.", refs: ['frontend/src/utils/despesas.js:14', 'backend/src/validators/despesasValidator.js:4-30'] },
  { id: 'S04', cat: 2, titulo: "Sem mass assignment", texto: "Os controllers leem só `req.validacao`, a saída do Zod, e `z.object` descarta chaves extras (`id`, `admin`, um futuro `usuario_id`). Nenhum controller usa `req.body`.", refs: ['backend/src/middleware/validate.js:5-7'] },
  { id: 'S05', cat: 3, titulo: "`:id` validado nas 6 rotas por ID", texto: "`idParamsSchema` só aceita dígitos e um inteiro entre 1 e 2.147.483.647, antes de tocar no banco. Há testes para `abc`, `0`, `-1`, `1.5` e `99999999999`. Garante o formato, não a posse.", refs: ['backend/src/validators/idSchema.js:3-12', 'backend/src/routes/despesasRoutes.js:11-13', 'backend/src/routes/categoriasRoutes.js:11,13,14'] },
  { id: 'S06', cat: 4, titulo: "Nenhum segredo versionado", texto: "Árvore e histórico (42 commits, 7 refs) limpos. O `.env` nunca foi commitado, e o `.env.example` só tem placeholders.", refs: ['.gitignore:3'] },
  { id: 'S07', cat: 4, titulo: "Credenciais só por variáveis de ambiente", texto: "O Pool lê tudo de `process.env`, e o compose usa `env_file`. Não há senha inline em nenhuma versão desses arquivos no histórico.", refs: ['backend/src/db/db.js:5-11', 'backend/docker-compose.yml:6-7'] },
  { id: 'S08', cat: 4, titulo: "Bundle de produção sem segredos", texto: "Sem variáveis `VITE_` nem credenciais. `import.meta.env.DEV` é eliminado no build, então o fallback de dados de exemplo não vai para produção. `sourcemap: false`, e o `frontend/.gitignore` cobre `.env.*`.", refs: ['frontend/src/services/api.js:87', 'frontend/vite.config.js:34', 'frontend/.gitignore:15-18'] },
  { id: 'S09', cat: 4, titulo: "`.env` local com senha forte", texto: "Usuário e senha diferem do exemplo, e a senha é forte. Verificado sem exibir o valor.", refs: ['.env (não versionado)'] },
  { id: 'S10', cat: 5, titulo: "Zero sinks perigosos no frontend", texto: "Nenhum `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function` ou `href`/`src` dinâmico. O oxlint com `react/no-danger`, `react/no-danger-with-children`, `react/jsx-no-script-url`, `no-eval` e `no-new-func` passa sem erro.", refs: ['frontend/src (16 arquivos)', 'frontend/public/tema.js'] },
  { id: 'S11', cat: 5, titulo: "Cor validada antes do `style` inline", texto: "`corSegura` só aceita hexadecimal, e o backend também valida com regex: um `url(...)` não chega ao CSS.", refs: ['frontend/src/utils/despesas.js:49-53', 'backend/src/validators/categoriasValidator.js:3,11-13', 'frontend/src/components/ExpenseList.jsx:22', 'frontend/src/components/ChipGroup.jsx:74'] },
  { id: 'S12', cat: 5, titulo: "`localStorage` tratado como não confiável", texto: "O tema e o último método de pagamento passam por lista branca antes do uso.", refs: ['frontend/public/tema.js:6-10', 'frontend/src/hooks/useTema.js:8-15', 'frontend/src/components/ExpenseModal.jsx:35-42'] },
  { id: 'S13', cat: 5, titulo: "CSP restritiva no build", texto: "`script-src 'self'`, `object-src 'none'`, `base-uri 'self'` e `form-action 'self'`, presentes no `dist/index.html`. O script de tema é externo para não exigir `'unsafe-inline'`.", refs: ['frontend/vite.config.js:9-19', 'frontend/index.html:9-10'] },
  { id: 'S14', cat: 5, titulo: "Página de erro do Express escapa a entrada", texto: "Teste com `<img src=x onerror=alert(1)>` em JSON malformado: a resposta trouxe `&lt;img src=x`. Não há XSS refletido.", refs: ['teste em runtime (seção 7)'] }
];

export const pontosFracos = [
  "**Não há autenticação nem dono dos dados.** É a causa raiz comum das categorias 1, 2 e 3: 10 dos 16 achados (F01–F03, F06–F12) se resolvem com ela.",
  "**A única barreira hoje é a rede, e ela é externa ao projeto.** API e Postgres escutam em todas as interfaces. Nesta máquina, quem bloqueia o acesso de fora é o Firewall do Windows.",
  "**IDs sequenciais sem checagem de posse.** Ler, alterar ou apagar tudo é um laço de 1 a N.",
  "**Sem defesa em profundidade no banco.** A API usa o superusuário, que ignoraria RLS mesmo que ela existisse.",
  "**A configuração confia em quem instala.** Placeholders públicos são aceitos e nada é validado no boot."
];

export const condicoes = [
  "**Alcance de rede:** a API escuta em `::` na porta 3000 e o Postgres em `0.0.0.0:5434`. Nesta máquina, o Firewall do Windows bloqueia a entrada (nenhuma regra para node.exe, Docker ou essas portas): hoje, explorar exige estar na própria máquina. Um “Permitir” no aviso do Windows, outra máquina ou um deploy abrem o acesso.",
  "**Credenciais do banco:** a senha local é forte. Com os placeholders do `.env.example`, o banco fica aberto a quem alcançar a porta.",
  "**Flags e modos:** nenhuma rota depende de feature flag. O fallback com dados de exemplo do front só existe em `npm run dev`.",
  "**A severidade mede o risco do código.** As condições acima valem para esta máquina e mudam sem nenhuma alteração no repositório."
];

export const recomendacoes = [
  {
    p: 'P1', titulo: "Contenção imediata: tirar API e banco da rede", quando: "agora, minutos", resolve: ['F05', 'reduz F01–F12'],
    itens: [
      "`app.listen(PORT, '127.0.0.1', …)` em `backend/server.js:6`.",
      "`\"127.0.0.1:5434:5432\"` em `backend/docker-compose.yml:9`.",
      "Enquanto não houver autenticação, só a própria máquina alcança a API e o banco."
    ]
  },
  {
    p: 'P2', titulo: "Autenticação e dono dos dados (roteiro A5)", quando: "próxima etapa", resolve: ['F01', 'F02', 'F03', 'F06'],
    itens: [
      "Tabela `usuarios` (email único, hash argon2id ou bcrypt), criada por migration (A4).",
      "`POST /auth/registro` e `POST /auth/login` com JWT de vida curta; segredo de 32+ bytes no `.env`, validado no boot.",
      "Middleware `autenticar` em `routes/index.js`, antes dos routers: sem token válido, 401.",
      "`usuario_id NOT NULL` com FK em `despesas` e `categorias`; `UNIQUE (usuario_id, nome)`."
    ]
  },
  {
    p: 'P3', titulo: "Posse em toda query e testes de autorização", quando: "junto com P2", resolve: ['F07', 'F08', 'F09', 'F10', 'F11', 'F12'],
    itens: [
      "`WHERE id = $1 AND usuario_id = $2` nos 6 handlers por ID; listagens com `WHERE usuario_id = $1`.",
      "`INSERT` com o `usuario_id` do token, nunca do body.",
      "Registro de outro usuário responde 404, igual a inexistente.",
      "Testes de integração com dois usuários (M1): B não lê, não altera e não apaga nada de A."
    ]
  },
  {
    p: 'P4', titulo: "Menor privilégio no banco", quando: "junto com as migrations (A4)", resolve: ['F04'],
    itens: [
      "Role `din_din_app` com `NOSUPERUSER NOBYPASSRLS` e só `SELECT, INSERT, UPDATE, DELETE` nas tabelas.",
      "Migrations com outra role, dona das tabelas.",
      "Opcional: RLS com `FORCE ROW LEVEL SECURITY` e policy por `usuario_id`, como segunda tranca."
    ]
  },
  {
    p: 'P5', titulo: "Configuração validada no boot", quando: "curto prazo", resolve: ['F13', 'F14'],
    itens: [
      "Schema Zod para `process.env`: falha se faltar variável, se for placeholder ou se a senha tiver menos de 12 caracteres.",
      "Uma forma só de configurar o banco: remover `DATABASE_URL` do `.env.example` ou passar a usá-la.",
      "`.gitignore` da raiz com `.env.*` e `!.env.example`."
    ]
  },
  {
    p: 'P6', titulo: "Respostas de erro e cabeçalhos (A1/M2)", quando: "curto prazo", resolve: ['F16', 'O1', 'O2'],
    itens: [
      "Handler de erro central: 400 JSON para `entity.parse.failed`, 500 genérico sem `error.message`, log só no servidor.",
      "`NODE_ENV=production` no `npm start`; `helmet()` (remove `X-Powered-By`).",
      "No servidor que publicar o build: CSP por cabeçalho com `frame-ancestors 'none'`, `nosniff` e HSTS."
    ]
  },
  {
    p: 'P7', titulo: "Travas de entrada e de regressão de XSS", quando: "contínuo", resolve: ['F15', 'O3', 'O4'],
    itens: [
      "oxlint com `react/no-danger`, `react/no-danger-with-children`, `react/jsx-no-script-url`, `no-eval` e `no-new-func` como erro.",
      "Completar o `categoriaSchema`: `trim`, `min`, `max` e faixa de `limiteMensal`.",
      "Paginação nas listagens (M3) e `express-rate-limit` (CRI-10)."
    ]
  }
];

export const evidencias = [
  { id: 'E1', titulo: "Rotas sem autenticação (Supertest, só GET)", texto: "`GET /despesas`, `GET /despesas/1` e `GET /categorias` sem cabeçalhos: 500 vindo do controller (Postgres parado, `ECONNREFUSED`). Nenhum 401. Cabeçalho `X-Powered-By: Express` presente." },
  { id: 'E2', titulo: "Endereço de escuta", texto: "`app.listen(0)` sem host, como no `server.js`: `{\"address\":\"::\",\"family\":\"IPv6\"}`, todas as interfaces." },
  { id: 'E3', titulo: "Página de erro com payload HTML", texto: "`POST /despesas` com corpo `<img src=x onerror=alert(1)>`: 400 `text/html`, conteúdo escapado (`&lt;img src=x`), stack com caminhos absolutos de `node_modules`." },
  { id: 'E4', titulo: "Firewall do Windows", texto: "Perfis Domain, Private e Public ativos; ação de entrada padrão não configurada (padrão do Windows: bloquear). Nenhuma regra para node.exe, Docker ou as portas 3000, 5434 e 5173." },
  { id: 'E5', titulo: "Histórico git", texto: "42 commits em 7 refs. `git log --all -p` com regex de segredos: só os placeholders do `.env.example` e do README. O `.env` nunca foi adicionado. Versões antigas de `docker-compose.yml` e `src/db/db.js` sempre usaram variáveis." },
  { id: 'E6', titulo: "Bundle de produção", texto: "`dist/assets/index-NAci9g8m.js` (265 KB): sem `VITE_`, URLs de API externas ou credenciais. As ocorrências de `innerHTML` e `dangerouslySetInnerHTML` são internas do React DOM. CSP presente em `dist/index.html`." },
  { id: 'E7', titulo: "`.env` local", texto: "Comparado ao `.env.example` campo a campo sem exibir valores: usuário e senha diferem; senha forte; nenhuma chave extra." },
  { id: 'E8', titulo: "oxlint 1.89 com regras anti-XSS", texto: "`react/no-danger`, `react/no-danger-with-children`, `react/jsx-no-script-url`, `no-eval` e `no-new-func`: `src` e `public` passam (exit 0). Um arquivo de teste com os quatro padrões é barrado." },
  { id: 'E9', titulo: "Não executado", texto: "Consulta de privilégios da role no Postgres (`rolsuper`, `rolbypassrls`) e do `pg_hba.conf`: o Docker Desktop estava parado. F04 e F05 se apoiam na configuração do repositório e no comportamento documentado da imagem `postgres:16`." }
];
