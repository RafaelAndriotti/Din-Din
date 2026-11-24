import React, { useEffect, useRef, useState } from 'react';
import { X, Plus, Minus, CircleAlert } from 'lucide-react';
import useDialog from '../hooks/useDialog';
import ChipGroup from './ChipGroup';
import { formatDecimal, formatParcelas, parseValor } from '../utils/format';
import {
  CATEGORIAS_ENTRADA,
  CATEGORIAS_PADRAO,
  LIMITES,
  METODOS_PAGAMENTO,
  ROTULOS_METODO,
  ROTULOS_STATUS,
  ROTULOS_STATUS_ENTRADA,
  corDaCategoria,
  isCartaoCredito,
  isEntrada,
  normalizarMetodo,
  normalizarStatus,
  statusPadrao
} from '../utils/despesas';
import { rotuloMes } from '../utils/meses';

const OUTRA = '__outra__';
const ULTIMO_METODO_KEY = 'dindin:ultimoMetodo';
const MAX_CHIPS_CATEGORIA = 6;
const MAX_PARCELAS = LIMITES.parcelasMax;

// Mensagens amigáveis para campos recusados pelo backend (400 do Zod).
// Os textos do Zod (em inglês, técnicos) não vão para a tela.
const ERRO_SERVIDOR_POR_CAMPO = {
  descricao: `O servidor recusou a descrição. Use de 1 a ${LIMITES.descricao} caracteres.`,
  valor: 'O servidor recusou o valor. Use de R$ 0,01 a R$ 10.000,00, com até 2 casas.',
  categoria: `O servidor recusou a categoria. Use até ${LIMITES.categoria} caracteres.`,
  metodoPagamento: 'O servidor recusou a forma de pagamento. Escolha PIX, débito ou crédito.',
  parcelas: 'O servidor recusou o número de parcelas.',
  status: 'O servidor recusou o status.',
  tipo: 'O servidor recusou o tipo. Escolha entrada ou saída.',
  mes: 'O servidor recusou o mês do lançamento.'
};

const TIPOS = [
  { value: 'SAIDA', label: 'Saída' },
  { value: 'ENTRADA', label: 'Entrada' }
];

function lerUltimoMetodo() {
  try {
    // Aceita também valores antigos salvos ("Cartão de Crédito").
    return normalizarMetodo(localStorage.getItem(ULTIMO_METODO_KEY)) || 'PIX';
  } catch {
    return 'PIX';
  }
}

function salvarUltimoMetodo(metodo) {
  try {
    localStorage.setItem(ULTIMO_METODO_KEY, metodo);
  } catch {
    // localStorage indisponível (modo privado): só não lembramos o método.
  }
}

// As categorias mais usadas primeiro, até 6 chips. Na edição, a categoria atual sempre aparece.
// Entradas têm sugestões próprias (salário, freelance...) e contam só o uso entre entradas.
function montarCategorias(tipo, categoriasApi, lancamentos, atual) {
  const entrada = tipo === 'ENTRADA';
  const despesas = lancamentos.filter((d) => isEntrada(d) === entrada);
  let base = categoriasApi.length > 0 ? categoriasApi.map((c) => c.nome) : CATEGORIAS_PADRAO;
  if (entrada) base = CATEGORIAS_ENTRADA;
  const uso = new Map();
  despesas.forEach((d) => {
    if (d.categoria) uso.set(d.categoria.toLowerCase(), (uso.get(d.categoria.toLowerCase()) || 0) + 1);
  });

  const vistos = new Set();
  const nomes = [];
  [...base, ...despesas.map((d) => d.categoria)].forEach((nome) => {
    if (!nome || vistos.has(nome.toLowerCase())) return;
    vistos.add(nome.toLowerCase());
    nomes.push(nome);
  });

  const ranking = nomes
    .map((nome, i) => ({ nome, i, n: uso.get(nome.toLowerCase()) || 0 }))
    .sort((a, b) => b.n - a.n || a.i - b.i)
    .slice(0, MAX_CHIPS_CATEGORIA)
    .map((x) => x.nome);

  if (atual && !ranking.some((n) => n.toLowerCase() === atual.toLowerCase())) ranking.push(atual);
  return ranking;
}

function montarRankings(categoriasApi, lancamentos, despesa) {
  const atual = despesa?.categoria;
  return {
    SAIDA: montarCategorias('SAIDA', categoriasApi, lancamentos, isEntrada(despesa) ? null : atual),
    ENTRADA: montarCategorias('ENTRADA', categoriasApi, lancamentos, isEntrada(despesa) ? atual : null)
  };
}

// Entrada nova nasce "recebida"; saída segue a forma de pagamento.
function statusInicial(tipo, metodo) {
  return tipo === 'ENTRADA' ? 'PAGO' : statusPadrao(metodo);
}

function estadoInicial(despesa, rankings, tipoNovo = 'SAIDA') {
  if (despesa) {
    const categoriasChips = rankings[isEntrada(despesa) ? 'ENTRADA' : 'SAIDA'];
    return {
      tipo: isEntrada(despesa) ? 'ENTRADA' : 'SAIDA',
      valor: formatDecimal(despesa.valor),
      descricao: despesa.descricao || '',
      categoria: despesa.categoria || categoriasChips[0] || OUTRA,
      outraCategoria: '',
      // Método antigo sem equivalente (ex.: "Boleto") deixa o campo vazio: a pessoa precisa escolher.
      metodo: normalizarMetodo(despesa.metodoPagamento) || '',
      parcelas: Math.min(MAX_PARCELAS, Math.max(1, Number(despesa.parcelas) || 1)),
      status: normalizarStatus(despesa.status),
      statusTocado: true
    };
  }
  const metodo = lerUltimoMetodo();
  return {
    tipo: tipoNovo,
    valor: '',
    descricao: '',
    categoria: rankings[tipoNovo][0] || OUTRA,
    outraCategoria: '',
    metodo,
    parcelas: 1,
    status: statusInicial(tipoNovo, metodo),
    statusTocado: false
  };
}

// mes: o mês aberto na tela ('AAAA-MM'). Um lançamento novo é registrado nele.
export default function ExpenseModal({ despesa, categorias, despesas, mes, onClose, onSave }) {
  const isEdit = Boolean(despesa);
  // Parcela de uma compra: tipo, forma de pagamento e parcelas são da compra e não mudam aqui.
  const isParcela = Boolean(despesa?.compraId);
  const dialogRef = useRef(null);
  const formRef = useRef(null);
  const valorRef = useRef(null);
  const outraRef = useRef(null);
  const intentRef = useRef('close');
  const ultimaIntencaoRef = useRef('close');
  const focarErroRef = useRef(false);

  useDialog({ dialogRef, initialFocusRef: valorRef, onClose });

  // Ranking calculado ao abrir, para os chips não mudarem de lugar enquanto a pessoa preenche.
  // Só recalcula se a lista de /categorias chegar depois que o modal abriu.
  const [rankings, setRankings] = useState(() => montarRankings(categorias, despesas, despesa));
  const [categoriasBase, setCategoriasBase] = useState(categorias);
  if (categorias !== categoriasBase) {
    setCategoriasBase(categorias);
    setRankings(montarRankings(categorias, despesas, despesa));
  }

  const [form, setForm] = useState(() => estadoInicial(despesa, rankings));
  const entrada = form.tipo === 'ENTRADA';
  const ranking = rankings[form.tipo];
  const mesDoLancamento = isEdit ? despesa.mes : mes;
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Leva o foco ao primeiro campo inválido depois que os erros aparecem na tela.
  useEffect(() => {
    if (!focarErroRef.current) return;
    focarErroRef.current = false;
    const invalido = formRef.current?.querySelector('[aria-invalid="true"]');
    if (!invalido) return;
    const alvo = invalido.getAttribute('role') === 'radiogroup' ? invalido.querySelector('[tabindex="0"]') : invalido;
    alvo?.focus();
  }, [errors]);

  // A categoria selecionada sempre aparece como chip, mesmo fora do ranking.
  const categoriasChips =
    form.categoria !== OUTRA && !ranking.some((n) => n.toLowerCase() === form.categoria.toLowerCase())
      ? [...ranking, form.categoria]
      : ranking;

  const metodoAntigo = isEdit && !normalizarMetodo(despesa.metodoPagamento) ? despesa.metodoPagamento : '';

  // Parcelas só para cartão de crédito. Na edição, preserva parcelas antigas de outros métodos.
  // Entrada não tem forma de pagamento; numa parcela, esses campos são da compra.
  const mostrarPagamento = !entrada && !isParcela;
  const mostrarParcelas =
    mostrarPagamento &&
    (isCartaoCredito(form.metodo) ||
      (isEdit && form.metodo === normalizarMetodo(despesa.metodoPagamento) && Number(despesa.parcelas) > 1));

  const valorNumero = parseValor(form.valor);

  function atualizar(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
    if (errors[campo]) setErrors((e) => ({ ...e, [campo]: undefined }));
  }

  function trocarTipo(tipo) {
    setForm((f) => ({
      ...f,
      tipo,
      // A categoria escolhida raramente serve para o outro tipo: volta à primeira sugestão.
      categoria: f.categoria === OUTRA ? OUTRA : rankings[tipo][0] || OUTRA,
      status: f.statusTocado ? f.status : statusInicial(tipo, f.metodo)
    }));
    setErrors({});
  }

  function trocarMetodo(metodo) {
    setForm((f) => ({ ...f, metodo, status: f.statusTocado ? f.status : statusPadrao(metodo) }));
    if (errors.metodoPagamento) setErrors((e) => ({ ...e, metodoPagamento: undefined }));
  }

  function trocarCategoria(categoria) {
    atualizar('categoria', categoria);
    if (categoria === OUTRA) requestAnimationFrame(() => outraRef.current?.focus());
  }

  function validar() {
    const e = {};
    if (Number.isNaN(valorNumero)) e.valor = 'Informe um valor válido, como 1.234,56.';
    else if (valorNumero <= 0) e.valor = 'Informe um valor maior que zero.';
    else if (valorNumero > LIMITES.valorMaximo) e.valor = 'O valor máximo é R$ 10.000,00.';

    const descricao = form.descricao.trim();
    if (!descricao) e.descricao = entrada ? 'Dê um nome para a entrada.' : 'Dê um nome para a despesa.';
    else if (descricao.length > LIMITES.descricao) e.descricao = `Use no máximo ${LIMITES.descricao} caracteres.`;

    const categoria = form.categoria === OUTRA ? form.outraCategoria.trim() : form.categoria;
    if (form.categoria === OUTRA && !categoria) e.categoria = 'Digite o nome da categoria.';
    else if (!categoria) e.categoria = 'Escolha uma categoria.';
    else if (categoria.length > LIMITES.categoria) e.categoria = `O nome da categoria pode ter até ${LIMITES.categoria} caracteres.`;

    if (mostrarPagamento && !form.metodo) {
      e.metodoPagamento = metodoAntigo
        ? `"${metodoAntigo}" não é mais aceito. Escolha PIX, débito ou crédito.`
        : 'Escolha a forma de pagamento.';
    }

    if (mostrarParcelas && !(Number.isInteger(form.parcelas) && form.parcelas >= 1 && form.parcelas <= MAX_PARCELAS)) {
      e.parcelas = `Escolha de 1 a ${MAX_PARCELAS} parcelas.`;
    }
    return e;
  }

  function limparParaNova() {
    setForm((f) => ({
      ...estadoInicial(null, rankings, f.tipo),
      categoria: f.categoria,
      outraCategoria: f.outraCategoria,
      metodo: f.metodo,
      status: f.statusTocado ? f.status : statusInicial(f.tipo, f.metodo),
      statusTocado: f.statusTocado
    }));
    setErrors({});
    valorRef.current?.focus();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const intencao = intentRef.current;
    intentRef.current = 'close';
    ultimaIntencaoRef.current = intencao;
    setGeneralError('');

    const errosCliente = validar();
    if (Object.keys(errosCliente).length > 0) {
      focarErroRef.current = true;
      setErrors(errosCliente);
      return;
    }
    setErrors({});

    // Numa parcela, o servidor mantém forma de pagamento e parcelas; mandamos os valores
    // atuais só porque o contrato pede o corpo completo.
    const payload = {
      tipo: form.tipo,
      mes: mesDoLancamento,
      descricao: form.descricao.trim(),
      valor: valorNumero,
      categoria: form.categoria === OUTRA ? form.outraCategoria.trim() : form.categoria,
      metodoPagamento: isParcela ? despesa.metodoPagamento : form.metodo,
      parcelas: isParcela ? despesa.parcelas : mostrarParcelas ? form.parcelas : 1,
      status: form.status
    };

    setSubmitting(true);
    try {
      await onSave(payload, despesa?.id);
      if (!isEdit && !entrada) salvarUltimoMetodo(form.metodo);
      setSubmitting(false);
      if (intencao === 'again') limparParaNova();
      else onClose();
    } catch (err) {
      setSubmitting(false);
      if (err.kind === 'validation') {
        const porCampo = {};
        err.issues.forEach((issue) => {
          const campo = issue.path?.[0];
          if (ERRO_SERVIDOR_POR_CAMPO[campo]) porCampo[campo] = ERRO_SERVIDOR_POR_CAMPO[campo];
        });
        if (Object.keys(porCampo).length > 0) {
          focarErroRef.current = true;
          setErrors(porCampo);
          return;
        }
        setGeneralError('O servidor recusou os dados. Revise os campos e tente de novo.');
      } else if (err.kind === 'not_found') {
        setGeneralError('Esse lançamento não existe mais. Feche e recarregue a lista.');
      } else if (err.kind === 'network') {
        setGeneralError('Sem conexão com o servidor. O lançamento não foi salvo.');
      } else {
        setGeneralError('O servidor encontrou um erro e o lançamento não foi salvo.');
      }
    }
  }

  function tentarDeNovo() {
    intentRef.current = ultimaIntencaoRef.current;
    formRef.current?.requestSubmit();
  }

  function salvarEAdicionarOutra() {
    intentRef.current = 'again';
    formRef.current?.requestSubmit();
  }

  function erroProps(campo) {
    return errors[campo]
      ? { 'aria-invalid': true, 'aria-describedby': `erro-${campo}` }
      : {};
  }

  function mensagemErro(campo) {
    if (!errors[campo]) return null;
    return (
      <span className="err" id={`erro-${campo}`}>
        <CircleAlert size={14} aria-hidden="true" />
        {errors[campo]}
      </span>
    );
  }

  const opcoesCategoria = [
    ...categoriasChips.map((nome) => ({ value: nome, label: nome, color: corDaCategoria(nome, categorias) })),
    { value: OUTRA, label: 'Outra', icon: Plus, className: 'add' }
  ];

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="modal-despesa-titulo">
        <div className="sheet-grip" aria-hidden="true" />
        <div className="modal-head">
          <h2 id="modal-despesa-titulo">
            {isEdit ? (entrada ? 'Editar entrada' : 'Editar despesa') : 'Novo lançamento'}
          </h2>
          <button type="button" className="icon-btn" aria-label="Fechar" onClick={onClose}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <form ref={formRef} className="modal-form" onSubmit={handleSubmit} noValidate>
          <div className="modal-body">
            {generalError && (
              <div className="form-alert" role="alert">
                <CircleAlert size={18} aria-hidden="true" />
                <span>{generalError}</span>
                <button type="button" className="toast-action" onClick={tentarDeNovo} disabled={submitting}>
                  Tentar de novo
                </button>
              </div>
            )}

            {mesDoLancamento && (
              <p className="hint modal-mes">
                {isEdit ? 'Lançado em' : 'Será lançado em'} <b>{rotuloMes(mesDoLancamento)}</b>
                {isParcela && ` · parcela ${despesa.parcelaAtual} de ${despesa.parcelas}`}
              </p>
            )}

            {!isParcela && (
              <div className="field">
                <span className="field-label" id="rotulo-tipo">Tipo</span>
                <ChipGroup
                  className="segmented full"
                  chipClassName=""
                  options={TIPOS}
                  value={form.tipo}
                  onChange={trocarTipo}
                  labelledBy="rotulo-tipo"
                  invalid={Boolean(errors.tipo)}
                  describedBy={errors.tipo ? 'erro-tipo' : undefined}
                />
                {mensagemErro('tipo')}
              </div>
            )}

            <div className="field">
              <label htmlFor="campo-valor">
                {isParcela ? 'Valor desta parcela' : mostrarParcelas && form.parcelas > 1 ? 'Valor total da compra' : 'Valor'}
              </label>
              <div className="money-input">
                <span aria-hidden="true">R$</span>
                <input
                  id="campo-valor"
                  ref={valorRef}
                  className={`input ${errors.valor ? 'invalid' : ''}`}
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="0,00"
                  value={form.valor}
                  onChange={(e) => atualizar('valor', e.target.value)}
                  onBlur={() => {
                    if (!Number.isNaN(valorNumero) && valorNumero > 0) atualizar('valor', formatDecimal(valorNumero));
                  }}
                  {...erroProps('valor')}
                />
              </div>
              {mensagemErro('valor')}
            </div>

            <div className="field">
              <label htmlFor="campo-descricao">Descrição</label>
              <input
                id="campo-descricao"
                className={`input ${errors.descricao ? 'invalid' : ''}`}
                placeholder={entrada ? 'Ex.: salário, freela, venda' : 'Ex.: aluguel, mercado, farmácia'}
                autoComplete="off"
                maxLength={LIMITES.descricao}
                value={form.descricao}
                onChange={(e) => atualizar('descricao', e.target.value)}
                {...erroProps('descricao')}
              />
              {mensagemErro('descricao')}
            </div>

            <div className="field">
              <span className="field-label" id="rotulo-categoria">Categoria</span>
              <ChipGroup
                options={opcoesCategoria}
                value={form.categoria}
                onChange={trocarCategoria}
                labelledBy="rotulo-categoria"
                invalid={Boolean(errors.categoria) && form.categoria !== OUTRA}
                describedBy={errors.categoria && form.categoria !== OUTRA ? 'erro-categoria' : undefined}
              />
              {form.categoria === OUTRA && (
                <>
                  <label htmlFor="campo-outra" className="sr-only">Nome da nova categoria</label>
                  <input
                    id="campo-outra"
                    ref={outraRef}
                    className={`input ${errors.categoria ? 'invalid' : ''}`}
                    placeholder="Nome da categoria, ex.: Assinaturas"
                    maxLength={LIMITES.categoria}
                    value={form.outraCategoria}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, outraCategoria: e.target.value }));
                      if (errors.categoria) setErrors((er) => ({ ...er, categoria: undefined }));
                    }}
                    {...erroProps('categoria')}
                  />
                </>
              )}
              {mensagemErro('categoria')}
            </div>

            {mostrarPagamento && (
            <div className="field">
              <span className="field-label" id="rotulo-metodo">Forma de pagamento</span>
              <ChipGroup
                options={METODOS_PAGAMENTO.map((m) => ({ value: m, label: ROTULOS_METODO[m] }))}
                value={form.metodo}
                onChange={trocarMetodo}
                labelledBy="rotulo-metodo"
                invalid={Boolean(errors.metodoPagamento)}
                describedBy={
                  [errors.metodoPagamento && 'erro-metodoPagamento', metodoAntigo && !form.metodo && 'aviso-metodo']
                    .filter(Boolean)
                    .join(' ') || undefined
                }
              />
              {metodoAntigo && !form.metodo && !errors.metodoPagamento && (
                <span className="hint" id="aviso-metodo">
                  Esta despesa usava "{metodoAntigo}", que não é mais aceito. Escolha uma das opções.
                </span>
              )}
              {mensagemErro('metodoPagamento')}
            </div>
            )}

            <div className={mostrarParcelas ? 'row-2' : ''}>
              {mostrarParcelas && (
                <div className="field">
                  <span className="field-label" id="rotulo-parcelas">Parcelas</span>
                  <div className="stepper" role="group" aria-labelledby="rotulo-parcelas">
                    <button
                      type="button"
                      aria-label="Menos uma parcela"
                      disabled={form.parcelas <= 1}
                      onClick={() => atualizar('parcelas', Math.max(1, form.parcelas - 1))}
                    >
                      <Minus size={18} aria-hidden="true" />
                    </button>
                    <output className="money" aria-live="polite">{form.parcelas}x</output>
                    <button
                      type="button"
                      aria-label="Mais uma parcela"
                      disabled={form.parcelas >= MAX_PARCELAS}
                      onClick={() => atualizar('parcelas', Math.min(MAX_PARCELAS, form.parcelas + 1))}
                    >
                      <Plus size={18} aria-hidden="true" />
                    </button>
                  </div>
                  <span className="hint money">
                    {form.parcelas <= 1
                      ? 'À vista'
                      : formatParcelas(form.parcelas, Number.isNaN(valorNumero) ? 0 : valorNumero)}
                  </span>
                  {!isEdit && form.parcelas > 1 && (
                    <span className="hint">Uma parcela por mês, a partir de {rotuloMes(mes).toLowerCase()}.</span>
                  )}
                  {mensagemErro('parcelas')}
                </div>
              )}

              <div className="field">
                <span className="field-label" id="rotulo-status">Status</span>
                <ChipGroup
                  className="segmented full"
                  chipClassName=""
                  options={[
                    { value: 'PAGO', label: (entrada ? ROTULOS_STATUS_ENTRADA : ROTULOS_STATUS).PAGO },
                    { value: 'PENDENTE', label: (entrada ? ROTULOS_STATUS_ENTRADA : ROTULOS_STATUS).PENDENTE }
                  ]}
                  value={form.status}
                  onChange={(s) => {
                    setForm((f) => ({ ...f, status: s, statusTocado: true }));
                    if (errors.status) setErrors((er) => ({ ...er, status: undefined }));
                  }}
                  labelledBy="rotulo-status"
                  invalid={Boolean(errors.status)}
                  describedBy={errors.status ? 'erro-status' : undefined}
                />
                {mensagemErro('status')}
              </div>
            </div>
            {/* Erro de parcelas vindo do servidor quando o campo está oculto (PIX/débito). */}
            {!mostrarParcelas && mensagemErro('parcelas')}
          </div>

          <div className="modal-foot">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={submitting}>
              Cancelar
            </button>
            {!isEdit && (
              <button type="button" className="btn btn-secondary" onClick={salvarEAdicionarOutra} disabled={submitting}>
                Salvar e adicionar outra
              </button>
            )}
            <button type="submit" className="btn btn-primary btn-main" disabled={submitting}>
              {submitting ? 'Salvando…' : isEdit ? 'Salvar alterações' : entrada ? 'Salvar entrada' : 'Salvar despesa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
