-- Schema do Din-Din (PostgreSQL 16).
-- Rode como o admin do contêiner (POSTGRES_USER), que fica dono das tabelas. A API conecta
-- com outra role (APP_DB_USER), criada no fim deste arquivo sem superusuário e só com
-- SELECT/INSERT/UPDATE/DELETE (F04):
--
--   docker exec -i postgres-dev sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < backend/src/db/init.sql
--
-- APP_DB_USER e APP_DB_PASSWORD vêm do ambiente do contêiner, que o compose lê do .env.
-- Pode rodar de novo sem perder nada. Num banco da versão antiga (sem usuários), as tabelas
-- ganham a coluna usuario_id vazia; depois rode migracao-001-dono-dos-dados.sql.

\set ON_ERROR_STOP on
\set usuario_app din_din_app
\getenv usuario_app APP_DB_USER
\getenv senha_app APP_DB_PASSWORD
\if :{?senha_app}
\else
  \warn 'APP_DB_PASSWORD não chegou ao contêiner. Confira o .env e rode: docker compose -f backend/docker-compose.yml up -d'
  \quit
\endif

SELECT :'usuario_app' = current_user AS role_e_admin \gset
\if :role_e_admin
  \warn 'APP_DB_USER precisa ser diferente de POSTGRES_USER: a API não pode conectar como superusuário.'
  \quit
\endif

CREATE TABLE IF NOT EXISTS usuarios (
  id          SERIAL PRIMARY KEY,
  email       VARCHAR(254) NOT NULL UNIQUE,
  senha_hash  TEXT NOT NULL,       -- scrypt; a senha em si nunca é guardada
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS despesas (
  id                SERIAL PRIMARY KEY,
  usuario_id        INTEGER NOT NULL REFERENCES usuarios (id),
  descricao         TEXT NOT NULL,
  valor             NUMERIC(10, 2) NOT NULL,
  categoria         TEXT,
  metodo_pagamento  TEXT,
  parcelas          INTEGER, -- 0 = a vista
  status            TEXT,    -- 'pago' ou 'pendente'
  tipo              TEXT NOT NULL DEFAULT 'SAIDA', -- 'ENTRADA' ou 'SAIDA'
  mes               DATE NOT NULL DEFAULT date_trunc('month', current_date)::date, -- sempre o dia 1
  parcela_atual     INTEGER, -- 1..parcelas numa compra parcelada; NULL fora dela
  compra_id         UUID     -- liga as parcelas da mesma compra (uma linha por mês)
);

 CREATE TABLE IF NOT EXISTS categorias (
      id             SERIAL PRIMARY KEY,
      usuario_id     INTEGER NOT NULL REFERENCES usuarios (id),
      nome           VARCHAR(50) NOT NULL,
      descricao      TEXT NOT NULL,
      cor            VARCHAR(7) DEFAULT '#64748B',
      icone          VARCHAR(30) DEFAULT 'tag',
      limite_mensal  NUMERIC(10, 2) NOT NULL,
      tipo_custo     VARCHAR(10) DEFAULT 'variavel', -- 'fixo' ou 'variavel'
      ativo          BOOLEAN DEFAULT TRUE
    );

-- Banco da versão antiga: a coluna entra vazia (NULL) para não perder nenhuma linha.
-- Linhas sem dono não aparecem para ninguém até a migracao-001 passá-las para a sua conta.
ALTER TABLE despesas ADD COLUMN IF NOT EXISTS usuario_id INTEGER REFERENCES usuarios (id);
ALTER TABLE categorias ADD COLUMN IF NOT EXISTS usuario_id INTEGER REFERENCES usuarios (id);
ALTER TABLE categorias DROP CONSTRAINT IF EXISTS categorias_nome_key;

-- Meses, entradas e parcelas (2026-11-24). Linhas que já existiam ficam como SAIDA no mês em
-- que este arquivo rodar: o Postgres calcula o DEFAULT uma vez e preenche todas.
ALTER TABLE despesas ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'SAIDA';
ALTER TABLE despesas ADD COLUMN IF NOT EXISTS mes DATE NOT NULL DEFAULT date_trunc('month', current_date)::date;
ALTER TABLE despesas ADD COLUMN IF NOT EXISTS parcela_atual INTEGER;
ALTER TABLE despesas ADD COLUMN IF NOT EXISTS compra_id UUID;
-- DROP + ADD deixa o arquivo rodar de novo sem erro de "constraint já existe".
ALTER TABLE despesas DROP CONSTRAINT IF EXISTS despesas_tipo_check;
ALTER TABLE despesas ADD CONSTRAINT despesas_tipo_check CHECK (tipo IN ('ENTRADA', 'SAIDA'));
ALTER TABLE despesas DROP CONSTRAINT IF EXISTS despesas_mes_dia_1_check;
ALTER TABLE despesas ADD CONSTRAINT despesas_mes_dia_1_check CHECK (EXTRACT(DAY FROM mes) = 1);

CREATE INDEX IF NOT EXISTS despesas_usuario_id_idx ON despesas (usuario_id);
-- A tela lista um mês por vez: WHERE usuario_id = $1 AND mes = $2.
CREATE INDEX IF NOT EXISTS despesas_usuario_mes_idx ON despesas (usuario_id, mes);
CREATE INDEX IF NOT EXISTS despesas_compra_id_idx ON despesas (compra_id) WHERE compra_id IS NOT NULL;
-- Nome único por dono: a categoria de um usuário não bloqueia o nome para os outros (F03).
CREATE UNIQUE INDEX IF NOT EXISTS categorias_usuario_nome_key ON categorias (usuario_id, nome);

-- Role da API: sem superusuário, sem BYPASSRLS, sem criar banco nem role.
SELECT format('CREATE ROLE %I', :'usuario_app')
 WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = :'usuario_app') \gexec
-- Sem NOSUPERUSER etc. aqui: em banco gerenciado (Neon) o dono não é superusuário e o Postgres
-- recusa mexer nesses atributos. A role nasce sem eles; a conferência abaixo garante que segue assim.
ALTER ROLE :"usuario_app" LOGIN PASSWORD :'senha_app';
SELECT rolsuper OR rolbypassrls OR rolcreatedb OR rolcreaterole AS role_com_privilegio_demais
  FROM pg_roles WHERE rolname = :'usuario_app' \gset
\if :role_com_privilegio_demais
  \warn 'APP_DB_USER tem SUPERUSER, BYPASSRLS, CREATEDB ou CREATEROLE. Remova esses atributos (como admin) e rode de novo.'
  \quit
\endif

REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT CONNECT ON DATABASE :"DBNAME" TO :"usuario_app";
GRANT USAGE ON SCHEMA public TO :"usuario_app";
GRANT SELECT, INSERT ON usuarios TO :"usuario_app";
GRANT SELECT, INSERT, UPDATE, DELETE ON despesas, categorias TO :"usuario_app";
GRANT USAGE ON SEQUENCE usuarios_id_seq, despesas_id_seq, categorias_id_seq TO :"usuario_app";
