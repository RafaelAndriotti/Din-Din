CREATE TABLE IF NOT EXISTS despesas (
  id         SERIAL PRIMARY KEY,
  descricao  TEXT NOT NULL,
  valor      NUMERIC(10, 2) NOT NULL,
  categoria  TEXT,
  data       DATE NOT NULL DEFAULT CURRENT_DATE,
  criado_em  TIMESTAMP NOT NULL DEFAULT NOW()
);