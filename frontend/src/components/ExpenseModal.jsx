import React, { useEffect, useRef, useState } from 'react';
import { X, Plus, Minus, CircleAlert, CircleCheck, Clock } from 'lucide-react';
import useDialog from '../hooks/useDialog';
import ChipGroup from './ChipGroup';
import { formatDecimal, formatParcelas, parseValor } from '../utils/format';
import {
  CATEGORIAS_PADRAO,
  METODOS_PAGAMENTO,
  corDaCategoria,
  isCartaoCredito,
  statusPadrao
} from '../utils/despesas';

const OUTRA = '__outra__';
const ULTIMO_METODO_KEY = 'dindin:ultimoMetodo';
const MAX_CHIPS_CATEGORIA = 6;
const MAX_PARCELAS = 48;
const VALOR_MAXIMO = 99999999.99; // NUMERIC(10, 2) no banco

// Mensagens amigáveis para campos recusados pelo backend (400 do Zod).
// Os textos do Zod (em inglês, técnicos) não vão para a tela.
const ERRO_SERVIDOR_POR_CAMPO = {
  descricao: 'O servidor recusou a descrição. Confira o texto.',
  valor: 'O servidor recusou o valor. Confira o número.',
  categoria: 'O servidor recusou a categoria.',
  metodoPagamento: 'O servidor recusou a forma de pagamento.',
  parcelas: 'O servidor recusou o número de parcelas.',
  status: 'O servidor recusou o status.'
};

function lerUltimoMetodo() {
  try {
    const salvo = localStorage.getItem(ULTIMO_METODO_KEY);
    return METODOS_PAGAMENTO.includes(salvo) ? salvo : 'PIX';
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
function montarCategorias(categoriasApi, despesas, atual) {
  const base = categoriasApi.length > 0 ? categoriasApi.map((c) => c.nome) : CATEGORIAS_PADRAO;
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

function estadoInicial(despesa, categoriasChips) {
  if (despesa) {
    return {
      valor: formatDecimal(despesa.valor),
      descricao: despesa.descricao || '',
      categoria: despesa.categoria || categoriasChips[0] || OUTRA,
      outraCategoria: '',
      metodo: despesa.metodoPagamento || 'PIX',
      parcelas: Math.min(MAX_PARCELAS, Math.max(1, Number(despesa.parcelas) || 1)),
      status: String(despesa.status).toLowerCase() === 'pago' ? 'pago' : 'pendente',
      statusTocado: true
    };
  }
  const metodo = lerUltimoMetodo();
  return {
    valor: '',
    descricao: '',
    categoria: categoriasChips[0] || OUTRA,
    outraCategoria: '',
    metodo,
    parcelas: 1,
    status: statusPadrao(metodo),
    statusTocado: false
  };
}

export default function ExpenseModal({ despesa, categorias, despesas, onClose, onSave }) {
  const isEdit = Boolean(despesa);
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
  const [ranking, setRanking] = useState(() => montarCategorias(categorias, despesas, despesa?.categoria));
  const [categoriasBase, setCategoriasBase] = useState(categorias);
  if (categorias !== categoriasBase) {
    setCategoriasBase(categorias);
    setRanking(montarCategorias(categorias, despesas, despesa?.categoria));
  }

  const [form, setForm] = useState(() => estadoInicial(despesa, ranking));
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

  const metodosOpcoes = METODOS_PAGAMENTO.includes(form.metodo) ? METODOS_PAGAMENTO : [...METODOS_PAGAMENTO, form.metodo];

  // Parcelas só para cartão de crédito. Na edição, preserva parcelas antigas de outros métodos.
  const mostrarParcelas =
    isCartaoCredito(form.metodo) ||
    (isEdit && form.metodo === despesa.metodoPagamento && Number(despesa.parcelas) > 0);

  const valorNumero = parseValor(form.valor);

  function atualizar(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
    if (errors[campo]) setErrors((e) => ({ ...e, [campo]: undefined }));
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
    else if (valorNumero > VALOR_MAXIMO) e.valor = 'Valor acima do limite permitido.';

    if (!form.descricao.trim()) e.descricao = 'Dê um nome para a despesa.';

    if (form.categoria === OUTRA && !form.outraCategoria.trim()) e.categoria = 'Digite o nome da categoria.';
    else if (!form.categoria) e.categoria = 'Escolha uma categoria.';

    if (!form.metodo) e.metodoPagamento = 'Escolha a forma de pagamento.';
    return e;
  }

  function limparParaNova() {
    setForm((f) => ({
      ...estadoInicial(null, ranking),
      categoria: f.categoria,
      outraCategoria: f.outraCategoria,
      metodo: f.metodo,
      status: f.statusTocado ? f.status : statusPadrao(f.metodo),
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

    const payload = {
      descricao: form.descricao.trim(),
      valor: valorNumero,
      categoria: form.categoria === OUTRA ? form.outraCategoria.trim() : form.categoria,
      metodoPagamento: form.metodo,
      parcelas: mostrarParcelas ? form.parcelas : 0,
      status: form.status
    };

    setSubmitting(true);
    try {
      await onSave(payload, despesa?.id);
      if (!isEdit) salvarUltimoMetodo(form.metodo);
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
        setGeneralError('Essa despesa não existe mais. Feche e recarregue a lista.');
      } else if (err.kind === 'network') {
        setGeneralError('Sem conexão com o servidor. A despesa não foi salva.');
      } else {
        setGeneralError('O servidor encontrou um erro e a despesa não foi salva.');
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
          <h2 id="modal-despesa-titulo">{isEdit ? 'Editar despesa' : 'Nova despesa'}</h2>
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

            <div className="field">
              <label htmlFor="campo-valor">Valor</label>
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
                placeholder="Ex.: aluguel, mercado, farmácia"
                autoComplete="off"
                maxLength={120}
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
                    maxLength={50}
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

            <div className="field">
              <span className="field-label" id="rotulo-metodo">Forma de pagamento</span>
              <ChipGroup
                options={metodosOpcoes.map((m) => ({ value: m, label: m }))}
                value={form.metodo}
                onChange={trocarMetodo}
                labelledBy="rotulo-metodo"
                invalid={Boolean(errors.metodoPagamento)}
                describedBy={errors.metodoPagamento ? 'erro-metodoPagamento' : undefined}
              />
              {mensagemErro('metodoPagamento')}
            </div>

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
                  {mensagemErro('parcelas')}
                </div>
              )}

              <div className="field">
                <span className="field-label" id="rotulo-status">Status</span>
                <ChipGroup
                  className="segmented full"
                  chipClassName=""
                  options={[
                    { value: 'pago', label: 'Pago', icon: CircleCheck, className: 'is-pago' },
                    { value: 'pendente', label: 'Pendente', icon: Clock, className: 'is-pend' }
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
              {submitting ? 'Salvando…' : isEdit ? 'Salvar alterações' : 'Salvar despesa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
