CREATE TABLE IF NOT EXISTS despesas (
  id         SERIAL PRIMARY KEY,
  "desc"       TEXT NOT NULL,
  value      NUMERIC(10, 2) NOT NULL,
  category   TEXT,
  payMethod  TEXT,
  installment  INTEGER,
  status     TEXT
);