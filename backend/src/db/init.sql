CREATE TABLE IF NOT EXISTS despesas (
  id         SERIAL PRIMARY KEY,
  "desc"       TEXT NOT NULL,
  value      NUMERIC(10, 2) NOT NULL,
  category   TEXT,
  payMethod  TEXT,
  installment  INTEGER,
  status     TEXT
);

 CREATE TABLE IF NOT EXISTS categorias (
      id             SERIAL PRIMARY KEY,
      nome           VARCHAR(50) NOT NULL UNIQUE,
      descricao      TEXT,
      cor            VARCHAR(7) DEFAULT '#64748B',
      icone          VARCHAR(30) DEFAULT 'tag',
      limite_mensal  NUMERIC(10, 2),
      tipo_custo     VARCHAR(10) DEFAULT 'variavel', -- 'fixo' ou 'variavel'
      ativo          BOOLEAN DEFAULT TRUE
    );