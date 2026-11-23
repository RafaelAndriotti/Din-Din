# 💰 Controle Financeiro

Sistema completo de **Gestão e Controle Financeiro Pessoal**, composto por uma **API REST em Node.js com Express**, banco de dados relacional **PostgreSQL**, interface moderna em **React + Vite** e suíte de testes automatizados com **Vitest**.

---

## 📌 Sumário

- [Visão Geral](#-visão-geral)
- [Tecnologias Utilizadas](#-tecnologias-utilizadas)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Funcionalidades Implementadas](#-funcionalidades-implementadas)
- [Pré-requisitos](#-pré-requisitos)
- [Instalação e Configuração](#-instalação-e-configuração)
- [Executando a Aplicação](#-executando-a-aplicação)
- [Documentação da API REST](#-documentação-da-api-rest)
- [Variáveis de Ambiente](#-variáveis-de-ambiente)
- [Testes Automatizados](#-testes-automatizados)

---

## 🌟 Visão Geral

O projeto tem como finalidade oferecer um controle simplificado e visual de finanças pessoais, permitindo:
- Registro e acompanhamento de **despesas** (com valor, categoria, método de pagamento, parcelamento e status).
- Gerenciamento de **categorias** de receitas e despesas com limites mensais, cores personalizadas e classificação de custo.
- Visualização de **métricas e KPIs** (total de despesas, valores pagos, valores pendentes e média por despesa).
- Interface fluida com filtros por texto, categoria e status, além de modal de cadastro e modal de detalhes.

---

## 🛠 Tecnologias Utilizadas

### Backend
- **Node.js** (ES Modules - `type: module`)
- **Express 5** - Framework web rápido e minimalista
- **pg (node-postgres)** - Pool de conexões para PostgreSQL
- **Zod** - Validação de esquemas e dados de entrada
- **dotenv** - Gerenciamento de variáveis de ambiente
- **nodemon** - Reinicialização automática em ambiente de desenvolvimento

### Frontend
- **React 19** - Biblioteca para interfaces de usuário reativas
- **Vite 6** - Ferramenta de build e servidor de desenvolvimento de alta performance
- **Lucide React** - Biblioteca de ícones modernos
- **Oxlint** - Linter ultrarrápido para código JavaScript/React

### Banco de Dados & Infraestrutura
- **PostgreSQL 16**
- **Docker & Docker Compose** - Provisionamento rápido do banco de dados em contêiner

### Testes
- **Vitest** - Test runner integrado
- **Supertest** - Testes de integração HTTP nas rotas da API

---

## 📂 Estrutura do Projeto

```plaintext
controle-financeiro/
├── backend/                  # Servidor e código-fonte da API
│   ├── docker-compose.yml    # Configuração do PostgreSQL em Docker
│   ├── server.js             # Ponto de entrada do servidor Express
│   └── src/
│       ├── app.js            # Configuração de middlewares e rotas da aplicação
│       ├── controllers/      # Controladores com regras de negócio e consultas
│       │   ├── categoriasController.js
│       │   └── despesasController.js
│       ├── routes/           # Definição dos endpoints REST
│       │   ├── cateoriasRoutes.js
│       │   ├── despesasRoutes.js
│       │   └── index.js
│       └── validators/       # Validações de requisição com Zod
│           ├── categoriasValidator.js
│           └── despesasValidator.js
├── frontend/                 # Aplicação Client-side (SPA)
│   ├── index.html            # Ponto de entrada HTML do Vite
│   ├── package.json          # Dependências do frontend
│   ├── vite.config.js        # Configuração do Vite e proxy reverso para a API
│   └── src/
│       ├── App.jsx           # Componente principal e fluxo de estado
│       ├── components/       # Componentes modulares de interface
│       │   ├── ExpenseDetailsModal.jsx
│       │   ├── ExpenseFilters.jsx
│       │   ├── ExpenseModal.jsx
│       │   ├── ExpenseTable.jsx
│       │   ├── Header.jsx
│       │   └── MetricsCards.jsx
│       └── services/
│           └── api.js        # Integração HTTP com a API e fallback local
├── src/                      # Recursos de banco de dados
│   └── db/
│       ├── db.js             # Conexão Pool do PostgreSQL
│       └── init.sql          # DDL para criação das tabelas no banco
├── tests/                    # Suíte de testes automatizados
│   ├── categorias.controller.test.js
│   ├── categorias.routes.test.js
│   └── categorias.validator.test.js
├── .env.example              # Exemplo de configuração de variáveis de ambiente
├── .gitignore                # Arquivos e diretórios ignorados pelo Git
├── package.json              # Gerenciador raiz unificado de scripts e dependências
└── README.md                 # Documentação oficial do projeto
```

---

## ✨ Funcionalidades Implementadas

### 1. Despesas
- **Listagem Completa**: Consulta de todas as despesas registradas.
- **Busca por ID**: Detalhamento de uma despesa específica.
- **Criação com Validação**: Validação via Zod garantindo preenchimento correto de descrição, valor, categoria, método de pagamento, parcelas e status.
- **Atualização**: Alteração de dados cadastrais de despesas existentes.
- **Remoção**: Exclusão de registros por identificador.

### 2. Categorias
- **Estrutura no Banco**: Tabela relacional suportando nome único, descrição, cor hexadecimal, ícone, limite orçamentário mensal, tipo de custo (`fixo` ou `variavel`) e status de ativação.
- **Rotas e Controladores**: Operações de CRUD para gerenciamento de categorias.

### 3. Painel / Dashboard (Frontend)
- **Cards de Métricas**:
  - *Total de Despesas*: Montante acumulado de todas as despesas.
  - *Pago no Mês*: Somatório de itens com status `paid`.
  - *Pendente no Mês*: Somatório de itens com status `pending`.
  - *Média por Despesa*: Média aritmética calculada dinamicamente.
- **Barra de Filtros**: Pesquisa por texto em tempo real, seleção por status e seleção por categoria.
- **Tabela Responsiva**: Listagem visual com badges de status, formatação de moeda brasileira (`R$`) e botões de ação.
- **Modal de Cadastro**: Formulário completo para inserção rápida de novas despesas.
- **Modal de Detalhes**: Exibição aprofundada das informações de um registro.
- **Modo Fallback Offline**: Caso a API esteja em manutenção ou inacessível, o frontend carrega dados demonstrativos sem quebrar a experiência do usuário.

---

## 📋 Pré-requisitos

Antes de iniciar, certifique-se de ter instalado em sua máquina:
- [Node.js](https://nodejs.org/) (versão 18 ou superior recomendada)
- [npm](https://www.npmjs.com/) (incluso no Node.js)
- [Docker](https://www.docker.com/) e [Docker Compose](https://docs.docker.com/compose/) (para o banco de dados) ou uma instância local do PostgreSQL

---

## 🚀 Instalação e Configuração

### 1. Clonar o repositório
```bash
git clone https://github.com/seu-usuario/controle-financeiro.git
cd controle-financeiro
```

### 2. Configurar as variáveis de ambiente
Copie o arquivo `.env.example` para criar o seu `.env` na raiz do projeto:

```bash
cp .env.example .env
```

Edite o arquivo `.env` recém-criado e troque **todos** os valores terminados em `_aqui`:

- `POSTGRES_USER` / `POSTGRES_PASSWORD`: admin do banco (o contêiner o cria como superusuário). Serve só para aplicar o `init.sql`.
- `APP_DB_USER` / `APP_DB_PASSWORD`: role com que a API conecta, sem superusuário. Precisa ser diferente do admin.
- `JWT_SECRET`: segredo que assina os tokens de login. Gere um com:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
  ```

As senhas precisam ter 12 caracteres ou mais, e o `JWT_SECRET`, 32 ou mais. A API não sobe enquanto houver valor de exemplo, variável faltando ou senha curta, e a mensagem diz qual variável corrigir.

### 3. Instalar dependências

Instale as dependências da raiz (backend, testes e ferramentas):
```bash
npm install
```

Instale as dependências do frontend:
```bash
npm --prefix frontend install
```

### 4. Inicializar o Banco de Dados com Docker

Suba o contêiner do PostgreSQL via Docker Compose (ele só aceita conexões da própria máquina, em `127.0.0.1:5434`):
```bash
docker compose -f backend/docker-compose.yml up -d
```

Crie as tabelas e a role da API rodando o `init.sql` como admin. Ele lê `APP_DB_USER` e `APP_DB_PASSWORD` do ambiente do contêiner, que vem do `.env`:
```bash
docker exec -i postgres-dev sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < backend/src/db/init.sql
```

> Se você editar o `.env` depois, rode o `docker compose ... up -d` de novo antes do `init.sql`: o contêiner é recriado com as variáveis novas, e os dados ficam no volume.

#### Já tinha dados de antes da autenticação?
O `init.sql` pode rodar sobre um banco antigo sem perder nada: as tabelas ganham a coluna `usuario_id` vazia, e as linhas antigas ficam invisíveis até ganharem um dono. Para passá-las para a sua conta:

1. Rode o `init.sql` como acima, suba a API e o frontend e crie a sua conta.
2. Rode a migração com o e-mail da conta:
   ```bash
   docker exec -i postgres-dev sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v email=voce@exemplo.com' < backend/src/db/migracao-001-dono-dos-dados.sql
   ```
   Ela roda numa transação e torna `usuario_id` obrigatório. Com um e-mail sem conta, avisa e não muda nada.

---

## 💻 Executando a Aplicação

Todos os scripts estão centralizados no `package.json` da raiz:

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia o backend com hot-reload (Nodemon) na porta 3000 |
| `npm run dev:backend` | Alias para iniciar o backend com Nodemon |
| `npm start` | Inicia o servidor backend com Node puro (produção) |
| `npm run dev:frontend` | Inicia o servidor Vite do frontend (porta padrão 5173) |
| `npm run build:frontend` | Compila os arquivos estáticos de produção do frontend |
| `npm test` | Executa a suíte de testes com Vitest |
| `npm run test:watch` | Executa os testes no modo observador (watch) |

### Execução em Desenvolvimento:

1. **Terminal 1 - Iniciar a API Backend:**
   ```bash
   npm run dev
   ```
   O servidor estará ativo em: `http://127.0.0.1:3000` (só a própria máquina alcança a API)

2. **Terminal 2 - Iniciar o Frontend:**
   ```bash
   npm run dev:frontend
   ```
   A interface estará disponível em: `http://localhost:5173`

*(O Vite já está pré-configurado com proxy reverso apontando chamadas de `/auth`, `/despesas` e `/categorias` para `http://127.0.0.1:3000`)*. Na primeira vez, crie a sua conta na tela de login.

---

## 📡 Documentação da API REST

### Autenticação (`/auth`)

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/auth/registro` | Cria uma conta: `{ "email": "...", "senha": "..." }` (senha com 8+ caracteres). Responde `201` com `{ token, usuario }`, ou `409` se o e-mail já tiver conta |
| `POST` | `/auth/login` | Entra numa conta. Responde `200` com `{ token, usuario }`, ou `401` com e-mail ou senha incorretos |

Todas as rotas de despesas e categorias exigem o token no cabeçalho `Authorization: Bearer <token>`. Sem token, ou com um token vencido (vale 1 hora), a resposta é `401`. Cada usuário só vê e altera os próprios registros: o registro de outra pessoa responde `404`, como um inexistente.

Limites: as rotas `/auth` aceitam 10 requisições por IP a cada 15 minutos, e as demais, 100 por minuto. Acima disso, a resposta é `429`.

As listagens são paginadas: `?pagina=1&limite=50` (padrão `limite=50`, máximo `100`).

### Endpoints de Despesas (`/despesas`)

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/despesas` | Retorna as despesas do usuário, paginadas (`?pagina=&limite=`) |
| `GET` | `/despesas/:id` | Retorna os detalhes de uma despesa pelo ID |
| `POST` | `/despesas` | Cadastra uma nova despesa (com validação Zod) |
| `PUT` | `/despesas/:id` | Atualiza uma despesa existente pelo ID |
| `DELETE` | `/despesas/:id` | Remove uma despesa do banco de dados |

#### Exemplo de Payload para Cadastro de Despesa (`POST /despesas`):
```json
{
  "desc": "Supermercado Mensal",
  "value": 450.00,
  "category": "Alimentação",
  "payMethod": "PIX",
  "installment": 0,
  "status": "paid"
}
```

---

### Endpoints de Categorias (`/categorias`)

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/categorias` | Retorna as categorias do usuário, paginadas (`?pagina=&limite=`) |
| `GET` | `/categorias/:id` | Retorna os dados de uma categoria pelo ID |
| `POST` | `/categorias` | Cria uma nova categoria |
| `PUT` | `/categorias/:id` | Atualiza uma categoria pelo ID |
| `DELETE` | `/categorias/:id` | Exclui uma categoria pelo ID |

#### Estrutura da Categoria:
```json
{
  "nome": "Transporte",
  "descricao": "Combustível, ônibus e manutenção de veículo",
  "cor": "#3B82F6",
  "limite_mensal": 400.00,
  "tipo_custo": "variavel",
  "ativo": true
}
```

---

## 🔐 Variáveis de Ambiente

O arquivo `.env.example` disponibiliza o modelo padrão das variáveis necessárias:

| Variável | Padrão | Descrição |
|---|---|---|
| `POSTGRES_USER` | `seu_usuario_aqui` | Admin do PostgreSQL (superusuário do contêiner). Só aplica o `init.sql` |
| `POSTGRES_PASSWORD` | `sua_senha_aqui` | Senha do admin (12+ caracteres) |
| `POSTGRES_DB` | `din_din_db` | Nome da base de dados utilizada |
| `POSTGRES_HOST` | `127.0.0.1` | Endereço do host do banco |
| `POSTGRES_PORT` | `5434` | Porta mapeada para o contêiner Docker |
| `APP_DB_USER` | `din_din_app` | Role com que a API conecta, sem superusuário (diferente do admin) |
| `APP_DB_PASSWORD` | `senha_da_api_aqui` | Senha da role da API (12+ caracteres) |
| `JWT_SECRET` | `segredo_do_jwt_aqui` | Segredo que assina os tokens de login (32+ caracteres aleatórios) |
| `PORT` | `3000` | Porta onde o Express executará |

Valores terminados em `_aqui` são recusados no boot.

---

## 🧪 Testes Automatizados

Os testes automatizados foram construídos utilizando **Vitest** e **Supertest**, cobrindo:
- **Testes Unitários de Controladores**: Verificam as respostas HTTP e manipulação correta das requisições simulando retornos do banco.
- **Testes de Integração de Rotas**: Simulam requisições HTTP reais sem necessidade de subir o servidor ou banco de dados externo.
- **Testes de Schemas de Validação**: Garantem a consistência dos dados validados pelo Zod.

Para executar todos os testes:
```bash
npm test
```
