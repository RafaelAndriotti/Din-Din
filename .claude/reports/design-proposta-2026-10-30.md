# Proposta de design: frontend Din-Din (2026-10-30)

Autor: agente `designer`. Template visual: `.claude/reports/design-template-2026-10-30.html` (abre direto no navegador, sem dependências).
Escopo: só frontend. Nada aqui exige rota nova. O que depende do backend está separado no fim.

---

## 1. Diagnóstico

O tema escuro, o índigo e a Plus Jakarta Sans dão uma base coerente, e a formatação `Intl.NumberFormat('pt-BR', BRL)` já está certa. Esse é o maior acerto.

O maior problema é a **confiabilidade do que a tela mostra**. `createDespesa` (`services/api.js`) cai no `catch` em qualquer falha, inclusive erro 400 do Zod, e devolve uma despesa "local" com `id: Date.now()`. O `App` então mostra o toast "cadastrada com sucesso". O usuário acha que salvou, mas nada foi gravado. Durante o carregamento, os cards mostram `R$ 0,00`, um valor falso. Em app de dinheiro, número errado custa mais caro do que layout feio.

Problemas por área:

| Área | Onde | O que está ruim | Por que importa |
|---|---|---|---|
| Hierarquia | `MetricsCards.jsx` | 4 cards com o mesmo peso. "Ticket médio" disputa atenção com "quanto falta pagar". O card "Total" usa ícone vermelho (`--danger`) | O usuário quer saber "quanto gastei e quanto falta pagar" em 3 s. Vermelho em todo gasto banaliza o alerta de estouro. |
| Contraste | `--text-muted #6B7280` | 3,43:1 sobre o card, 3,04:1 sobre `--bg-tertiary` | Reprova WCAG 1.4.3 (mínimo 4,5:1). Usado em subtítulos, labels de filtro, prefixo "R$", estado vazio. |
| Contraste | `--primary #6366F1` como texto | 3,71:1 no card; 2,81:1 no `radio-pill.active` | Reprova 1.4.3. O texto do status selecionado no formulário é o pior caso. |
| Contraste | botão primário | Gradiente começa em `#6366F1`: branco a 4,47:1 | Reprova por pouco. `#4F46E5` sólido dá 6,29:1. |
| Contraste | borda de input `rgba(255,255,255,.08)` | 1,24:1 contra o fundo | Reprova 1.4.11 (3:1 para identificar o controle). O input "some" no card. |
| Foco | `index.css`: `button { outline: none }`; inputs e selects também | Sem substituto em botões | Reprova 2.4.7. Quem usa teclado não sabe onde está. |
| Teclado | `ExpenseTable`: `onClick` no `<tr>` | Linha não é focável. O status no formulário usa `input { display: none }`, que tira o radio da ordem de tabulação | Reprova 2.1.1. O formulário não pode ser preenchido só com teclado. |
| Modais | `ExpenseModal`, `ExpenseDetailsModal` | Sem `role="dialog"`, `aria-modal`, Esc, trap de foco nem retorno de foco. O "X" não tem `aria-label` | Leitor de tela não anuncia o modal. Esc é o atalho que todo mundo espera. |
| Labels | `ExpenseFilters` | `<label>` sem `htmlFor`. O "×" da busca não tem nome acessível | 1.3.1 / 4.1.2. |
| Números | `.cell-value`, `.details-highlight-value` | `font-family: monospace` | Quebra a identidade visual. A fonte do projeto tem algarismos tabulares: `font-variant-numeric: tabular-nums` resolve sem trocar a fonte. |
| Fluxo | API tem `PUT` e `DELETE` | O front não edita nem exclui | Um lançamento errado não tem conserto. Essa é a maior lacuna funcional e é só frontend. |
| Fluxo | `ExpenseModal` | Valor em `type="number"` (vírgula falha em vários navegadores pt-BR), parcelas "0 = à vista" em campo numérico, categoria e método em `<select>` (2 cliques cada) | Atrito no fluxo mais frequente do app. |
| Estados | `ExpenseTable` | "Nenhuma despesa" e "filtro sem resultado" são a mesma tela, com o botão "Cadastrar primeira despesa" mesmo quando há 50 despesas | Mensagem errada ensina o próximo passo errado. |
| Ruído técnico | Header, banner, tabela | "API Online", "npm run dev:backend", `ID #12`, `title="GET /despesas/:id"` | Linguagem de desenvolvedor na tela do usuário final. |
| Parcelas | tabela e detalhes | "10x" sem valor da parcela; "À vista (0)" | A pessoa pensa em parcela ("10x de R$ 389,90"), não em contagem. |
| Mobile | `App.css` @768px | A tabela de 7 colunas rola na horizontal em 375 px. O header empilha e o botão "Nova despesa" fica longe do polegar | Celular é o uso principal de app de orçamento. |
| Tokens | `App.css` | Cores soltas: `#FDE68A`, `#FBBF24`, `#A5B4FC`, `#FCA5A5`, toasts `#064E3B`/`#7F1D1D`, gradientes; espaçamentos fora do grid (0.85rem, 1.15rem, 1.4rem, 0.45rem) | Sem token, cada tela inventa a sua cor e o ritmo visual se perde. |
| Affordance | `.metric-card:hover { translateY }` | Card não clicável "levanta" no hover | Promete uma interação que não existe. |

Observação de contrato: o `CLAUDE.md` diz que o C6 está renomeando `metodoPagamento` para `metodo_pagamento`. Hoje o controller devolve `metodoPagamento` (alias). O front precisa seguir o que o C6 fechar. Não é decisão de design, mas toca todos os componentes de lista.

---

## 2. Propostas priorizadas

### P1. Estados honestos: carregando, erro, vazio e fim do sucesso falso (Alta)

- **Problema:** `createDespesa` simula sucesso em qualquer erro. `loading` só gira o ícone de refresh, enquanto os cards mostram R$ 0,00. O estado vazio é um só. O banner de backend offline fala com o desenvolvedor.
- **Proposta:**
  - Carregando: skeleton no lugar do resumo e de 3 a 5 linhas da lista, com `aria-busy="true"`. Nunca mostrar R$ 0,00 antes de ter dado.
  - Erro ao carregar: card com ícone `CloudOff`, título "Não foi possível carregar suas despesas", botão "Tentar de novo" e `role="alert"`.
  - Vazio, primeiro uso (`despesas.length === 0`): "Comece registrando um gasto" e botão primário "Cadastrar primeira despesa".
  - Filtro sem resultado (`despesas.length > 0 && filtradas.length === 0`): ícone `FilterX`, "Nada encontrado para "{termo}"" e botão secundário "Limpar filtros". Sem botão de cadastro.
  - Salvar: em erro 400, mostrar o erro **no campo** (mapear `erros[].path[0]` do Zod para o campo). Em falha de rede, toast de erro com "Tentar de novo" e modal aberto com os dados preservados. Nunca devolver despesa simulada como sucesso.
  - Modo demonstração: banner discreto "Exibindo dados de exemplo. Alterações não serão salvas." com botão "Reconectar". Comandos de terminal só no `console.warn`.
- **Por quê:** confiança é o requisito número 1 de app financeiro. Heurística de Nielsen n.º 1 (visibilidade do status do sistema) e n.º 9 (ajudar a reconhecer e recuperar erros).
- **Especificação técnica:**
  - Skeleton: `.skel` com `background: linear-gradient(90deg, #1A2233, #232C3D, #1A2233)`, `background-size: 200%` e animação de 1,4 s. Em `prefers-reduced-motion: reduce`, sem animação.
  - Mostrar o skeleton só se o carregamento passar de 300 ms, para evitar flash.
  - `getDespesas` deve devolver `{ data, isFallback, error }` e o `App` guarda `status: 'loading' | 'ready' | 'error' | 'demo'`.
  - Fallback só em `TypeError` (rede). Respostas 4xx e 5xx viram erro, não fallback.
  - Toast: `role="status"` (sucesso) ou `role="alert"` (erro), em container `aria-live="polite"`. Duração de 5 s, pausa no hover e no foco. Botão de fechar de 36×36 px. Fundo `--surface-2`, borda esquerda de 4 px na cor semântica.
- **Esforço:** médio.
- **Depende do backend?** Não. Usa o formato de erro atual (`{ message, erros }`). Se o A1/M2 mudar esse formato, o mapeamento de erro por campo acompanha.

### P2. Acessibilidade e tokens de contraste (Alta, é a fundação das demais)

- **Problema:** contrastes reprovados (tabela acima), `outline: none` global, radio invisível ao teclado, linha de tabela clicável só com mouse, modais sem semântica.
- **Proposta:** trocar os tokens (seção 3), adicionar foco visível global e corrigir a semântica dos componentes interativos.
- **Por quê:** WCAG 2.2 AA (critérios 1.4.3, 1.4.11, 2.1.1, 2.4.7, 2.5.8 e 4.1.2). Também resolve legibilidade em tela de celular sob sol.
- **Especificação técnica:**
  - Em `index.css`, remover `outline: none` de `button` e adicionar `:focus-visible { outline: 2px solid #A5B4FC; outline-offset: 2px; }`. Em input e select: `outline-offset: 0` e `border-color: #A5B4FC`.
  - Status no formulário: `role="radiogroup"` com `<button role="radio" aria-checked>` e setas para navegar, ou manter `<input type="radio">` com a classe `.sr-only` (nunca `display: none`).
  - Lista: a descrição vira `<button class="desc-btn">`, que abre os detalhes. Não usar `onClick` no `<tr>`. Botões de ícone com `aria-label="Editar {descricao}"`.
  - Modais: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` apontando para o título. Esc fecha. Foco vai para o primeiro campo (Valor) ao abrir e volta ao botão de origem ao fechar. Trap de foco simples: no keydown de Tab, ciclar entre o primeiro e o último focável. A alternativa nativa é `<dialog>` com `showModal()`, que já dá Esc e inert no fundo.
  - Filtros: `<label htmlFor>` em todos (pode ser `.sr-only`). Busca com `type="search"` e botão limpar com `aria-label="Limpar busca"`.
  - Alvos: mínimo de 36×36 px nos botões de ícone da tabela e 44 px nos controles principais (`--control-h: 44px`).
  - Remover `transform` do hover dos cards de métrica.
- **Esforço:** médio.
- **Depende do backend?** Não.

### P3. Hierarquia do resumo: o que eu gastei e quanto falta pagar (Alta)

- **Problema:** `MetricsCards` dá peso igual a 4 números. "Ticket médio" é métrica de varejo, não de orçamento pessoal. A proporção entre pago e pendente não aparece. O vermelho no "Total" sugere alarme.
- **Proposta:** grid `2fr 1fr 1fr`.
  - Card herói "Total registrado": valor de 32 px/800, **barra empilhada** pago/a pagar com legenda em texto ("Pago R$ 5.177,05 (62%)", "A pagar R$ 3.138,80 (38%)") e rodapé com "Maior despesa" e "Média", rebaixada.
  - Card "A pagar": ícone `Clock` âmbar, contagem ("3 contas pendentes") e link "Ver pendentes", que aplica o filtro de status.
  - Card "Pago": ícone verde, contagem e link "Ver pagas".
  - Rótulo honesto: "Total registrado", não "do mês", porque a despesa não tem data (ver seção 6).
- **Por quê:** uma pergunta por bloco, em ordem de importância. A barra empilhada responde composição de um todo em 2 partes (pizza com 2 fatias seria pior para comparar). A legenda em texto garante que a informação não dependa só de cor (WCAG 1.4.1).
- **Especificação técnica:**
  - `.stack-bar`: `height: 12px`, `gap: 2px` (o fundo separa as cores, porque verde contra âmbar dá só 1,15:1), `border-radius: 9999px`, trilho `#232C3D`.
  - Barra com `role="img"` e `aria-label="62% pago, 38% a pagar"`.
  - Valores com `font-variant-numeric: tabular-nums`.
  - Abaixo de 900 px: herói em linha cheia e os outros 2 lado a lado. A 375 px, mantém 2 colunas para os cards menores (valor de 20 px).
  - Os links "Ver pendentes" e "Ver pagas" são `<button>` que chamam `setStatusFilter` e rolam até a lista.
- **Esforço:** baixo.
- **Depende do backend?** Não.

### P4. Cadastro e edição mais rápidos (Média)

- **Problema:** `ExpenseModal` pede 2 selects, um número de parcelas com "0 = à vista", valor com `type="number"` e não tem edição.
- **Proposta:**
  1. **Valor primeiro**, grande (input de 56 px de altura e 24 px/800), com prefixo "R$" e `inputmode="decimal"`. Aceita "1.234,56" e "1234.56": normalizar removendo os pontos de milhar e trocando a vírgula por ponto antes do `Number()`.
  2. Descrição.
  3. **Categoria em chips** (`role="radiogroup"`), com as 6 mais usadas mais o chip "Outra", que abre um input. Com P5, a lista vem de `GET /categorias` (nome e `cor`).
  4. **Forma de pagamento em chips.** Pré-seleciona o último método usado (`localStorage['dindin:ultimoMetodo']`).
  5. **Parcelas só para "Cartão de crédito"**: stepper − / + de 1 a 48, com dica ao vivo "10x de R$ 389,90". Para os outros métodos, envia `parcelas: 0` sem mostrar o campo.
  6. **Status** em segmentado Pago/Pendente, com ícone. Padrão inteligente: Boleto vem como Pendente, os demais como Pago.
  7. Ações: "Cancelar" (ghost), "Salvar e adicionar outra" (secundário, limpa e mantém categoria e método) e "Salvar despesa" (primário). Enter envia.
  8. **Modo edição**: o mesmo componente recebe `despesa` opcional. Título "Editar despesa", botão "Salvar alterações" e chamada `PUT /despesas/:id`.
- **Por quê:** o cadastro é o fluxo mais frequente. Chips trocam 2 cliques por 1 e mostram as opções sem abrir nada (reconhecer em vez de lembrar). Padrões inteligentes reduzem a digitação. Mostrar a parcela calculada evita o erro "o valor é total ou da parcela?".
- **Especificação técnica:**
  - `.chip`: `min-height: 36px`, `padding: 0 12px`, `border: 1px solid #64748B`, `radius: 9999px`. Selecionado: fundo `rgba(129,140,248,.14)`, borda `#818CF8` e texto `#A5B4FC` (6,75:1).
  - Erros por campo: `aria-invalid="true"`, `aria-describedby` e mensagem `.err` de 12 px/600 na cor `#F87171`, com ícone `AlertCircle`. Ao enviar com erro, o foco vai para o primeiro campo inválido.
  - Mobile (< 640 px): o modal vira **bottom sheet** (`align-items: flex-end`, raio de 20 px só no topo, `max-height: 92dvh`, rolagem interna) e o botão primário ocupa a largura toda, com 48 px.
  - Em `ExpenseModal.jsx`: os estados `desc`, `value` etc. precisam ser reinicializados a partir de `despesa` quando o modal abre em modo edição (usar `key={despesa?.id ?? 'novo'}` no componente pai).
- **Esforço:** médio.
- **Depende do backend?** Não. O `PUT` já existe e o validator exige o corpo completo, que o modal tem.

### P5. Lista responsiva com ações (editar, excluir, marcar como pago) e filtros mais diretos (Média)

- **Problema:** tabela de 7 colunas no celular, coluna "Ações" com um só botão "olho" redundante, ID técnico visível, sem excluir, filtros como 3 selects com label "Status:".
- **Proposta:**
  - **Desktop:** colunas Descrição, Categoria (bolinha com a `cor` mais o nome), Pagamento (com subtítulo "À vista" ou "10x de R$ 389,90"), Status (badge com ícone e texto), Valor (alinhado à direita, 16 px/700, tabular) e Ações. Nas ações, "Marcar como pago" aparece só nas pendentes, e os ícones Editar e Excluir ficam sempre visíveis. Cabeçalho da lista com "Lançamentos (10)" e "Total exibido: R$ X", que soma o filtrado.
  - **< 720 px:** a lista vira cards. Linha 1: descrição (ellipsis) e valor. Linha 2: bolinha, categoria, método ou parcela, e badge de status. O card inteiro é um `<button>` de 64 px ou mais que abre os detalhes, onde ficam Editar, Excluir e Marcar como pago. Botão "Nova despesa" fixo no rodapé (52 px, largura total).
  - **Excluir:** sem modal de confirmação. A linha some na hora e aparece o toast "{descricao} excluída." com "Desfazer". O `DELETE` só é chamado quando o toast expira (5 s). Desfazer cancela o timeout. Isso evita recriar com id novo.
  - **Marcar como pago:** `PUT` com o objeto inteiro e `status: 'pago'`. Atualização otimista com rollback e toast de erro se falhar.
  - **Filtros:** status vira controle segmentado "Todos 10 / Pendentes 3 / Pagos 7" (`aria-pressed`), com contagem. Categoria e ordenação seguem em `select`, com label `.sr-only`. Linha "Filtrando por: [Pendentes ×] Limpar filtros" quando há filtro ativo. No mobile, a busca ocupa a largura toda e os filtros viram chips em rolagem horizontal.
  - Ordenação "Mais recentes" continua por `id` (é o que existe). Renomear para "Ordem de cadastro" se o Rafa preferir precisão.
  - Remover `ID #` e os `title` com rota da API.
- **Por quê:** no celular, a tabela larga exige rolagem horizontal e esconde o valor, que é a coluna mais importante. Desfazer é melhor que confirmação para ação frequente e reversível (Nielsen n.º 3, controle e liberdade). Status com ícone e texto atende WCAG 1.4.1.
- **Especificação técnica:**
  - Breakpoints: `640px` (sheet e form em 1 coluna), `720px` (tabela vira cards) e `900px` (grid do resumo).
  - Badge: `padding: 2px 10px 2px 8px`, 12 px/700, ícone de 14 px. Pago: `#34D399` sobre `rgba(52,211,153,.14)` (7,07:1). Pendente: `#FBBF24` sobre `rgba(251,191,36,.14)` (7,99:1).
  - `td.num` com `text-align: right` e `th.num` alinhado igual.
  - Exclusão: guardar `{ item, index, timeoutId }` em `pendingDelete`. Cancelar recoloca o item no índice original.
- **Esforço:** médio a alto (é o maior, mas cada parte entra sozinha).
- **Depende do backend?** Não. Usa `PUT /despesas/:id` e `DELETE /despesas/:id`, que já existem.

---

## 3. Design tokens

Mantidos: `--bg #0B0F19`, índigo como marca, raios 6/10/16/full, Plus Jakarta Sans e tema escuro.
Mudam: superfícies sólidas (o `rgba` com `backdrop-filter` deixa o contraste imprevisível e custa GPU no celular), texto terciário mais claro, índigo claro quando é texto e borda de controle visível.

### Cores (contraste calculado sobre `--surface-1 #121826`, salvo indicação)

| Token | Hex | Uso | Contraste |
|---|---|---|---|
| `--bg` | `#0B0F19` | fundo da página | mantido |
| `--surface-1` | `#121826` | cards, tabela, modal | substitui `rgba(31,41,55,.6)` |
| `--surface-2` | `#1A2233` | inputs, hover de linha, blocos internos | |
| `--surface-3` | `#232C3D` | trilho de barra, skeleton | |
| `--border-subtle` | `#232C3D` | divisórias decorativas | decorativo, isento |
| `--border-control` | `#64748B` | borda de input, select, chip, botão secundário | 3,34:1 sobre surface-2 (1.4.11 ok) |
| `--text-1` | `#F1F5F9` | texto principal e valores | 16,2:1 |
| `--text-2` | `#A1AAB8` | labels, texto secundário | 7,6:1 |
| `--text-3` | `#8B95A7` | metadados, dicas, placeholders | 5,9:1 (era `#6B7280`, 3,4:1) |
| `--accent` | `#818CF8` | links, ícones e texto de destaque | 5,9:1 |
| `--accent-soft` | `#A5B4FC` | texto sobre fundo tingido, anel de foco | 6,75:1 no tint |
| `--accent-bg` | `#4F46E5` | fundo do botão primário | branco 6,29:1 |
| `--accent-bg-hover` | `#4338CA` | hover do primário | |
| `--accent-tint` | `rgba(129,140,248,.14)` | fundo de selecionado | |
| `--focus-ring` | `#A5B4FC` | `:focus-visible` | 9,6:1 sobre bg |
| `--positive` | `#34D399` | pago | 7,07:1 no próprio tint |
| `--warning` | `#FBBF24` | pendente, perto do limite | 7,99:1 no tint |
| `--danger` | `#F87171` | erro, estouro de limite, excluir | 5,30:1 no tint |
| `--danger-bg` | `#B91C1C` | fundo de botão destrutivo | branco 6,47:1 |
| `--*-tint` | cor a 14% | fundo de badge | |

Regra semântica: **vermelho só para erro, estouro e ação destrutiva.** Gasto comum é neutro (`--text-1`). Pendente é âmbar, não vermelho, porque pendente não é atraso (não há data de vencimento hoje).

Cores de categoria: vêm do campo `cor` de `/categorias`. São só decorativas (bolinha de 8 a 10 px), sempre acompanhadas do nome em texto, por isso ficam isentas de contraste. Fallback: `#64748B` (o default do banco).

### Tipografia

Fonte: Plus Jakarta Sans (mantida). Valores com `font-variant-numeric: tabular-nums` e **nunca** `monospace`.

| Token | Tamanho | Peso | Uso |
|---|---|---|---|
| `--fs-2xl` | 32 px (2rem) | 800 | valor herói do resumo, valor nos detalhes (36 px) |
| `--fs-xl` | 24 px | 700 | título da página, valores dos cards secundários, input de valor |
| `--fs-lg` | 20 px | 700 | título de modal, marca |
| `--fs-md` | 16 px | 400 a 700 | corpo, valor na lista |
| `--fs-sm` | 14 px | 400 a 600 | tabela, labels, botões, filtros |
| `--fs-xs` | 12 px | 600 a 700 | badges, cabeçalho de tabela, dicas, erros de campo |

Menos caixa alta: só o rótulo de estado no template usa uppercase. Títulos de card e cabeçalhos de tabela ficam em caixa normal, que lê mais rápido.

### Espaçamento (grid de 4 px)

`--sp-1 4` · `--sp-2 8` · `--sp-3 12` · `--sp-4 16` · `--sp-5 20` · `--sp-6 24` · `--sp-8 32` · `--sp-12 48`.
Substituem 0.45rem, 0.85rem, 1.15rem, 1.4rem e outros valores soltos.

### Raios, sombras e controles

- Raios mantidos: `--radius-sm 6`, `--radius-md 10`, `--radius-lg 16`, `--radius-full`. Bottom sheet: 20 px só no topo.
- Sombra: só `--shadow-lg` em modal e toast. Cards sem sombra (borda basta no escuro).
- `--control-h: 44px` para botão, input e select. Botões de ícone na tabela: 36 px. Chips e segmentado: 36 px.
- Sem gradientes no botão primário nem no logo (cor sólida `#4F46E5`). O gradiente no texto "DinDin" sai: com `-webkit-text-fill-color: transparent`, a seleção e o modo de alto contraste quebram.

---

## 4. Especificação por componente

### `Header.jsx`
- Altura de ~60 px, fundo `--surface-1` sólido (sem blur) e borda inferior `--border-subtle`.
- Esquerda: logo de 36 px (`#4F46E5`, ícone `Wallet` branco) e "Din-Din" em 20/800.
- Direita: indicador de conexão discreto (bolinha de 8 px e texto de 12 px em `--text-3`, "API conectada" ou "Dados de exemplo"), escondido abaixo de 720 px. Depois o botão de ícone Recarregar (44 px, `aria-label`) e o botão primário "Nova despesa".
- Abaixo de 720 px, "Nova despesa" sai do header e vai para a barra fixa no rodapé.

### `MetricsCards.jsx`, renomear para `SummaryCards`
- Ver P3. Recebe `onFilterStatus(status)` para os links "Ver pendentes" e "Ver pagas".
- Calcula total, pago, pendente, contagens, maior despesa e média. Recebe `loading` para mostrar o skeleton.

### `ExpenseFilters.jsx`
- Busca (`type="search"`, ícone à esquerda, `aria-label`), segmentado de status com contagem, select de categoria e select de ordenação.
- Linha "Filtrando por:" com tags removíveis (botão de 24 px com `aria-label="Remover filtro X"`) e "Limpar filtros".
- A lista de categorias do filtro passa a vir de `/categorias` (P5 e decisão 4), com fallback para as categorias únicas das despesas.

### `ExpenseTable.jsx`, que vira `ExpenseList` com 2 apresentações
- Ver P5. Mesma fonte de dados, renderiza `<table>` e `<ul class="cards">` e alterna por CSS (`@media (max-width: 720px)`). Assim não precisa de JS de breakpoint.
- Recebe `onEdit`, `onDelete`, `onTogglePaid` e `onOpenDetails`.
- Estados: `loading` (skeleton), `error`, `empty` e `emptyFiltered`, cada um com cópia e ação próprias (P1).

### `ExpenseModal.jsx`
- Ver P4. Props: `isOpen`, `onClose`, `onSave`, `despesa?` (modo edição), `categorias`.
- Ordem: Valor, Descrição, Categoria, Forma de pagamento, Parcelas (só crédito), Status.
- Rodapé fixo. No mobile vira bottom sheet.

### `ExpenseDetailsModal.jsx`
- Título = descrição. Valor de 36 px/800 centralizado e badge de status. Lista `<dl>` com Categoria, Forma de pagamento e Parcelas ("10x de R$ 389,90" ou "À vista"). Remove o `ID #`.
- Ação principal contextual: "Marcar como pago" (primário, largura total) quando pendente, ou "Marcar como pendente" (ghost) quando pago.
- Rodapé: "Excluir" (ghost, texto `--danger`, à esquerda) e "Editar" (secundário, à direita).
- Hoje faz `GET /despesas/:id` ao abrir. Como a lista já tem todos os campos, abrir com o item da lista e evitar o request (menos latência, sem estado de loading no modal).

### Toast (novo componente `Toast.jsx`, saindo do `App.jsx`)
- Canto inferior direito no desktop. No mobile, inferior centralizado, acima da barra "Nova despesa" (bottom: 80 px).
- Variantes `success` e `error`, com ação opcional ("Desfazer" ou "Tentar de novo") e botão de fechar.
- Container `aria-live="polite"`. Pausa o timer em `mouseenter` e `focusin`.

### Banner de modo demonstração
- Só aparece quando `isFallback`. Texto: "Exibindo dados de exemplo. Alterações não serão salvas." e botão "Reconectar".
- Fundo `--warning-tint`, borda `rgba(251,191,36,.35)` e texto `--text-1`.

---

## 5. Ideias para depois (só frontend)

- Atalho de teclado `N` para nova despesa e `/` para focar a busca.
- Lembrar os filtros na URL (`?status=pendente&cat=Moradia`) para compartilhar e voltar.
- Agrupar a lista por categoria, com subtotal no cabeçalho do grupo.
- Gráfico de barras horizontais "Gasto por categoria" (composição com mais de 5 partes; barra ordenada, não pizza). Dá para fazer em CSS puro, sem biblioteca.
- Tema claro via `prefers-color-scheme`, reaproveitando os mesmos nomes de token.
- Exportar CSV da lista filtrada.

## 6. Futuro: depende do backend

Não implementar agora. Descrevo o contrato para o Rafa decidir.

| Ideia | Dado necessário | Contrato sugerido |
|---|---|---|
| Resumo **do mês** e navegação entre meses ("< Outubro 2026 >") | data da despesa | coluna `data DATE NOT NULL DEFAULT CURRENT_DATE` (previsto no A3). Na API: `"data": "2026-10-15"`. Filtro `GET /despesas?mes=2026-10` (M3) |
| **Limite por categoria** (barra de progresso, alerta a 80% e estouro em vermelho), já desenhado no template como "Fase 2" | data, mais o vínculo entre despesa e categoria | `/categorias` já tem `limiteMensal` e `cor`. Falta `data` na despesa e, idealmente, `categoria_id` (FK, A3) no lugar do texto livre. Sem data, "gasto vs limite mensal" somaria todo o histórico, o que é enganoso |
| Status "Atrasado" (vermelho) separado de "Pendente" (âmbar) | data de vencimento | `vencimento DATE NULL` |
| Parcelas reais por mês ("parcela 3 de 10") | modelo de parcela | tabela `parcelas` ou campos `parcela_atual`/`data_primeira_parcela`. Hoje `parcelas` é só um número |
| Ordenar por data real | data | mesma coluna `data` |
| Totais no servidor para listas grandes | agregação | `GET /despesas/resumo?mes=` devolvendo `{ total, pago, pendente, porCategoria[] }` |

Nota de configuração (frontend, não backend): para usar `/categorias` no front, é preciso adicionar `'/categorias'` ao `server.proxy` do `frontend/vite.config.js`. Hoje só `/despesas` passa pelo proxy.

---

## 7. Decisões para o Rafa

1. **Paleta:** aprovar os tokens da seção 3 (mantém o escuro e o índigo; clareia texto secundário e índigo de texto) ou pedir outra direção.
2. **Tema:** só escuro, ou escuro mais claro via `prefers-color-scheme`? Recomendo só escuro agora e tokens prontos para o claro depois.
3. **Lista:** tabela no desktop e cards abaixo de 720 px (recomendado), ou cards em todos os tamanhos?
4. **Fonte das categorias:** o formulário passa a ler de `GET /categorias` (com `cor`) no lugar da lista fixa `CATEGORIAS_PREDEFINIDAS`? Isso exige o proxy no Vite e lida com o texto livre de "Outra" (cria categoria via `POST /categorias` ou só grava o texto na despesa?).
5. **Fallback local:** desligar a simulação em erros 4xx/5xx (recomendado) e mantê-la só em falha de rede durante o desenvolvimento? Isso conversa com a decisão pendente do `CLAUDE.md`.
6. **Excluir:** "Desfazer" por 5 s sem confirmação (recomendado) ou modal de confirmação?
7. **Semântica do valor parcelado:** `valor` é o total da compra (recomendado; a parcela é derivada como `valor / parcelas`) ou o valor de cada parcela? Isso muda o total do resumo.
8. **Ordem de implementação sugerida:** P2 (tokens e acessibilidade) → P1 → P3 → P5 → P4. Tokens primeiro porque todo o resto usa os tokens.
