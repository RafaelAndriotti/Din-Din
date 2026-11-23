-- Migração 001: dono dos dados antigos.
-- Para quem já tinha despesas e categorias antes da autenticação. Depois do init.sql novo,
-- essas linhas ficam com usuario_id vazio (NULL) e não aparecem para ninguém. Esta migração
-- passa todas elas para a conta do e-mail informado e torna usuario_id obrigatório.
--
-- 1. Rode o init.sql novo e crie a sua conta pelo frontend.
-- 2. Rode, trocando o e-mail:
--   docker exec -i postgres-dev sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v email=voce@exemplo.com' < backend/src/db/migracao-001-dono-dos-dados.sql
--
-- Roda numa transação: se qualquer passo falhar, nada muda.

\set ON_ERROR_STOP on

SELECT count(*) AS achou, max(id) AS dono_id FROM usuarios WHERE email = lower(trim(:'email')) \gset
\if :achou
\else
  \warn 'Nenhuma conta com esse e-mail. Crie a conta pelo frontend e rode de novo.'
  \quit
\endif

BEGIN;
UPDATE despesas SET usuario_id = :dono_id WHERE usuario_id IS NULL;
UPDATE categorias SET usuario_id = :dono_id WHERE usuario_id IS NULL;
ALTER TABLE despesas ALTER COLUMN usuario_id SET NOT NULL;
ALTER TABLE categorias ALTER COLUMN usuario_id SET NOT NULL;
COMMIT;
