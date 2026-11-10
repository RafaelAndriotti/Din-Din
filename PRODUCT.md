# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The owner of the project, one person tracking their own money. Two moments matter equally (confirmed 2026-11-10):

- On the phone, right after paying: log an expense fast.
- At a desk: review what is paid and what is still owed.

## Product Purpose

Din-Din is a personal expense tracker. The first question the screen must answer when it opens is "what do I still owe?" (confirmed 2026-11-10). Paid items and the overall total are context for that answer.

It is also a study project: the owner writes the backend to learn it. Frontend work must not require backend or database changes.

## Operating Context

- Expenses have: description, value (BRL), category, payment method (PIX, débito, crédito), installments (crédito only), status (pago / pendente).
- Crédito defaults to pendente (paid later on the card bill); PIX and débito default to pago.
- When the API is down the frontend shows example data and says so.

## Capabilities and Constraints

- Frontend: React 19 + Vite, plain CSS, lucide-react icons. API: Express 5 + PostgreSQL.
- Design work is frontend-only. No changes to `backend/` or the database schema (owner's instruction, 2026-11-10).
- The API has no date field on expenses yet (planned in the backend roadmap, item A3). The UI must not show or imply dates, months, or due dates until the API provides them.
- Interface language: Brazilian Portuguese. Money in pt-BR format.
- Existing behavior to preserve: optimistic delete with undo, toast with retry, form validation mirroring the API contract, keyboard-operable radio groups, focus management in dialogs.

## Brand Commitments

- Name: Din-Din.
- The owner rejected the previous look as generic AI output (navy ground, indigo accent, KPI card row, rounded cards everywhere). Do not return to it.

## Evidence on Hand

- Example data in `frontend/src/services/api.js` (three expenses). No real usage data, testimonials, or claims exist; none may be invented.

## Product Principles

1. What is still owed comes first.
2. Logging an expense takes seconds, on a phone, with one hand.
3. Never show a number the person will not actually pay or did not actually spend.
4. A failure is never shown as success.

## Accessibility & Inclusion

Existing work targets WCAG AA contrast, visible focus, full keyboard operation, and reduced-motion support. Keep that level.
