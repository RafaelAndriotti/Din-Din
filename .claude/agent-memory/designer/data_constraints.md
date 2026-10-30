---
name: data-constraints-dindin
description: Data limits that block design ideas in Din-Din (no date on despesas, categoria is free text, unused PUT/DELETE, proxy only /despesas)
metadata:
  type: project
---

Limites de dados em 2026-10-30 que afetam o design:
- `despesas` não tem coluna de data. Qualquer "do mês", "atrasado" ou limite mensal real depende do A3 do roteiro do mentor.
- `categoria` na despesa é texto livre, sem FK; `/categorias` tem `cor`, `icone` e `limiteMensal`, mas o vínculo é só por nome.
- A API já tem PUT e DELETE de despesas, que o front não usava em 2026-10-30.
- O proxy do Vite só cobre `/despesas`; `/categorias` precisa entrar em `server.proxy`.
- O usuário pediu propostas implementáveis só no frontend; o que precisa do backend vai numa seção "futuro".

**Why:** evita propor "resumo do mês" ou "limite mensal" como se fossem só frontend.
**How to apply:** antes de propor algo temporal ou ligado a categoria, verifique se `init.sql` já ganhou `data`/`categoria_id`; se ganhou, atualize esta memória. Relacionado: [[project-redesign-2026-10-30]].
