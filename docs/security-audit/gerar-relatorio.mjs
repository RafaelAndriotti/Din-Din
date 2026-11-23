#!/usr/bin/env node
// Gera o relatório de auditoria de segurança do Din-Din em PDF (A4, pt-BR).
//
// Uso, na raiz do repositório:
//   node docs/security-audit/gerar-relatorio.mjs
//
// Requisitos: Node 22+ (WebSocket nativo) e Google Chrome ou Microsoft Edge instalados.
// Nada é instalado: o script monta um HTML (gráficos em SVG) e pede ao navegador
// headless, pelo protocolo DevTools, que imprima o PDF.
// Para escolher o navegador: defina CHROME_PATH com o caminho do executável.
//
// Entradas: achados.mjs (dados da auditoria) e issues-github.md (texto das issues).
// Saídas, nesta pasta: relatorio-auditoria-seguranca.html e relatorio-auditoria-seguranca.pdf.

import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { setTimeout as esperar } from 'node:timers/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  meta, stack, escopo, severidades, COR_PONTO_FORTE, categorias, achados, observacoes,
  pontosFortes, pontosFracos, condicoes, recomendacoes, evidencias
} from './achados.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const SAIDA_HTML = join(AQUI, 'relatorio-auditoria-seguranca.html');
const SAIDA_PDF = join(AQUI, 'relatorio-auditoria-seguranca.pdf');
export const ORDEM_SEV = ['critica', 'alta', 'media', 'baixa', 'info'];
const SEV_POR_TEXTO = { 'crítica': 'critica', alta: 'alta', 'média': 'media', baixa: 'baixa', informativa: 'info' };
export const NOME_CURTO = { 1: 'Banco sem tranca', 2: 'Permissão no navegador', 3: 'IDOR', 4: 'Chaves expostas', 5: 'Inputs (XSS)' };
const PERCENTUAL = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 });

// ---------------------------------------------------------------- texto
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Escapa e depois converte `código` e **negrito**.
export const inline = (s) => esc(s)
  .replace(/`([^`]+)`/g, '<code>$1</code>')
  .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

export const chip = (sev) => `<span class="chip" style="--c:${severidades[sev].cor}">${severidades[sev].rotulo}</span>`;

export const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

export function refArquivo(arq, lin) {
  const i = arq.lastIndexOf('/');
  const dir = i >= 0 ? arq.slice(0, i + 1) : '';
  const nome = i >= 0 ? arq.slice(i + 1) : arq;
  const linhas = lin ? `<b>:${esc(lin).replace(/,/g, ',<wbr>')}</b>` : '';
  return `<div class="ref">${dir ? `<span class="ref-dir">${esc(dir)}</span>` : ''}<span class="ref-arq">${esc(nome)}${linhas}</span></div>`;
}

// "arquivo:linhas" vira referência formatada; o resto (ex.: "teste em runtime") fica como texto.
export function refTexto(r) {
  const m = r.match(/^(.+?):([\d,-]+)$/);
  return m ? refArquivo(m[1], m[2]) : `<div class="ref ref-livre">${esc(r)}</div>`;
}

export function trecho(ref, cor) {
  if (!ref.trecho) return '';
  return `<figure class="snip" style="--c:${cor}"><figcaption>${esc(ref.arq)}:${esc(ref.lin)}</figcaption><pre>${esc(ref.trecho.join('\n'))}</pre></figure>`;
}

// ---------------------------------------------------------------- números
const contagem = Object.fromEntries(ORDEM_SEV.map((s) => [s, achados.filter((f) => f.sev === s).length]));
const total = achados.length;
const porCategoria = categorias.map((c) => ({
  ...c,
  achados: achados.filter((f) => f.cat === c.n),
  fortes: pontosFortes.filter((p) => p.cat === c.n)
}));

// ---------------------------------------------------------------- gráficos (SVG)
function graficoRosca() {
  const R = 54, E = 22, C = 2 * Math.PI * R, cx = 80, cy = 80;
  let acumulado = 0;
  const fatias = ORDEM_SEV.filter((s) => contagem[s] > 0).map((s) => {
    const comprimento = (contagem[s] / total) * C;
    const el = `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${severidades[s].cor}" stroke-width="${E}"`
      + ` stroke-dasharray="${(comprimento - 1.6).toFixed(2)} ${C.toFixed(2)}" stroke-dashoffset="${(-acumulado).toFixed(2)}"`
      + ` transform="rotate(-90 ${cx} ${cy})"/>`;
    acumulado += comprimento;
    return el;
  }).join('');
  const legenda = ORDEM_SEV.map((s) => `<li><span class="sw" style="background:${severidades[s].cor}"></span>`
    + `<span>${severidades[s].rotulo}</span><span class="lg-n">${contagem[s]}</span>`
    + `<span class="lg-p">${PERCENTUAL.format(contagem[s] / total)}</span></li>`).join('');
  const descricao = ORDEM_SEV.map((s) => `${severidades[s].rotulo}: ${contagem[s]}`).join(', ');
  return `<div class="chart">
    <h3 class="chart-t">Achados por severidade</h3>
    <svg viewBox="0 0 160 160" class="rosca" role="img" aria-label="${esc(descricao)}">
      <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#EEF2F7" stroke-width="${E}"/>
      ${fatias}
      <text x="${cx}" y="${cy + 9}" text-anchor="middle" class="r-num">${total}</text>
      <text x="${cx}" y="${cy + 25}" text-anchor="middle" class="r-lbl">achados</text>
    </svg>
    <ul class="legenda">${legenda}</ul>
  </div>`;
}

function graficoBarras() {
  const W = 352, rotuloW = 132, x0 = rotuloW + 8, barraW = W - x0 - 22, linhaH = 42, topo = 6, altBarra = 13;
  const maximo = Math.max(...porCategoria.map((c) => Math.max(c.achados.length, c.fortes.length)));
  const escala = (v) => (v / maximo) * barraW;
  const baseY = topo + porCategoria.length * linhaH;
  let svg = '';
  for (let v = 0; v <= maximo; v += 1) {
    const x = x0 + escala(v);
    svg += `<line x1="${x}" y1="${topo - 2}" x2="${x}" y2="${baseY - 6}" class="grade"/>`;
    svg += `<text x="${x}" y="${baseY + 6}" text-anchor="middle" class="tick">${v}</text>`;
  }
  porCategoria.forEach((c, i) => {
    const y = topo + i * linhaH;
    svg += `<text x="${rotuloW}" y="${y + 13}" text-anchor="end" class="cat-r">${c.n}. ${esc(NOME_CURTO[c.n])}</text>`;
    svg += `<text x="${rotuloW}" y="${y + 29}" text-anchor="end" class="cat-s">achados · fortes</text>`;
    let x = x0;
    for (const s of ORDEM_SEV) {
      const n = c.achados.filter((f) => f.sev === s).length;
      if (!n) continue;
      svg += `<rect x="${x.toFixed(2)}" y="${y + 3}" width="${(escala(n) - 0.9).toFixed(2)}" height="${altBarra}" rx="1.6" fill="${severidades[s].cor}"/>`;
      x += escala(n);
    }
    svg += `<text x="${(x + 4).toFixed(2)}" y="${y + 13.5}" class="val">${c.achados.length}</text>`;
    const wf = escala(c.fortes.length);
    if (wf > 0) svg += `<rect x="${x0}" y="${y + 19}" width="${(wf - 0.9).toFixed(2)}" height="${altBarra}" rx="1.6" fill="${COR_PONTO_FORTE}"/>`;
    svg += `<text x="${(x0 + wf + 4).toFixed(2)}" y="${y + 29.5}" class="val val-f">${c.fortes.length}</text>`;
  });
  const descricao = porCategoria.map((c) => `${NOME_CURTO[c.n]}: ${c.achados.length} achados, ${c.fortes.length} pontos fortes`).join('; ');
  const legenda = [...ORDEM_SEV.map((s) => [severidades[s].cor, severidades[s].rotulo]), [COR_PONTO_FORTE, 'Ponto forte']]
    .map(([cor, rot]) => `<span><i style="background:${cor}"></i>${rot}</span>`).join('');
  return `<div class="chart">
    <h3 class="chart-t">Achados e pontos fortes por categoria</h3>
    <svg viewBox="0 0 ${W} ${baseY + 12}" class="barras" role="img" aria-label="${esc(descricao)}">${svg}</svg>
    <div class="leg-barras">${legenda}</div>
  </div>`;
}

// ---------------------------------------------------------------- blocos
function linhaAchado(f) {
  const cor = severidades[f.sev].cor;
  const refs = f.refs.map((r) => refArquivo(r.arq, r.lin) + (r.nota ? `<div class="ref-nota">${inline(r.nota)}</div>` : '')).join('');
  const corpo = [
    `<div class="f-tit"><span class="fid">${f.id}</span>${inline(f.titulo)}</div>`,
    `<p>${inline(f.descricao)}</p>`,
    f.exploracao ? `<p class="f-sub"><b>Por que é explorável:</b> ${inline(f.exploracao)}</p>` : '',
    f.condicao ? `<p class="f-sub"><b>Condição:</b> ${inline(f.condicao)}</p>` : '',
    f.refs.map((r) => trecho(r, cor)).join(''),
    f.issue ? `<p class="f-issue">Issue ${f.issue} na seção 8</p>` : ''
  ].join('');
  return `<tr><td class="c-sev">${chip(f.sev)}</td><td class="c-ref">${refs}</td><td class="c-desc">${corpo}</td></tr>`;
}

const tabelaAchados = (lista) => `<table class="achados">
  <colgroup><col class="k1"><col class="k2"><col></colgroup>
  <thead><tr><th>Severidade</th><th>Arquivo:linha</th><th>Descrição</th></tr></thead>
  <tbody>${lista.map(linhaAchado).join('')}</tbody>
</table>`;

function capa() {
  const faixa = ORDEM_SEV.filter((s) => contagem[s] > 0)
    .map((s) => `<span style="flex:${contagem[s]};background:${severidades[s].cor}">${contagem[s]}</span>`).join('');
  const faixaLegenda = ORDEM_SEV.map((s) => {
    const rotulo = severidades[s].rotulo.toLowerCase();
    return `<span><i style="background:${severidades[s].cor}"></i>${plural(contagem[s], rotulo, `${rotulo}s`)}</span>`;
  }).join('')
    + `<span><i style="background:${COR_PONTO_FORTE}"></i>${pontosFortes.length} pontos fortes</span>`;
  return `<section class="capa">
    <div class="kicker">Auditoria de segurança · 5 categorias</div>
    <h1>${esc(meta.titulo).replace(esc(meta.projeto), `<span class="nw">${esc(meta.projeto)}</span>`)}</h1>
    <p class="sub">${esc(meta.subtitulo)}</p>
    <div class="faixa" aria-hidden="true">${faixa}</div>
    <div class="faixa-leg">${faixaLegenda}</div>
    <div class="meta-grid">
      <div><div class="k">Data</div><div class="v">${esc(meta.data)}</div></div>
      <div><div class="k">Branch e commit</div><div class="v">${esc(meta.branch)} @ ${esc(meta.commit)}</div></div>
      <div><div class="k">Arquivos versionados</div><div class="v">${meta.arquivosVersionados}, todos lidos</div></div>
      <div><div class="k">Histórico git</div><div class="v">${meta.commitsHistorico} commits · ${meta.refsHistorico} refs</div></div>
    </div>
    <div class="duas">
      <div>
        <h3 class="mini">Stack detectada</h3>
        <table class="stack">${stack.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${inline(v)}</td></tr>`).join('')}</table>
      </div>
      <div>
        <h3 class="mini">Escopo auditado</h3>
        <ul class="escopo">${escopo.map((e) => `<li>${inline(e)}</li>`).join('')}</ul>
      </div>
    </div>
    <h3 class="mini">Nota metodológica: como cada categoria foi mapeada para esta stack</h3>
    <table class="metodo">
      ${categorias.map((c) => `<tr><td class="m-cat"><span class="catn">${c.n}</span><b>${esc(c.nome)}</b><span class="m-sub">${esc(c.sub)}</span></td><td>${inline(c.mapeamento)}</td></tr>`).join('')}
    </table>
    <p class="nota-final">Só entram achados verificados no código real ou em teste de runtime. Cada um traz arquivo, linha, trecho, motivo de ser explorável e condição de exploração.</p>
  </section>`;
}

function resumo() {
  const criticasAltas = contagem.critica + contagem.alta;
  const kpis = [
    [String(total), 'achados nas cinco categorias', '#14285A'],
    [String(criticasAltas), 'de severidade crítica ou alta', severidades.critica.cor],
    [String(pontosFortes.length), 'pontos fortes verificados', COR_PONTO_FORTE],
    [String(new Set(achados.concat(observacoes).map((f) => f.issue)).size), 'issues prontas para o GitHub', '#14285A'],
    [String(observacoes.length), 'observações fora das cinco categorias', severidades.info.cor]
  ];
  return `<section class="pagina">
    <h1 class="sec" data-num="1">Resumo executivo</h1>
    <p class="lead">O Din-Din tem uma base cuidadosa nos pontos que costumam falhar cedo: SQL 100% parametrizado, validação Zod em todas as rotas de escrita, nenhum segredo no código nem no histórico, e um frontend sem nenhum ponto de injeção de HTML. <strong>O risco central é estrutural: a API não tem autenticação nem dono dos dados.</strong> Por isso as categorias 1 (banco sem tranca), 2 (permissão no navegador) e 3 (IDOR) compartilham a mesma causa raiz, já prevista no roteiro do projeto (item A5). Enquanto ela não for resolvida, a única barreira é a rede: API e Postgres escutam em todas as interfaces e, nesta máquina, quem bloqueia o acesso externo é o Firewall do Windows, não o projeto. Não há XSS explorável nem chave exposta.</p>
    <div class="kpis">${kpis.map(([n, t, cor]) => `<div class="kpi" style="--k:${cor}"><div class="n">${n}</div><div class="t">${esc(t)}</div></div>`).join('')}</div>
    <div class="graficos">${graficoRosca()}${graficoBarras()}</div>
    <h3 class="mini">Critério de severidade</h3>
    <table class="rubrica">${ORDEM_SEV.map((s) => `<tr><td>${chip(s)}</td><td>${inline(severidades[s].criterio)}</td></tr>`).join('')}</table>
    <div class="caixa">
      <h3>Condições de explorabilidade</h3>
      <ul class="colunas">${condicoes.map((c) => `<li>${inline(c)}</li>`).join('')}</ul>
    </div>
  </section>`;
}

function fortesFracos() {
  const linhas = pontosFortes.map((p) => `<tr>
      <td class="c-cat"><span class="catn">${p.cat}</span></td>
      <td><div class="pf-tit">${inline(p.titulo)}</div><div class="pf-txt">${inline(p.texto)}</div></td>
      <td class="c-ev">${p.refs.map(refTexto).join('')}</td>
    </tr>`).join('');
  return `<section class="pagina">
    <h1 class="sec" data-num="2">Pontos fortes e pontos fracos</h1>
    <h2 class="sub-sec">Pontos fracos: os riscos centrais</h2>
    <ol class="fracos">${pontosFracos.map((p) => `<li>${inline(p)}</li>`).join('')}</ol>
    <h2 class="sub-sec">Pontos fortes: o que está protegido, com evidência</h2>
    <p class="mini-nota">O número no círculo indica a categoria da auditoria a que o ponto forte se refere.</p>
    <table class="fortes">
      <colgroup><col class="k1"><col><col class="k3"></colgroup>
      <thead><tr><th>Cat.</th><th>Ponto forte</th><th>Evidência</th></tr></thead>
      <tbody>${linhas}</tbody>
    </table>
  </section>`;
}

function detalhados() {
  const blocos = porCategoria.map((c) => {
    const resumoCat = c.achados.length
      ? ORDEM_SEV.filter((s) => c.achados.some((f) => f.sev === s)).map((s) => `${chip(s)}<span class="cnt">${c.achados.filter((f) => f.sev === s).length}</span>`).join(' ')
      : '';
    return `<div class="cat">
      <div class="cat-h"><span class="catn grande">${c.n}</span><h2>${esc(c.nome)}</h2><span class="cat-sub">${esc(c.sub)}</span><span class="cat-cnt">${resumoCat}</span></div>
      <div class="cat-box"><p>${inline(c.mecanismo)}</p><p class="cobertura"><b>Cobertura:</b> ${inline(c.cobertura)}</p></div>
      ${tabelaAchados(c.achados)}
    </div>`;
  }).join('');
  return `<section class="pagina">
    <h1 class="sec" data-num="3">Achados detalhados por categoria</h1>
    ${blocos}
    <h1 class="sec sec-cont" data-num="4">Observações fora das cinco categorias</h1>
    <p>Verificadas e acionáveis, mas fora da contagem dos gráficos. Entram nas issues 6 e 8.</p>
    ${tabelaAchados(observacoes)}
  </section>`;
}

function indicePorArquivo() {
  const entradas = [];
  for (const f of [...achados, ...observacoes]) {
    for (const r of f.refs) entradas.push({ arq: r.arq, lin: r.lin, id: f.id, sev: f.sev, titulo: f.titulo, nota: r.nota });
  }
  const rank = (a) => (a.startsWith('backend/') ? 0 : a.startsWith('frontend/') ? 1 : 2);
  const primeiraLinha = (l) => Number(String(l).match(/\d+/)?.[0] ?? 0);
  entradas.sort((a, b) => rank(a.arq) - rank(b.arq) || a.arq.localeCompare(b.arq) || primeiraLinha(a.lin) - primeiraLinha(b.lin) || a.id.localeCompare(b.id));
  let atual = '';
  const linhas = entradas.map((e) => {
    const grupo = e.arq !== atual ? `<tr class="grupo"><td colspan="4">${esc(e.arq)}</td></tr>` : '';
    atual = e.arq;
    return `${grupo}<tr><td class="lin">${esc(e.lin).replace(/,/g, ',<wbr>')}</td><td class="id">${e.id}</td><td class="sv">${chip(e.sev)}</td><td>${inline(e.titulo)}${e.nota ? `<span class="ix-nota"> · ${inline(e.nota)}</span>` : ''}</td></tr>`;
  }).join('');
  const arquivos = new Set(entradas.map((e) => e.arq)).size;
  return `<section class="pagina">
    <h1 class="sec" data-num="5">Achados por arquivo, linha a linha</h1>
    <p>${entradas.length} referências em ${arquivos} arquivos, ordenadas por arquivo e linha. Inclui as observações O1–O4.</p>
    <table class="indice">
      <colgroup><col class="k1"><col class="k2"><col class="k3"><col></colgroup>
      <thead><tr><th>Linha(s)</th><th>ID</th><th>Severidade</th><th>O que há ali</th></tr></thead>
      <tbody>${linhas}</tbody>
    </table>
  </section>`;
}

function recomendacoesHtml() {
  const cards = recomendacoes.map((r) => `<div class="rec">
      <div class="p">${esc(r.p)}</div>
      <div>
        <h3>${inline(r.titulo)}</h3>
        <div class="meta">Quando: ${esc(r.quando)} · Resolve: ${esc(r.resolve.join(', '))}</div>
        <ul>${r.itens.map((i) => `<li>${inline(i)}</li>`).join('')}</ul>
      </div>
    </div>`).join('');
  const evid = evidencias.map((e) => `<div><span class="e-id">${e.id}</span><span class="e-tit">${inline(e.titulo)}</span><span>${inline(e.texto)}</span></div>`).join('');
  return `<section class="pagina">
    <h1 class="sec" data-num="6">Recomendações priorizadas</h1>
    ${cards}
    <h1 class="sec sec-cont" data-num="7">Evidências de verificação</h1>
    <p>Testes executados durante a auditoria. Nenhum escreveu no banco: as sondas usaram só GET e um POST com JSON malformado, recusado antes do banco.</p>
    <dl class="evid">${evid}</dl>
  </section>`;
}

export function lerIssues() {
  const md = readFileSync(join(AQUI, 'issues-github.md'), 'utf8').replace(/\r\n/g, '\n');
  const lista = [];
  for (const m of md.matchAll(/^--- ISSUE (\d+) ---\n([\s\S]*?)\n--- FIM ISSUE \1 ---$/gm)) {
    const corpo = m[2];
    lista.push({
      n: Number(m[1]),
      titulo: (corpo.match(/^Título: (.+)$/m) || [])[1] || '',
      sev: SEV_POR_TEXTO[(corpo.match(/severidade:(\S+)/) || [])[1]] || 'info',
      achados: (corpo.match(/^Achados: (.+)$/m) || [])[1] || '',
      bloco: m[0]
    });
  }
  if (lista.length === 0) throw new Error('Nenhuma issue encontrada em issues-github.md.');
  return lista;
}

function issuesHtml(issues) {
  const indice = issues.map((i) => `<tr><td class="id">${i.n}</td><td>${chip(i.sev)}</td><td>${esc(i.titulo)}</td><td class="ix-ach">${esc(i.achados)}</td></tr>`).join('');
  const blocos = issues.map((i) => `<div class="issue">
      <div class="issue-head">${chip(i.sev)}<span class="t">Issue ${i.n}</span><span class="a">${esc(i.achados)}</span></div>
      <pre class="issue-md">${esc(i.bloco)}</pre>
    </div>`).join('');
  return `<section class="pagina">
    <h1 class="sec" data-num="8">Issues para o GitHub</h1>
    <p class="sem-quebra">Uma issue por tema acionável; achados triviais do mesmo tema foram agrupados. Cada bloco, de <code>--- ISSUE n ---</code> a <code>--- FIM ISSUE n ---</code>, é o texto completo em Markdown: a linha “Título” vai no título da issue, o resto no corpo. O mesmo texto está em <code>docs/security-audit/issues-github.md</code>, que preserva a indentação dos blocos de código ao copiar.</p>
    <table class="indice-issues">
      <colgroup><col class="k1"><col class="k2"><col><col class="k4"></colgroup>
      <thead><tr><th>#</th><th>Severidade</th><th>Título</th><th>Achados</th></tr></thead>
      <tbody>${indice}</tbody>
    </table>
    ${blocos}
  </section>`;
}

// ---------------------------------------------------------------- documento
// O relatório de correções reusa este CSS trocando os textos do cabeçalho e do rodapé.
export function css({
  topoEsq = meta.titulo,
  topoDir = `${meta.data} · ${meta.branch} @ ${meta.commit}`,
  rodapeEsq = `${meta.projeto} · auditoria de segurança em 5 categorias`
} = {}) {
  const cssStr = (s) => JSON.stringify(s);
  const fonte = '"Segoe UI", "Helvetica Neue", Arial, sans-serif';
  return `
  @page {
    size: A4;
    margin: 20mm;
    @top-left { content: ${cssStr(topoEsq)}; font: 600 7.4pt ${fonte}; color: #14285A; vertical-align: bottom; padding-bottom: 3mm; border-bottom: .6pt solid #CBD5E1; }
    @top-right { content: ${cssStr(topoDir)}; font: 7.4pt ${fonte}; color: #64748B; vertical-align: bottom; padding-bottom: 3mm; border-bottom: .6pt solid #CBD5E1; }
    @bottom-left { content: ${cssStr(rodapeEsq)}; font: 7.4pt ${fonte}; color: #64748B; vertical-align: top; padding-top: 3mm; border-top: .6pt solid #CBD5E1; }
    @bottom-right { content: "Página " counter(page) " de " counter(pages); font: 600 7.4pt ${fonte}; color: #14285A; vertical-align: top; padding-top: 3mm; border-top: .6pt solid #CBD5E1; }
  }
  :root {
    --ink: #0F172A; --ink2: #334155; --ink3: #64748B; --linha: #E2E8F0; --suave: #F8FAFC; --azul: #14285A;
    --sans: ${fonte}; --mono: "Cascadia Mono", Consolas, "Courier New", monospace;
  }
  * { box-sizing: border-box; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin: 0; font: 9pt/1.48 var(--sans); color: var(--ink); background: #fff; }
  h1, h2, h3 { color: var(--azul); line-height: 1.2; margin: 0; }
  p { margin: 0 0 2.2mm; }
  code { font-family: var(--mono); font-size: .86em; background: #EEF2F7; border-radius: 2pt; padding: 0 2pt; color: #0B1F4A; }
  strong { font-weight: 700; }
  section.pagina { break-before: page; }
  h1.sec { font-size: 16pt; font-weight: 800; padding-bottom: 2.4mm; border-bottom: 1.6pt solid var(--azul); margin-bottom: 4.5mm; break-after: avoid; }
  h1.sec::before { content: attr(data-num); padding-right: 3.2mm; color: var(--ink3); font-weight: 700; }
  h1.sec-cont { margin-top: 8mm; }
  h2.sub-sec { font-size: 11pt; margin: 2mm 0 2.6mm; break-after: avoid; }
  h3.mini { font-size: 7.4pt; font-weight: 700; text-transform: uppercase; letter-spacing: .7pt; color: var(--ink3); margin: 4mm 0 1.8mm; break-after: avoid; }
  .sem-quebra code, .nw { white-space: nowrap; }
  .mini-nota { font-size: 7.8pt; color: var(--ink3); }
  .lead { font-size: 9.3pt; line-height: 1.52; color: var(--ink2); }

  .chip { display: inline-block; background: var(--c); color: #fff; font: 700 6.6pt/1 var(--sans); letter-spacing: .35pt; text-transform: uppercase; padding: 2.3pt 5.5pt 2.1pt; border-radius: 9pt; white-space: nowrap; }
  .catn { display: inline-flex; align-items: center; justify-content: center; width: 5.4mm; height: 5.4mm; border-radius: 50%; background: var(--azul); color: #fff; font: 700 7.4pt/1 var(--sans); flex: none; }
  .catn.grande { width: 7.4mm; height: 7.4mm; font-size: 10pt; }

  table { width: 100%; border-collapse: collapse; }
  thead { display: table-header-group; }
  tr { break-inside: avoid; }
  th { text-align: left; font: 700 6.8pt/1.2 var(--sans); text-transform: uppercase; letter-spacing: .5pt; color: var(--ink3); background: var(--suave); padding: 2mm 2.4mm; border-bottom: .8pt solid #CBD5E1; }
  td { padding: 2.4mm 2.4mm; border-bottom: .6pt solid var(--linha); vertical-align: top; }

  /* capa */
  .capa { padding-top: 2mm; }
  .kicker { font: 700 7.4pt/1 var(--sans); letter-spacing: 1.8pt; text-transform: uppercase; color: #B91C1C; }
  .capa h1 { font-size: 23pt; font-weight: 800; line-height: 1.1; letter-spacing: -.3pt; margin: 3.4mm 0 2.2mm; }
  .capa .sub { font-size: 10pt; color: var(--ink2); margin-bottom: 4.5mm; }
  .faixa { display: flex; height: 6.4mm; border-radius: 2.4pt; overflow: hidden; gap: .8mm; }
  .faixa span { display: flex; align-items: center; justify-content: center; color: #fff; font: 800 8pt var(--sans); }
  .faixa-leg { display: flex; flex-wrap: wrap; gap: 1.2mm 4.5mm; font-size: 7.8pt; color: var(--ink2); margin: 2mm 0 4.5mm; }
  .faixa-leg i, .leg-barras i { display: inline-block; width: 2.8mm; height: 2.8mm; border-radius: 1pt; margin-right: 1.3mm; vertical-align: -.3mm; }
  .meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); border-top: .6pt solid #CBD5E1; border-bottom: .6pt solid #CBD5E1; }
  .meta-grid > div { padding: 2.6mm 2.4mm 2.6mm 0; }
  .meta-grid .k { font: 700 6.4pt/1.2 var(--sans); letter-spacing: .6pt; text-transform: uppercase; color: var(--ink3); margin-bottom: 1mm; }
  .meta-grid .v { font-weight: 700; font-size: 9.2pt; }
  .duas { display: grid; grid-template-columns: 1fr 1fr; gap: 7mm; }
  table.stack th { width: 25mm; background: none; text-transform: none; letter-spacing: 0; font: 700 7.8pt/1.35 var(--sans); color: var(--ink); border-bottom: .6pt solid var(--linha); padding: 1.6mm 2mm 1.6mm 0; vertical-align: top; }
  table.stack td { font-size: 7.9pt; padding: 1.6mm 0; line-height: 1.38; }
  ul.escopo { margin: 0; padding-left: 4mm; font-size: 7.8pt; line-height: 1.4; }
  ul.escopo li { margin-bottom: .9mm; }
  table.metodo td { font-size: 7.8pt; line-height: 1.4; padding: 1.7mm 2.4mm 1.7mm 0; }
  table.metodo td.m-cat { width: 44mm; }
  table.metodo .catn { margin-right: 2mm; vertical-align: middle; }
  table.metodo .m-sub { display: block; color: var(--ink3); font-size: 7.1pt; margin: .5mm 0 0 7.4mm; }
  .nota-final { font-size: 7.5pt; color: var(--ink3); margin-top: 2.4mm; }

  /* resumo */
  .kpis { display: grid; grid-template-columns: repeat(5, 1fr); gap: 3mm; margin: 3.4mm 0 4mm; }
  .kpi { border: .6pt solid var(--linha); border-top: 2.4pt solid var(--k); border-radius: 2pt; padding: 2.2mm 3mm; }
  .kpi .n { font-size: 18pt; font-weight: 800; color: var(--k); line-height: 1; }
  .kpi .t { font-size: 7.3pt; color: var(--ink2); margin-top: 1.2mm; line-height: 1.3; }
  .graficos { display: grid; grid-template-columns: 62mm 1fr; gap: 5mm; margin-bottom: 1mm; align-items: start; }
  .chart { border: .6pt solid var(--linha); border-radius: 2pt; padding: 3mm 4mm; break-inside: avoid; }
  .chart-t { font-size: 7.4pt; font-weight: 700; text-transform: uppercase; letter-spacing: .6pt; color: var(--ink3); margin-bottom: 2mm; }
  svg.rosca { display: block; width: 33mm; height: 33mm; margin: 0 auto 2.4mm; }
  svg .r-num { font: 800 36px var(--sans); fill: #14285A; }
  svg .r-lbl { font: 600 10.5px var(--sans); fill: #64748B; letter-spacing: .4px; }
  ul.legenda { list-style: none; padding: 0; margin: 0; font-size: 7.9pt; }
  ul.legenda li { display: grid; grid-template-columns: 3.2mm 1fr 6mm 11mm; align-items: center; gap: 1.6mm; padding: .6mm 0; border-bottom: .5pt solid var(--linha); }
  ul.legenda li:last-child { border-bottom: 0; }
  .sw { width: 3.2mm; height: 3.2mm; border-radius: 1pt; display: inline-block; }
  .lg-n { text-align: right; font-weight: 800; }
  .lg-p { text-align: right; color: var(--ink3); }
  svg.barras { display: block; width: 100%; height: auto; }
  svg .grade { stroke: #E2E8F0; stroke-width: .7; }
  svg .tick { font: 500 8.5px var(--sans); fill: #94A3B8; }
  svg .cat-r { font: 700 10.2px var(--sans); fill: #0F172A; }
  svg .cat-s { font: 500 8.2px var(--sans); fill: #94A3B8; }
  svg .val { font: 800 9.5px var(--sans); fill: #0F172A; }
  svg .val-f { fill: #059669; }
  .leg-barras { display: flex; flex-wrap: wrap; gap: 1mm 3.4mm; font-size: 7.2pt; color: var(--ink2); margin-top: 2.4mm; }
  table.rubrica td { font-size: 8pt; padding: 1.4mm 1.6mm 1.4mm 0; line-height: 1.35; }
  table.rubrica td:first-child { width: 24mm; }
  .caixa { background: var(--suave); border: .6pt solid var(--linha); border-left: 2.4pt solid var(--azul); border-radius: 2pt; padding: 3mm 4mm 2mm; margin-top: 4mm; break-inside: avoid; }
  .caixa h3 { font-size: 8.8pt; margin-bottom: 2mm; }
  .caixa ul { margin: 0; padding-left: 4.2mm; font-size: 7.8pt; line-height: 1.4; }
  .caixa ul.colunas { columns: 2; column-gap: 8mm; }
  .caixa li { margin-bottom: 1.4mm; break-inside: avoid; }

  /* fortes e fracos */
  ol.fracos { list-style: none; counter-reset: f; padding: 0; margin: 0 0 6mm; }
  ol.fracos li { position: relative; padding: 2.2mm 2mm 2.2mm 9mm; border-bottom: .6pt solid var(--linha); counter-increment: f; }
  ol.fracos li::before { content: counter(f); position: absolute; left: 0; top: 2.1mm; width: 5.4mm; height: 5.4mm; border-radius: 50%; background: #B91C1C; color: #fff; font: 700 7.4pt/5.4mm var(--sans); text-align: center; }
  table.fortes col.k1 { width: 10mm; }
  table.fortes col.k3 { width: 60mm; }
  table.fortes td { border-bottom-color: #D1FAE5; }
  table.fortes .catn { background: #059669; }
  .pf-tit { font-weight: 700; color: #065F46; margin-bottom: .8mm; }
  .pf-txt { font-size: 8.3pt; color: var(--ink2); }

  /* referências e trechos */
  .ref { font-family: var(--mono); font-size: 7.2pt; line-height: 1.3; margin-bottom: 1.6mm; overflow-wrap: anywhere; }
  .ref-dir { display: block; color: var(--ink3); font-size: 6.5pt; }
  .ref-arq { color: var(--ink); font-weight: 600; }
  .ref-arq b { color: var(--azul); font-weight: 800; }
  .ref-livre { color: var(--ink2); }
  .ref-nota { font-size: 6.9pt; line-height: 1.3; color: var(--ink3); margin: -1mm 0 2mm; }
  .ref-nota code { font-size: .92em; }
  table.achados { margin-bottom: 6mm; }
  table.achados tr { break-inside: auto; }
  table.achados td p { orphans: 2; widows: 2; }
  table.achados col.k1 { width: 20mm; }
  table.achados col.k2 { width: 50mm; }
  table.achados td { font-size: 8.3pt; }
  .f-tit { font-weight: 700; font-size: 9pt; color: var(--ink); margin-bottom: 1.4mm; line-height: 1.35; }
  .fid { display: inline-block; font: 800 6.8pt/1 var(--mono); color: var(--azul); background: #E8EDF7; border-radius: 2pt; padding: 1.6pt 3pt; margin-right: 1.8mm; vertical-align: 1pt; }
  .f-sub { font-size: 8pt; color: var(--ink2); }
  .f-sub b { color: var(--ink); }
  figure.snip { margin: 1.6mm 0 2mm; border: .6pt solid var(--linha); border-left: 2pt solid var(--c); border-radius: 2pt; background: #FBFCFE; break-inside: avoid; }
  figure.snip figcaption { font: 600 6.4pt/1 var(--mono); color: var(--ink3); padding: 1.6mm 2.4mm 0; }
  figure.snip pre { margin: 0; padding: 1.2mm 2.4mm 1.7mm; font: 7.1pt/1.4 var(--mono); white-space: pre-wrap; overflow-wrap: anywhere; color: #0B1F4A; }
  .f-issue { font-size: 7pt; color: var(--ink3); margin: 0; }

  /* categorias */
  .cat { margin-bottom: 2mm; }
  .cat-h { display: flex; align-items: center; flex-wrap: wrap; gap: 2.4mm; margin: 3mm 0 2.4mm; break-after: avoid; }
  .cat-h h2 { font-size: 12.4pt; font-weight: 800; }
  .cat-sub { font-size: 8.4pt; font-weight: 500; color: var(--ink3); }
  .cat-cnt { margin-left: auto; display: inline-flex; align-items: center; gap: 1mm; }
  .cat-cnt .cnt { font: 800 8pt var(--sans); color: var(--ink); margin: 0 1.6mm 0 .6mm; }
  .cat-box { background: var(--suave); border: .6pt solid var(--linha); border-radius: 2pt; padding: 2.6mm 3.4mm; margin-bottom: 2.6mm; font-size: 8.4pt; break-inside: avoid; break-after: avoid; }
  .cat-box p:last-child { margin-bottom: 0; }
  .cobertura { color: var(--ink3); font-size: 7.8pt; }

  /* índice por arquivo */
  table.indice col.k1 { width: 26mm; }
  table.indice col.k2 { width: 11mm; }
  table.indice col.k3 { width: 23mm; }
  table.indice td { font-size: 7.8pt; padding: 1.5mm 2.2mm; line-height: 1.35; }
  table.indice tr.grupo td { background: #EEF2F7; font: 700 7.4pt var(--mono); color: var(--azul); padding: 1.5mm 2.2mm; border-bottom: 0; }
  table.indice tr.grupo { break-after: avoid; }
  table.indice td.lin { font-family: var(--mono); font-size: 7.2pt; overflow-wrap: anywhere; }
  td.id { font: 800 7.2pt var(--mono); color: var(--azul); }
  .ix-nota { color: var(--ink3); }

  /* recomendações e evidências */
  .rec { display: grid; grid-template-columns: 13mm 1fr; gap: 3.4mm; border: .6pt solid var(--linha); border-radius: 2pt; padding: 3mm 4mm 2.4mm 3mm; margin-bottom: 2.8mm; break-inside: avoid; }
  .rec .p { display: flex; align-items: center; justify-content: center; height: 10mm; border-radius: 2pt; background: var(--azul); color: #fff; font: 800 12pt/1 var(--sans); }
  .rec h3 { font-size: 9.6pt; margin-bottom: .8mm; }
  .rec .meta { font-size: 7.3pt; color: var(--ink3); margin-bottom: 1.6mm; }
  .rec ul { margin: 0; padding-left: 4.2mm; font-size: 8.2pt; }
  .rec li { margin-bottom: .8mm; }
  dl.evid { margin: 0; }
  dl.evid > div { display: grid; grid-template-columns: 9mm 42mm 1fr; gap: 2.4mm; padding: 2mm 0; border-bottom: .6pt solid var(--linha); font-size: 8pt; break-inside: avoid; }
  .e-id { font: 800 7.4pt var(--mono); color: var(--azul); }
  .e-tit { font-weight: 700; }

  /* issues */
  table.indice-issues { margin-bottom: 6mm; }
  table.indice-issues col.k1 { width: 8mm; }
  table.indice-issues col.k2 { width: 24mm; }
  table.indice-issues col.k4 { width: 44mm; }
  table.indice-issues td { font-size: 8pt; padding: 1.7mm 2.2mm; }
  .ix-ach { color: var(--ink3); font-size: 7.4pt !important; }
  .issue { margin-bottom: 6mm; }
  .issue-head { display: flex; align-items: center; gap: 2.6mm; padding: 2mm 3.2mm; background: var(--azul); color: #fff; border-radius: 2pt 2pt 0 0; font-size: 8.2pt; break-after: avoid; }
  .issue-head .t { font-weight: 700; }
  .issue-head .a { margin-left: auto; color: #C7D2FE; font-size: 7.4pt; }
  pre.issue-md { margin: 0; border: .6pt solid #CBD5E1; border-top: 0; border-radius: 0 0 2pt 2pt; padding: 3mm 3.4mm; font: 7.6pt/1.42 var(--mono); white-space: pre-wrap; overflow-wrap: anywhere; background: #FBFCFE; color: #0F172A; }
  `;
}

function montarHtml(issues) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>${esc(meta.titulo)}</title>
<style>${css()}</style>
</head>
<body>
${capa()}
${resumo()}
${fortesFracos()}
${detalhados()}
${indicePorArquivo()}
${recomendacoesHtml()}
${issuesHtml(issues)}
</body>
</html>`;
}

// ---------------------------------------------------------------- impressão (DevTools)
function acharNavegador() {
  const candidatos = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/microsoft-edge'
  ].filter(Boolean);
  const caminho = candidatos.find((c) => existsSync(c));
  if (!caminho) throw new Error('Chrome ou Edge não encontrado. Defina CHROME_PATH com o caminho do executável.');
  return caminho;
}

async function enderecoDevTools(perfil, proc) {
  const arquivo = join(perfil, 'DevToolsActivePort');
  for (let i = 0; i < 300; i += 1) {
    if (proc.exitCode !== null) throw new Error(`O navegador encerrou antes de abrir o DevTools (código ${proc.exitCode}).`);
    if (existsSync(arquivo)) {
      const [porta, caminho] = readFileSync(arquivo, 'utf8').split(/\r?\n/);
      if (porta && caminho) return `ws://127.0.0.1:${porta}${caminho}`;
    }
    await esperar(100);
  }
  throw new Error('O navegador não abriu o DevTools em 30 s.');
}

function conectar(url) {
  return new Promise((resolver, rejeitar) => {
    const ws = new WebSocket(url);
    const pendentes = new Map();
    const ouvintes = [];
    let seq = 0;
    ws.onerror = () => rejeitar(new Error('Falha ao conectar no DevTools do navegador.'));
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && pendentes.has(msg.id)) {
        const p = pendentes.get(msg.id);
        pendentes.delete(msg.id);
        if (msg.error) p.rejeitar(new Error(`${p.metodo}: ${msg.error.message}`));
        else p.resolver(msg.result);
        return;
      }
      for (let i = ouvintes.length - 1; i >= 0; i -= 1) {
        const o = ouvintes[i];
        if (o.metodo === msg.method && o.sessao === msg.sessionId) {
          ouvintes.splice(i, 1);
          o.resolver(msg.params);
        }
      }
    };
    ws.onopen = () => resolver({
      enviar(metodo, params = {}, sessao) {
        seq += 1;
        ws.send(JSON.stringify({ id: seq, method: metodo, params, ...(sessao ? { sessionId: sessao } : {}) }));
        return new Promise((ok, falha) => pendentes.set(seq, { resolver: ok, rejeitar: falha, metodo }));
      },
      evento(metodo, sessao) {
        return new Promise((ok) => ouvintes.push({ metodo, sessao, resolver: ok }));
      },
      fechar: () => ws.close()
    });
  });
}

export async function imprimirPdf(htmlPath, pdfPath) {
  const navegador = acharNavegador();
  const perfil = mkdtempSync(join(tmpdir(), 'dindin-relatorio-'));
  const proc = spawn(navegador, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--disable-extensions', '--remote-debugging-port=0', `--user-data-dir=${perfil}`, 'about:blank'
  ], { stdio: 'ignore' });
  try {
    const cdp = await conectar(await enderecoDevTools(perfil, proc));
    const { targetId } = await cdp.enviar('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp.enviar('Target.attachToTarget', { targetId, flatten: true });
    await cdp.enviar('Page.enable', {}, sessionId);
    const carregou = cdp.evento('Page.loadEventFired', sessionId);
    await cdp.enviar('Page.navigate', { url: pathToFileURL(htmlPath).href }, sessionId);
    await carregou;
    await cdp.enviar('Runtime.evaluate', { expression: 'document.fonts.ready.then(() => true)', awaitPromise: true }, sessionId);
    const { data } = await cdp.enviar('Page.printToPDF', {
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
      // Sem sumário (bookmarks): no Chrome 157 o sumário repete o texto dos h1 que abrem página.
      generateDocumentOutline: false,
      generateTaggedPDF: true
    }, sessionId);
    writeFileSync(pdfPath, Buffer.from(data, 'base64'));
    await cdp.enviar('Browser.close').catch(() => {});
    cdp.fechar();
  } finally {
    for (let i = 0; i < 50 && proc.exitCode === null; i += 1) await esperar(100);
    if (proc.exitCode === null) proc.kill();
    rmSync(perfil, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  }
}

export function contarPaginas(pdf) {
  return (pdf.toString('latin1').match(/\/Type\s*\/Page(?![a-zA-Z])/g) || []).length;
}

// ---------------------------------------------------------------- execução
// Só gera quando roda direto; importado (pelo gerar-relatorio-correcoes.mjs), só empresta as funções.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const issues = lerIssues();
  writeFileSync(SAIDA_HTML, montarHtml(issues), 'utf8');
  await imprimirPdf(SAIDA_HTML, SAIDA_PDF);
  const paginas = contarPaginas(readFileSync(SAIDA_PDF));
  console.log(`HTML: ${SAIDA_HTML}`);
  console.log(`PDF:  ${SAIDA_PDF} (${paginas} páginas, ${total} achados, ${pontosFortes.length} pontos fortes, ${issues.length} issues)`);
}
