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

Edite o arquivo `.env` recém-criado com suas credenciais (usuário, senha e porta do banco).

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

Suba o contêiner do PostgreSQL via Docker Compose:
```bash
docker compose -f backend/docker-compose.yml up -d
```

> **Nota:** As tabelas do banco podem ser criadas executando o script SQL contido em `src/db/init.sql` no banco `din_din_db` criado pelo Docker.

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
   O servidor estará ativo em: `http://localhost:3000`

2. **Terminal 2 - Iniciar o Frontend:**
   ```bash
   npm run dev:frontend
   ```
   A interface estará disponível em: `http://localhost:5173`

*(O Vite já está pré-configurado com proxy reverso apontando chamadas de `/despesas` para `http://localhost:3000`)*.

---

## 📡 Documentação da API REST

### Endpoints de Despesas (`/despesas`)

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/despesas` | Retorna a lista de todas as despesas cadastradas |
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
| `GET` | `/categorias` | Retorna a lista de todas as categorias cadastradas |
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
| `POSTGRES_USER` | `seu_usuario_aqui` | Usuário do banco PostgreSQL |
| `POSTGRES_PASSWORD` | `sua_senha_aqui` | Senha de autenticação do PostgreSQL |
| `POSTGRES_DB` | `din_din_db` | Nome da base de dados utilizada |
| `POSTGRES_HOST` | `localhost` | Endereço do host do banco |
| `POSTGRES_PORT` | `5434` | Porta mapeada para o contêiner Docker |
| `DATABASE_URL` | `postgresql://...` | String de conexão completa |
| `PORT` | `3000` | Porta onde o Express executará |

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
