CREATE TABLE IF NOT EXISTS despesas (
  id                SERIAL PRIMARY KEY,
  descricao         TEXT NOT NULL,
  valor             NUMERIC(10, 2) NOT NULL,
  categoria         TEXT,
  metodo_pagamento  TEXT,
  parcelas          INTEGER, -- 0 = a vista
  status            TEXT     -- 'pago' ou 'pendente'
);

 CREATE TABLE IF NOT EXISTS categorias (
      id             SERIAL PRIMARY KEY,
      nome           VARCHAR(50) NOT NULL UNIQUE,
      descricao      TEXT NOT NULL,
      cor            VARCHAR(7) DEFAULT '#64748B',
      icone          VARCHAR(30) DEFAULT 'tag',
      limite_mensal  NUMERIC(10, 2) NOT NULL,
      tipo_custo     VARCHAR(10) DEFAULT 'variavel', -- 'fixo' ou 'variavel'
      ativo          BOOLEAN DEFAULT TRUE
    );