---
name: project-redesign-2026-10-30
description: Status of the 2026-10-30 frontend redesign proposal (P1-P5, tokens, template) and which decisions are pending with Rafa
metadata:
  type: project
---

Redesign proposto em 2026-10-30 e AGUARDANDO aprovação do Rafa. Nada foi implementado ainda.
Arquivos: `.claude/reports/design-proposta-2026-10-30.md` e `design-template-2026-10-30.html`.

Propostas (ordem sugerida de implementação: P2, P1, P3, P5, P4):
- P1: estados honestos (skeleton, erro com retry, vazio separado de filtro sem resultado, fim do sucesso simulado em `createDespesa`).
- P2: acessibilidade e tokens de contraste (foco visível, radios acessíveis, modais com role=dialog/Esc).
- P3: resumo com card herói "Total registrado" e barra empilhada pago/a pagar; "Ticket médio" rebaixado.
- P4: formulário com valor primeiro, chips de categoria/método, parcelas só para crédito, modo edição via PUT.
- P5: lista vira cards abaixo de 720px; ações editar/excluir (com desfazer)/marcar como pago; filtro de status segmentado.

Fase 2 (depende do backend): limites por categoria e resumo mensal exigem a coluna `data` na despesa (A3).

Decisões pendentes com o Rafa: paleta, tema claro, tabela x cards, categorias vindas de /categorias, fallback, desfazer x confirmar, semântica do valor parcelado.

**Why:** evita repropor o mesmo pacote ou contradizer tokens já sugeridos.
**How to apply:** antes da próxima rodada, confira o que foi aprovado/recusado e atualize este arquivo; veja [[design-tokens-dindin]] e [[data-constraints-dindin]].
