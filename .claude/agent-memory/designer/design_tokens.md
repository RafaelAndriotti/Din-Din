---
name: design-tokens-dindin
description: Proposed token set (colors with measured contrast, type scale, spacing) for Din-Din dark theme; status proposed, not yet approved
metadata:
  type: project
---

Tokens propostos em 2026-10-30 (status: proposto, não aprovado):
- Superfícies sólidas: bg #0B0F19 (mantido), surface-1 #121826, surface-2 #1A2233, surface-3 #232C3D.
- Texto: #F1F5F9 / #A1AAB8 / #8B95A7. O antigo #6B7280 reprova (3,4:1 no card).
- Accent: texto #818CF8, soft/foco #A5B4FC, fundo do botão #4F46E5 (o antigo #6366F1 como texto reprova; branco sobre #6366F1 dá 4,47).
- Semântica: pago #34D399, pendente #FBBF24, perigo #F87171, botão destrutivo #B91C1C. Tints a 14%.
- Borda de controle #64748B (3,34:1 sobre surface-2); a borda antiga rgba(255,255,255,.08) dá 1,24:1.
- Tipografia: 32/24/20/16/14/12, Plus Jakarta Sans, valores com tabular-nums (nunca monospace).
- Espaçamento em grid de 4; raios 6/10/16/full mantidos; control-h 44px.
- Regra: vermelho só para erro, estouro e ação destrutiva; pendente é âmbar.

**Why:** os contrastes foram calculados, não estimados; reaproveite os números sem recalcular.
**How to apply:** use estes nomes de token nas próximas propostas; se o Rafa aprovar ou recusar, atualize o status aqui. Relacionado: [[project-redesign-2026-10-30]].
