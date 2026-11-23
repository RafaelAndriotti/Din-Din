#!/usr/bin/env node
// Gera o relatório de correções de segurança do Din-Din em PDF (A4, pt-BR): o que mudou no
// projeto para fechar os achados da auditoria. Par do relatório-auditoria-seguranca.pdf.
//
// Uso, na raiz do repositório:
//   node docs/security-audit/gerar-relatorio-correcoes.mjs
//
// Requisitos: os mesmos do gerar-relatorio.mjs (Node 22+ e Chrome ou Edge), de onde vêm o CSS,
// os helpers de texto e a impressão do PDF.
// Entradas: achados.mjs (os achados), correcoes.mjs (o que foi feito) e issues-github.md
// (critérios de aceite). Antes de gerar, confere se cada trecho citado em correcoes.mjs existe
// nas linhas indicadas do código; se não existir, para com erro.
// Saídas, nesta pasta: relatorio-correcoes-seguranca.html e relatorio-correcoes-seguranca.pdf.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { severidades, categorias, achados, observacoes, COR_PONTO_FORTE } from './achados.mjs';
import {
  ORDEM_SEV, NOME_CURTO, esc, inline, chip, plural, refArquivo, refTexto, trecho, css, lerIssues, imprimirPdf, contarPaginas
} from './gerar-relatorio.mjs';
import {
  meta, stackNova, escopo, estados, mudancasPorCategoria, correcoes, foraDoEscopo, fluxo, decisoes,
  limitacoes, arquivos, evidencias, passos, aceite
} from './correcoes.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, '..', '..');
const SAIDA_HTML = join(AQUI, 'relatorio-correcoes-seguranca.html');
const SAIDA_PDF = join(AQUI, 'relatorio-correcoes-seguranca.pdf');
const VERDE = COR_PONTO_FORTE;
const NUM = new Intl.NumberFormat('pt-BR');
const PERCENTUAL = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 });

// ---------------------------------------------------------------- números
const doEscopo = [...achados.filter((f) => f.sev !== 'info'), ...observacoes];
const informativos = achados.filter((f) => f.sev === 'info');
const contagem = Object.fromEntries(ORDEM_SEV.map((s) => [s, doEscopo.filter((f) => f.sev === s).length]));
const porCategoria = categorias.map((c) => ({
  ...c,
  ...mudancasPorCategoria[c.n],
  achadosCat: achados.filter((f) => f.cat === c.n),
  abertos: achados.filter((f) => f.cat === c.n && !correcoes[f.id])
}));
const linhasMais = arquivos.reduce((s, a) => s + a.mais, 0);
const linhasMenos = arquivos.reduce((s, a) => s + a.menos, 0);
const novos = arquivos.filter((a) => a.novo).length;

const estadoChip = (rotulo, cor) => `<span class="chip" style="--c:${cor}">${esc(rotulo)}</span>`;

// ---------------------------------------------------------------- conferência com o código
// "9-10,37-42" vira o conjunto {9, 10, 37, …, 42}.
function linhasDe(lin) {
  const numeros = new Set();
  for (const parte of String(lin).split(',')) {
    const [ini, fim = ini] = parte.split('-').map(Number);
    for (let n = ini; n <= fim; n += 1) numeros.add(n);
  }
  return numeros;
}

function conferir() {
  const erros = [];
  for (const f of doEscopo) if (!correcoes[f.id]) erros.push(`${f.id} (${f.sev}) não tem correção em correcoes.mjs`);
  for (const f of informativos) if (!foraDoEscopo[f.id]) erros.push(`${f.id} (informativo) não está em foraDoEscopo`);
  for (const id of Object.keys(correcoes)) if (!doEscopo.some((f) => f.id === id)) erros.push(`${id} não é um achado do escopo`);

  const refs = [
    ...Object.entries(correcoes).flatMap(([id, c]) => c.refs.map((r) => ({ id, ...r }))),
    ...fluxo.map((p) => ({ id: 'fluxo', arq: p.onde.split(':')[0], lin: p.onde.split(':')[1] })),
    ...arquivos.map((a) => ({ id: 'arquivos', arq: a.arq, lin: '1' }))
  ];
  for (const r of refs) {
    const caminho = join(RAIZ, r.arq);
    if (!existsSync(caminho)) { erros.push(`${r.id}: ${r.arq} não existe`); continue; }
    const linhas = readFileSync(caminho, 'utf8').replace(/\r\n/g, '\n').split('\n');
    const pedidas = linhasDe(r.lin);
    const maior = Math.max(...pedidas);
    if (maior > linhas.length) { erros.push(`${r.id}: ${r.arq} tem ${linhas.length} linhas, a referência pede a ${maior}`); continue; }
    const intervalo = [...pedidas].map((n) => linhas[n - 1]);
    for (const l of r.trecho ?? []) {
      const t = l.trim();
      if (t && t !== '…' && !intervalo.some((linha) => linha.includes(t))) erros.push(`${r.id}: "${t}" não está em ${r.arq}:${r.lin}`);
    }
  }
  if (erros.length) throw new Error(`correcoes.mjs não confere com o código:\n- ${erros.join('\n- ')}`);
}

// Critérios de aceite de uma issue: as linhas "- [ ] …" e as continuações indentadas logo abaixo.
function lerCriterios(bloco) {
  const secao = bloco.split(/^## Critérios de aceite$/m)[1] ?? '';
  const lista = [];
  let continua = false;
  for (const linha of secao.split('\n')) {
    if (linha.startsWith('- [ ] ')) { lista.push(linha.slice(6)); continua = true; }
    else if (continua && /^\s+\S/.test(linha)) lista[lista.length - 1] += ` ${linha.trim()}`;
    else continua = false;
  }
  return lista;
}

// ---------------------------------------------------------------- gráficos (SVG)
function graficoRosca() {
  const total = doEscopo.length;
  const R = 54, E = 22, C = 2 * Math.PI * R, cx = 80, cy = 80;
  const presentes = ORDEM_SEV.filter((s) => contagem[s] > 0);
  let acumulado = 0;
  const fatias = presentes.map((s) => {
    const comprimento = (contagem[s] / total) * C;
    const el = `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${severidades[s].cor}" stroke-width="${E}"`
      + ` stroke-dasharray="${(comprimento - 1.6).toFixed(2)} ${C.toFixed(2)}" stroke-dashoffset="${(-acumulado).toFixed(2)}"`
      + ` transform="rotate(-90 ${cx} ${cy})"/>`;
    acumulado += comprimento;
    return el;
  }).join('');
  const legenda = presentes.map((s) => `<li><span class="sw" style="background:${severidades[s].cor}"></span>`
    + `<span>${severidades[s].rotulo}</span><span class="lg-n">${contagem[s]}</span>`
    + `<span class="lg-p">${PERCENTUAL.format(contagem[s] / total)}</span></li>`).join('');
  const descricao = presentes.map((s) => `${severidades[s].rotulo}: ${contagem[s]}`).join(', ');
  return `<div class="chart">
    <h3 class="chart-t">Itens corrigidos por severidade</h3>
    <svg viewBox="0 0 160 160" class="rosca" role="img" aria-label="${esc(`${total} corrigidos. ${descricao}`)}">
      <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#EEF2F7" stroke-width="${E}"/>
      ${fatias}
      <text x="${cx}" y="${cy + 9}" text-anchor="middle" class="r-num">${total}</text>
      <text x="${cx}" y="${cy + 25}" text-anchor="middle" class="r-lbl">corrigidos</text>
    </svg>
    <ul class="legenda">${legenda}</ul>
  </div>`;
}

function graficoAntesDepois() {
  const W = 352, rotuloW = 132, x0 = rotuloW + 8, barraW = W - x0 - 22, linhaH = 42, topo = 6, altBarra = 13;
  const maximo = Math.max(...porCategoria.map((c) => c.achadosCat.length));
  const escala = (v) => (v / maximo) * barraW;
  const baseY = topo + porCategoria.length * linhaH;
  const barra = (lista, y) => {
    let x = x0, svg = '';
    for (const s of ORDEM_SEV) {
      const n = lista.filter((f) => f.sev === s).length;
      if (!n) continue;
      svg += `<rect x="${x.toFixed(2)}" y="${y}" width="${(escala(n) - 0.9).toFixed(2)}" height="${altBarra}" rx="1.6" fill="${severidades[s].cor}"/>`;
      x += escala(n);
    }
    return { svg, x };
  };
  let svg = '';
  for (let v = 0; v <= maximo; v += 1) {
    const x = x0 + escala(v);
    svg += `<line x1="${x}" y1="${topo - 2}" x2="${x}" y2="${baseY - 6}" class="grade"/>`;
    svg += `<text x="${x}" y="${baseY + 6}" text-anchor="middle" class="tick">${v}</text>`;
  }
  porCategoria.forEach((c, i) => {
    const y = topo + i * linhaH;
    svg += `<text x="${rotuloW}" y="${y + 13}" text-anchor="end" class="cat-r">${c.n}. ${esc(NOME_CURTO[c.n])}</text>`;
    svg += `<text x="${rotuloW}" y="${y + 29}" text-anchor="end" class="cat-s">antes · depois</text>`;
    const antes = barra(c.achadosCat, y + 3);
    svg += `${antes.svg}<text x="${(antes.x + 4).toFixed(2)}" y="${y + 13.5}" class="val">${c.achadosCat.length}</text>`;
    const depois = barra(c.abertos, y + 19);
    svg += `${depois.svg}<text x="${(depois.x + 4).toFixed(2)}" y="${y + 29.5}" class="val${c.abertos.length ? '' : ' val-f'}">${c.abertos.length}</text>`;
  });
  const descricao = porCategoria.map((c) => `${NOME_CURTO[c.n]}: ${c.achadosCat.length} antes, ${c.abertos.length} depois`).join('; ');
  const legenda = ORDEM_SEV.map((s) => `<span><i style="background:${severidades[s].cor}"></i>${severidades[s].rotulo}</span>`).join('');
  return `<div class="chart">
    <h3 class="chart-t">Achados abertos por categoria: antes e depois</h3>
    <svg viewBox="0 0 ${W} ${baseY + 12}" class="barras" role="img" aria-label="${esc(descricao)}">${svg}</svg>
    <div class="leg-barras">${legenda}<span class="leg-nota">Depois: só os informativos, fora do escopo.</span></div>
  </div>`;
}

// ---------------------------------------------------------------- blocos
function linhaCorrecao(f) {
  const c = correcoes[f.id];
  const refs = c.refs.map((r) => refArquivo(r.arq, r.lin) + (r.nota ? `<div class="ref-nota">${inline(r.nota)}</div>` : '')).join('');
  const corpo = [
    `<div class="f-tit"><span class="fid">${f.id}</span>${inline(f.titulo)}</div>`,
    `<p>${inline(c.feito)}</p>`,
    `<p class="f-sub"><b>Por que assim:</b> ${inline(c.porque)}</p>`,
    c.refs.map((r) => trecho(r, VERDE)).join(''),
    `<p class="f-sub"><b>Como foi verificado:</b> ${inline(c.verificacao)}</p>`,
    c.acaoLocal ? `<div class="acao"><b>Falta na sua máquina:</b> ${inline(c.acaoLocal)}</div>` : ''
  ].join('');
  return `<tr><td class="c-sev"><div class="selos">${chip(f.sev)}<div class="est">${estadoChip('Corrigido', VERDE)}</div></div></td><td class="c-ref">${refs}</td><td class="c-desc">${corpo}</td></tr>`;
}

const tabelaCorrecoes = (lista) => `<table class="achados">
  <colgroup><col class="k1"><col class="k2"><col></colgroup>
  <thead><tr><th>Severidade</th><th>Arquivo:linha (código novo)</th><th>Achado da auditoria e correção</th></tr></thead>
  <tbody>${lista.map(linhaCorrecao).join('')}</tbody>
</table>`;

function capa() {
  const presentes = ORDEM_SEV.filter((s) => contagem[s] > 0);
  const faixa = presentes.map((s) => `<span style="flex:${contagem[s]};background:${severidades[s].cor}">${contagem[s]}</span>`).join('')
    + `<span class="faixa-fora" style="flex:${informativos.length}">${informativos.length}</span>`;
  const faixaLegenda = presentes.map((s) => {
    const rotulo = severidades[s].rotulo.toLowerCase();
    return `<span><i style="background:${severidades[s].cor}"></i>${plural(contagem[s], `${rotulo} corrigida`, `${rotulo}s corrigidas`)}</span>`;
  }).join('')
    + `<span><i class="i-fora"></i>${plural(informativos.length, 'informativa fora do escopo', 'informativas fora do escopo')}</span>`;
  return `<section class="capa capa-c">
    <div class="kicker">Correções da auditoria de segurança · 5 categorias</div>
    <h1>${esc(meta.titulo).replace(esc(meta.projeto), `<span class="nw">${esc(meta.projeto)}</span>`)}</h1>
    <p class="sub">${esc(meta.subtitulo)}</p>
    <div class="faixa" aria-hidden="true">${faixa}</div>
    <div class="faixa-leg">${faixaLegenda}</div>
    <div class="meta-grid">
      <div><div class="k">Data</div><div class="v">${esc(meta.data)}</div></div>
      <div><div class="k">Branch</div><div class="v">${esc(meta.branch)}</div></div>
      <div><div class="k">Versão auditada</div><div class="v">${esc(meta.base)}</div></div>
      <div><div class="k">Alterações</div><div class="v">${arquivos.length} arquivos · +${NUM.format(linhasMais)} −${NUM.format(linhasMenos)}</div></div>
    </div>
    <div class="duas">
      <div>
        <h3 class="mini">O que entrou no projeto</h3>
        <table class="stack">${stackNova.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${inline(v)}</td></tr>`).join('')}</table>
      </div>
      <div>
        <h3 class="mini">Escopo das correções</h3>
        <ul class="escopo">${escopo.map((e) => `<li>${inline(e)}</li>`).join('')}</ul>
      </div>
    </div>
    <h3 class="mini">Como ler este relatório</h3>
    <p class="como-ler">Cada achado mantém o ID e a severidade da auditoria (F01–F16, O1–O4), e as referências de arquivo e linha apontam para o código novo. A seção 1 resume o antes e o depois de cada categoria, e a 2 mostra o caminho de uma requisição depois das correções e as decisões de desenho. As seções 3 e 4 explicam cada correção: o que mudou, por que desse jeito e como foi verificado. A 5 lista cada arquivo alterado, a 6 o que ficou de fora, a 7 as verificações, a 8 como aplicar na sua máquina, e a 9 confere os critérios de aceite das 8 issues.</p>
  </section>`;
}

function resumo() {
  const criticasAltas = contagem.critica + contagem.alta;
  const achadosCorrigidos = doEscopo.length - observacoes.length;
  const kpis = [
    [String(doEscopo.length), `itens corrigidos: ${achadosCorrigidos} achados e ${observacoes.length} observações`, '#14285A'],
    [`${criticasAltas}/${criticasAltas}`, 'achados críticos e altos fechados', VERDE],
    [String(meta.testes), `testes passando em ${meta.arquivosTeste} arquivos; antes, 2 falhavam`, '#14285A'],
    [String(meta.verificacoesApi + meta.verificacoesUi), 'verificações com Postgres, API e navegador reais', VERDE],
    [String(informativos.length), 'informativos fora do escopo', severidades.info.cor]
  ];
  const linhas = porCategoria.map((c) => {
    const resta = c.abertos.length
      ? `<span class="resta">${c.abertos.length}</span><small>informativos</small>`
      : `<span class="zero">0</span>`;
    return `<tr><td class="m-cat"><span class="catn">${c.n}</span><b>${esc(NOME_CURTO[c.n])}</b></td><td>${inline(c.antes)}</td><td>${inline(c.depois)}</td><td class="ad-n">${c.achadosCat.length} → ${resta}</td></tr>`;
  }).join('');
  return `<section class="pagina">
    <h1 class="sec" data-num="1">Resumo executivo</h1>
    <p class="lead">A auditoria apontou uma causa raiz: a API não tinha autenticação nem dono dos dados. A correção atacou essa causa primeiro e, sobre ela, fechou o resto. <strong>Agora toda rota fora de <code>/auth</code> exige um token, toda query de despesas e categorias filtra pelo dono do token, e o registro de outra pessoa responde 404.</strong> Por baixo, entraram as duas camadas que faltavam: a API conecta ao banco com uma role sem superusuário, e API e Postgres só aceitam conexões da própria máquina. A configuração é validada no boot, os erros não vazam detalhes internos, e as listagens têm paginação e rate limit. Os ${doEscopo.length} itens do escopo foram corrigidos e verificados com testes automatizados, com Postgres real e no navegador. Ficaram de fora os dois informativos (F15 e F16), que não são exploráveis hoje.</p>
    <div class="kpis">${kpis.map(([n, t, cor]) => `<div class="kpi" style="--k:${cor}"><div class="n">${n}</div><div class="t">${esc(t)}</div></div>`).join('')}</div>
    <div class="graficos">${graficoRosca()}${graficoAntesDepois()}</div>
    <h3 class="mini">Antes e depois, por categoria</h3>
    <table class="antes-depois">
      <colgroup><col class="k1"><col><col><col class="k4"></colgroup>
      <thead><tr><th>Categoria</th><th>Antes</th><th>Depois</th><th>Abertos</th></tr></thead>
      <tbody>${linhas}</tbody>
    </table>
    <div class="caixa">
      <h3>Falta na sua máquina</h3>
      <ul class="colunas">
        <li>Completar o <code>.env</code> com <code>APP_DB_USER</code>, <code>APP_DB_PASSWORD</code> e <code>JWT_SECRET</code>: sem eles, a API não sobe.</li>
        <li>Recriar o contêiner do banco, que hoje ainda está publicado em <code>0.0.0.0:5434</code>.</li>
        <li>Rodar o <code>init.sql</code> novo, que cria a tabela de usuários, a coluna de dono e a role da API.</li>
        <li>Criar a conta na tela de login e, se havia despesas, rodar a <code>migracao-001</code> com o seu e-mail. Passo a passo na seção 8.</li>
      </ul>
    </div>
  </section>`;
}

function arquitetura() {
  const linhas = fluxo.map((p, i) => `<tr>
      <td class="fx-n"><span class="catn">${i + 1}</span></td>
      <td><div class="fx-c">${inline(p.camada)}</div>${refTexto(p.onde)}</td>
      <td>${inline(p.texto)}</td>
      <td class="fx-i">${esc(p.itens)}</td>
    </tr>`).join('');
  return `<section>
    <h1 class="sec sec-cont" data-num="2">Como uma requisição passa agora</h1>
    <p>A ordem dos middlewares é a tranca. Uma requisição a <code>/despesas</code> ou <code>/categorias</code> atravessa todas as camadas abaixo, e cada uma recusa cedo o que não deveria seguir. <code>/auth</code> sai no passo 3 e não chega ao passo 4.</p>
    <table class="fluxo">
      <colgroup><col class="k1"><col class="k2"><col><col class="k4"></colgroup>
      <thead><tr><th>#</th><th>Camada e arquivo</th><th>O que faz</th><th>Fecha</th></tr></thead>
      <tbody>${linhas}</tbody>
    </table>
    <h2 class="sub-sec">Decisões de desenho, e por quê</h2>
    <dl class="decisoes">${decisoes.map((d) => `<div><dt>${inline(d.titulo)}</dt><dd>${inline(d.texto)}</dd></div>`).join('')}</dl>
  </section>`;
}

function detalhados() {
  const blocos = porCategoria.map((c) => {
    const corrigidos = c.achadosCat.filter((f) => correcoes[f.id]);
    const resumoCat = ORDEM_SEV.filter((s) => corrigidos.some((f) => f.sev === s))
      .map((s) => `${chip(s)}<span class="cnt">${corrigidos.filter((f) => f.sev === s).length}</span>`).join(' ');
    const corpo = corrigidos.length
      ? tabelaCorrecoes(corrigidos)
      : `<p class="mini-nota">Os ${c.achadosCat.length} achados desta categoria são informativos e ficaram fora do escopo: veja a seção 6.</p>`;
    return `<div class="cat${corrigidos.length ? '' : ' curta'}">
      <div class="cat-h"><span class="catn grande">${c.n}</span><h2>${esc(c.nome)}</h2><span class="cat-sub">${esc(c.sub)}</span><span class="cat-cnt">${resumoCat}</span></div>
      <div class="cat-box ad">
        <div><div class="k">Antes</div>${inline(c.antes)}</div>
        <div><div class="k dep">Depois</div>${inline(c.depois)}</div>
      </div>
      ${corpo}
    </div>`;
  }).join('');
  return `<section class="pagina">
    <h1 class="sec" data-num="3">Correções detalhadas por categoria</h1>
    <p>Em cada linha, o título é o achado como a auditoria o descreveu. Abaixo dele: o que mudou, por que desse jeito, o código novo e como foi verificado. Os códigos E1–E10 remetem à seção 7.</p>
    ${blocos}
    <h1 class="sec sec-cont" data-num="4">Observações fora das cinco categorias</h1>
    <p>As quatro observações da auditoria, todas de severidade baixa, também foram corrigidas.</p>
    ${tabelaCorrecoes(observacoes)}
  </section>`;
}

function arquivosHtml() {
  let grupoAtual = '';
  const linhas = arquivos.map((a) => {
    const grupo = a.grupo !== grupoAtual ? `<tr class="grupo"><td colspan="4">${esc(a.grupo)}</td></tr>` : '';
    grupoAtual = a.grupo;
    return `${grupo}<tr>
      <td>${refArquivo(a.arq)}${a.novo ? '<span class="novo">novo</span>' : ''}</td>
      <td class="ar-n"><span class="mais">+${a.mais}</span> <span class="menos">−${a.menos}</span></td>
      <td class="id">${esc(a.itens)}</td>
      <td>${inline(a.texto)}</td>
    </tr>`;
  }).join('');
  return `<section class="pagina">
    <h1 class="sec" data-num="5">Alterações por arquivo</h1>
    <p>${arquivos.length} arquivos fora desta pasta: ${novos} novos e ${arquivos.length - novos} alterados, com ${NUM.format(linhasMais)} linhas adicionadas e ${NUM.format(linhasMenos)} removidas (<code>git diff --numstat</code>).</p>
    <table class="indice arquivos">
      <colgroup><col class="k1"><col class="k2"><col class="k3"><col></colgroup>
      <thead><tr><th>Arquivo</th><th>Linhas</th><th>Itens</th><th>O que mudou</th></tr></thead>
      <tbody>${linhas}</tbody>
    </table>
    <p class="mini-nota">Nesta pasta, <code>gerar-relatorio.mjs</code> passou a exportar os helpers, o CSS e a impressão, e o HTML da auditoria sai idêntico, byte a byte. Entraram <code>correcoes.mjs</code> (os dados deste relatório), <code>gerar-relatorio-correcoes.mjs</code> e este relatório em HTML e PDF.</p>
  </section>`;
}

function foraHtml() {
  const linhas = informativos.map((f) => {
    const x = foraDoEscopo[f.id];
    return `<tr>
      <td class="c-sev"><div class="selos">${chip(f.sev)}<div class="est">${estadoChip(x.situacao, x.cor)}</div></div></td>
      <td class="c-desc"><div class="f-tit"><span class="fid">${f.id}</span>${inline(f.titulo)}</div><p>${inline(x.texto)}</p><p class="f-sub"><b>O que falta:</b> ${inline(x.falta)}</p></td>
    </tr>`;
  }).join('');
  return `<section>
    <h1 class="sec sec-cont" data-num="6">Fora do escopo e limitações conhecidas</h1>
    <h2 class="sub-sec">Os informativos</h2>
    <table class="achados fora">
      <colgroup><col class="k1"><col></colgroup>
      <thead><tr><th>Severidade</th><th>Achado e situação</th></tr></thead>
      <tbody>${linhas}</tbody>
    </table>
    <h2 class="sub-sec">Limitações das correções</h2>
    <p>Escolhas conscientes, com o limite de cada uma e quando revisar. Nenhuma reabre um achado da auditoria.</p>
    <ol class="fracos limites">${limitacoes.map((l) => `<li>${inline(l)}</li>`).join('')}</ol>
  </section>`;
}

function evidenciasHtml() {
  const evid = evidencias.map((e) => `<div><span class="e-id">${e.id}</span><span class="e-tit">${inline(e.titulo)}</span><span>${inline(e.texto)}</span></div>`).join('');
  return `<section>
    <h1 class="sec sec-cont" data-num="7">Evidências de verificação</h1>
    <p>Executadas nesta máquina, em 23/11/2026. Banco e APIs de teste rodaram em contêineres e portas descartáveis, com segredos aleatórios. O seu banco <code>postgres-dev</code> e o seu <code>.env</code> não foram usados.</p>
    <dl class="evid">${evid}</dl>
  </section>`;
}

function aplicarHtml() {
  const cards = passos.map((p, i) => `<div class="rec">
      <div class="p">${i + 1}</div>
      <div>
        <h3>${inline(p.titulo)}</h3>
        <p>${inline(p.texto)}</p>
        ${p.cmd ? `<pre class="cmd">${esc(p.cmd)}</pre>` : ''}
      </div>
    </div>`).join('');
  return `<section class="pagina">
    <h1 class="sec" data-num="8">Como aplicar na sua máquina</h1>
    <p>Na raiz do repositório, nesta ordem. O banco existente não perde dados: o <code>init.sql</code> só acrescenta tabelas, colunas e permissões.</p>
    ${cards}
  </section>`;
}

function aceiteHtml(issues) {
  const todos = [];
  const blocos = issues.map((i) => {
    const criterios = lerCriterios(i.bloco);
    const status = aceite[i.n] ?? [];
    if (status.length !== criterios.length) {
      throw new Error(`Issue ${i.n}: issues-github.md tem ${criterios.length} critérios de aceite, correcoes.mjs tem ${status.length}.`);
    }
    const linhas = criterios.map((texto, k) => {
      const [estado, como] = status[k];
      if (!estados[estado]) throw new Error(`Issue ${i.n}: estado desconhecido "${estado}".`);
      todos.push(estado);
      return `<tr><td>${estadoChip(estados[estado].rotulo, estados[estado].cor)}</td><td>${inline(texto)}</td><td class="ac-como">${inline(como)}</td></tr>`;
    }).join('');
    return `<div class="issue">
      <div class="issue-head">${chip(i.sev)}<span class="t">Issue ${i.n}</span><span class="a">${esc(i.achados)}</span></div>
      <div class="issue-tit">${inline(i.titulo)}</div>
      <table class="aceite">
        <colgroup><col class="k1"><col><col class="k3"></colgroup>
        <tbody>${linhas}</tbody>
      </table>
    </div>`;
  }).join('');
  const resumoEstados = Object.keys(estados).filter((e) => todos.includes(e))
    .map((e) => `${estadoChip(estados[e].rotulo, estados[e].cor)}<span class="cnt">${todos.filter((x) => x === e).length}</span>`).join('');
  return `<section class="pagina">
    <h1 class="sec" data-num="9">Critérios de aceite das issues</h1>
    <p>Os ${todos.length} critérios das 8 issues de <code>issues-github.md</code>, com o texto original, a situação de cada um e como foi verificado. As issues podem ser fechadas com estes critérios marcados; os parciais dependem dos testes de integração (M1), e os da issue 7 ficaram fora do escopo.</p>
    <div class="resumo-aceite">${resumoEstados}</div>
    ${blocos}
  </section>`;
}

// ---------------------------------------------------------------- documento
const cssExtra = `
  .capa-c .kicker { color: #059669; }
  .faixa .faixa-fora { background: #CBD5E1; color: #334155; }
  .faixa-leg i.i-fora { background: #CBD5E1; }
  .como-ler { font-size: 8pt; color: var(--ink2); line-height: 1.45; }
  td.c-sev .est { margin-top: 1.4mm; }
  .selos, .ref, .cat-h, .cat.curta { break-inside: avoid; }
  .acao { background: #EFF6FF; border: .6pt solid #BFDBFE; border-left: 2.4pt solid #2563EB; border-radius: 2pt; padding: 1.8mm 2.6mm; font-size: 7.9pt; color: var(--ink2); margin: 1.4mm 0 .6mm; break-inside: avoid; }
  .acao b { color: #1E3A8A; }
  .cat-box.ad { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; }
  .ad .k { font: 700 6.6pt/1.2 var(--sans); letter-spacing: .6pt; text-transform: uppercase; color: var(--ink3); margin-bottom: 1mm; }
  .ad .k.dep { color: #059669; }
  .leg-nota { color: var(--ink3); }
  table.antes-depois { margin-bottom: 1mm; }
  table.antes-depois col.k1 { width: 34mm; }
  table.antes-depois col.k4 { width: 20mm; }
  table.antes-depois td { font-size: 7.8pt; line-height: 1.4; padding: 1.8mm 2.2mm; }
  table.antes-depois td.m-cat { font-size: 7.9pt; }
  table.antes-depois .catn { margin-right: 1.6mm; vertical-align: middle; }
  .ad-n { font: 800 9pt var(--sans); white-space: nowrap; text-align: right; }
  .ad-n .zero { color: #059669; }
  .ad-n .resta { color: #64748B; }
  .ad-n small { display: block; font: 500 6.4pt var(--sans); color: var(--ink3); }
  table.fluxo col.k1 { width: 10mm; }
  table.fluxo col.k2 { width: 58mm; }
  table.fluxo col.k4 { width: 25mm; }
  table.fluxo td { font-size: 8.1pt; padding: 2mm 2.2mm; }
  table.fluxo .ref { margin-bottom: 0; }
  .fx-c { font-weight: 700; margin-bottom: .8mm; }
  .fx-i { font: 700 7pt/1.35 var(--mono); color: var(--azul); }
  dl.decisoes { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm; margin: 0; }
  dl.decisoes > div { border: .6pt solid var(--linha); border-left: 2.4pt solid var(--azul); border-radius: 2pt; padding: 2.4mm 3mm; break-inside: avoid; }
  dl.decisoes dt { font-weight: 700; color: var(--azul); font-size: 8.6pt; margin-bottom: 1mm; }
  dl.decisoes dd { margin: 0; font-size: 8pt; color: var(--ink2); line-height: 1.42; }
  table.arquivos col.k1 { width: 64mm; }
  table.arquivos col.k2 { width: 17mm; }
  table.arquivos col.k3 { width: 28mm; }
  table.arquivos .ref { margin-bottom: 0; }
  .novo { display: inline-block; font: 700 5.8pt/1 var(--sans); text-transform: uppercase; letter-spacing: .4pt; color: #065F46; background: #D1FAE5; border-radius: 2pt; padding: 1.2pt 3pt; margin-top: .8mm; }
  .ar-n { font: 600 7.2pt var(--mono); white-space: nowrap; }
  .mais { color: #059669; }
  .menos { color: #B91C1C; }
  table.fora col.k1 { width: 24mm; }
  ol.limites li::before { background: #D97706; }
  pre.cmd { margin: 1.6mm 0 0; padding: 1.8mm 2.4mm; font: 7.3pt/1.45 var(--mono); white-space: pre-wrap; overflow-wrap: anywhere; background: #0F172A; color: #E2E8F0; border-radius: 2pt; }
  .rec p { font-size: 8.2pt; margin-bottom: 0; color: var(--ink2); }
  .resumo-aceite { display: flex; flex-wrap: wrap; align-items: center; gap: 1.2mm; margin: 0 0 5mm; }
  .resumo-aceite .cnt { font: 800 8.4pt var(--sans); color: var(--ink); margin: 0 3mm 0 .6mm; }
  .issue { break-inside: auto; }
  .issue-tit { font-weight: 700; font-size: 8.6pt; padding: 2mm 3.2mm; border: .6pt solid #CBD5E1; border-top: 0; background: var(--suave); break-after: avoid; }
  table.aceite { border: .6pt solid #CBD5E1; border-top: 0; }
  table.aceite col.k1 { width: 30mm; }
  table.aceite col.k3 { width: 68mm; }
  table.aceite td { font-size: 7.9pt; padding: 1.7mm 2.2mm; line-height: 1.38; }
  td.ac-como { color: var(--ink2); font-size: 7.4pt; }
`;

function montarHtml(issues) {
  const estilo = css({
    topoEsq: meta.titulo,
    topoDir: `${meta.data} · ${meta.branch}`,
    rodapeEsq: `${meta.projeto} · correções da auditoria de segurança`
  });
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>${esc(meta.titulo)}</title>
<style>${estilo}${cssExtra}</style>
</head>
<body>
${capa()}
${resumo()}
${arquitetura()}
${detalhados()}
${arquivosHtml()}
${foraHtml()}
${evidenciasHtml()}
${aplicarHtml()}
${aceiteHtml(issues)}
</body>
</html>`;
}

// ---------------------------------------------------------------- execução
conferir();
const issues = lerIssues();
writeFileSync(SAIDA_HTML, montarHtml(issues), 'utf8');
await imprimirPdf(SAIDA_HTML, SAIDA_PDF);
const paginas = contarPaginas(readFileSync(SAIDA_PDF));
console.log(`HTML: ${SAIDA_HTML}`);
console.log(`PDF:  ${SAIDA_PDF} (${paginas} páginas, ${doEscopo.length} itens corrigidos, ${informativos.length} fora do escopo, ${arquivos.length} arquivos)`);
