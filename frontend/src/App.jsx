import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, TriangleAlert } from 'lucide-react';
import Header from './components/Header';
import SummaryCards, { SummarySkeleton } from './components/SummaryCards';
import ExpenseFilters from './components/ExpenseFilters';
import ExpenseList, { LoadError } from './components/ExpenseList';
import ExpenseModal from './components/ExpenseModal';
import ExpenseDetailsModal from './components/ExpenseDetailsModal';
import Toast from './components/Toast';
import useDelayedFlag from './hooks/useDelayedFlag';
import { getDespesas, getCategorias, createDespesa, updateDespesa, deleteDespesa } from './services/api';
import { isPago, pluralize } from './utils/format';
import './App.css';

const TOAST_DURACAO = 5000;

function mensagemDeErro(err) {
  if (err?.kind === 'network') return 'Sem conexão com o servidor.';
  if (err?.kind === 'not_found') return 'Essa despesa não existe mais.';
  return 'O servidor encontrou um erro.';
}

function buscarTudo() {
  return Promise.all([getDespesas(), getCategorias()]);
}

function rolarAteLista() {
  const titulo = document.getElementById('lista-titulo');
  if (!titulo) return;
  const reduzirMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  titulo.focus({ preventScroll: true });
  titulo.scrollIntoView({ behavior: reduzirMovimento ? 'auto' : 'smooth', block: 'start' });
}

export default function App() {
  const [despesas, setDespesas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  // 'loading' só antes do primeiro carregamento; depois 'ready', 'demo' ou 'error'.
  const [status, setStatus] = useState('loading');
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);

  // null | { type: 'form', despesa? } | { type: 'details', id }
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);
  const toastRef = useRef(null);
  const toastSeq = useRef(0);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // ---------- Toast ----------
  // Um aviso por vez. Ao ser substituído ou expirar, executa onExpire
  // (é ali que a exclusão com "Desfazer" é enviada de verdade).
  const closeToast = useCallback((id, motivo) => {
    const atual = toastRef.current;
    if (!atual || atual.id !== id) return;
    toastRef.current = null;
    setToast(null);
    if (motivo === 'action') atual.onAction?.();
    else atual.onExpire?.();
  }, []);

  const showToast = useCallback((opcoes) => {
    const anterior = toastRef.current;
    toastSeq.current += 1;
    const novo = { id: toastSeq.current, variant: 'success', duration: TOAST_DURACAO, ...opcoes };
    toastRef.current = novo;
    setToast(novo);
    anterior?.onExpire?.();
  }, []);

  // ---------- Carregamento ----------
  // Refs para o loadData ler o valor atual sem precisar ser recriado.
  const hasLoadedRef = useRef(false);
  const loadDataRef = useRef(null);

  const aplicarResultado = useCallback(([resultado, cats]) => {
    setCategorias(cats);

    if (resultado.data) {
      // Uma exclusão ainda no prazo do "Desfazer" não deve reaparecer na lista.
      const pendente = toastRef.current?.pendingDeleteId;
      setDespesas(resultado.data.filter((d) => d.id !== pendente));
      setStatus(resultado.isFallback ? 'demo' : 'ready');
      setHasLoaded(true);
    } else if (hasLoadedRef.current) {
      // Já havia dados na tela: mantém o que tem e avisa.
      showToast({
        variant: 'error',
        message: `Não foi possível atualizar a lista. ${mensagemDeErro(resultado.error)}`,
        actionLabel: 'Tentar de novo',
        onAction: () => loadDataRef.current?.()
      });
    } else {
      setStatus('error');
    }
    setLoading(false);
  }, [showToast]);

  // Recarregar (botão do header, "Tentar de novo", "Reconectar").
  const loadData = useCallback(() => {
    setLoading(true);
    return buscarTudo().then(aplicarResultado);
  }, [aplicarResultado]);

  useEffect(() => {
    hasLoadedRef.current = hasLoaded;
    loadDataRef.current = loadData;
  }, [hasLoaded, loadData]);

  // Primeiro carregamento. "loading" já começa true, então não há setState síncrono aqui.
  useEffect(() => {
    let ativo = true;
    buscarTudo().then((r) => {
      if (ativo) aplicarResultado(r);
    });
    return () => {
      ativo = false;
    };
  }, [aplicarResultado]);

  // Se a pessoa fechar a aba durante o "Desfazer", a exclusão ainda é enviada.
  useEffect(() => {
    function handlePageHide() {
      const id = toastRef.current?.pendingDeleteId;
      if (id != null) deleteDespesa(id, { keepalive: true }).catch(() => {});
    }
    window.addEventListener('pagehide', handlePageHide);
    return () => window.removeEventListener('pagehide', handlePageHide);
  }, []);

  const isInitialLoading = loading && !hasLoaded;
  const showSkeleton = useDelayedFlag(isInitialLoading, 300);

  // ---------- Ações ----------
  const closeModal = useCallback(() => setModal(null), []);

  function openNew() {
    setModal({ type: 'form' });
  }

  async function handleSave(payload, id) {
    if (id != null) {
      const atualizada = await updateDespesa(id, payload);
      setDespesas((prev) => prev.map((d) => (d.id === id ? atualizada : d)));
      showToast({ message: `Alterações em "${atualizada.descricao}" salvas.` });
    } else {
      const criada = await createDespesa(payload);
      setDespesas((prev) => [criada, ...prev]);
      showToast({ message: `"${criada.descricao}" cadastrada.` });
    }
    // Se estava em modo demonstração e salvou, a API voltou: recarrega os dados reais.
    if (status === 'demo') loadData();
  }

  async function handleTogglePaid(item) {
    const novoStatus = isPago(item) ? 'pendente' : 'pago';
    setDespesas((prev) => prev.map((d) => (d.id === item.id ? { ...d, status: novoStatus } : d)));

    try {
      const atualizada = await updateDespesa(item.id, { ...item, status: novoStatus });
      setDespesas((prev) => prev.map((d) => (d.id === item.id ? atualizada : d)));
      showToast({
        message: novoStatus === 'pago'
          ? `"${item.descricao}" marcada como paga.`
          : `"${item.descricao}" voltou para pendente.`
      });
    } catch (err) {
      if (err.kind === 'not_found') {
        setDespesas((prev) => prev.filter((d) => d.id !== item.id));
        showToast({ variant: 'error', message: `"${item.descricao}" não existe mais e saiu da lista.` });
        return;
      }
      setDespesas((prev) => prev.map((d) => (d.id === item.id ? { ...d, status: item.status } : d)));
      showToast({
        variant: 'error',
        message: `Não foi possível atualizar "${item.descricao}". ${mensagemDeErro(err)}`,
        actionLabel: 'Tentar de novo',
        onAction: () => handleTogglePaid(item)
      });
    }
  }

  function restaurar(item, index) {
    setDespesas((prev) => {
      if (prev.some((d) => d.id === item.id)) return prev;
      const copia = [...prev];
      copia.splice(Math.min(index, copia.length), 0, item);
      return copia;
    });
  }

  async function confirmarExclusao(item, index) {
    try {
      await deleteDespesa(item.id);
    } catch (err) {
      if (err.kind === 'not_found') return; // já não existia: o resultado é o mesmo
      restaurar(item, index);
      showToast({
        variant: 'error',
        message: `Não foi possível excluir "${item.descricao}". ${mensagemDeErro(err)}`,
        actionLabel: 'Tentar de novo',
        onAction: () => handleDelete(item)
      });
    }
  }

  // Exclui da tela na hora e só chama o DELETE quando o aviso expira.
  // "Desfazer" cancela sem nenhum request, então o id original é preservado.
  function handleDelete(item) {
    const index = despesas.findIndex((d) => d.id === item.id);
    setDespesas((prev) => prev.filter((d) => d.id !== item.id));
    setModal((m) => (m?.type === 'details' ? null : m));
    requestAnimationFrame(() => document.getElementById('lista-titulo')?.focus());

    showToast({
      message: `"${item.descricao}" excluída.`,
      actionLabel: 'Desfazer',
      pendingDeleteId: item.id,
      onAction: () => restaurar(item, index),
      onExpire: () => confirmarExclusao(item, index)
    });
  }

  function handleFilterStatus(valor) {
    setStatusFilter(valor);
    requestAnimationFrame(rolarAteLista);
  }

  function clearFilters() {
    setSearchTerm('');
    setStatusFilter('all');
    setCategoryFilter('all');
  }

  // ---------- Dados derivados ----------
  const categoriasFiltro = useMemo(() => {
    const nomes = new Set(categorias.map((c) => c.nome).filter(Boolean));
    despesas.forEach((d) => d.categoria && nomes.add(d.categoria));
    return Array.from(nomes).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [categorias, despesas]);

  // Busca e categoria primeiro: as contagens do filtro de status usam esse recorte.
  const recorte = useMemo(() => {
    const termo = searchTerm.trim().toLowerCase();
    return despesas.filter((item) => {
      const bateBusca =
        !termo ||
        item.descricao?.toLowerCase().includes(termo) ||
        item.categoria?.toLowerCase().includes(termo);
      const bateCategoria = categoryFilter === 'all' || item.categoria === categoryFilter;
      return bateBusca && bateCategoria;
    });
  }, [despesas, searchTerm, categoryFilter]);

  const counts = useMemo(() => {
    const pagas = recorte.filter(isPago).length;
    return { all: recorte.length, paid: pagas, pending: recorte.length - pagas };
  }, [recorte]);

  const filteredDespesas = useMemo(() => {
    return recorte
      .filter((item) => {
        if (statusFilter === 'paid') return isPago(item);
        if (statusFilter === 'pending') return !isPago(item);
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') return (b.id || 0) - (a.id || 0);
        if (sortBy === 'oldest') return (a.id || 0) - (b.id || 0);
        if (sortBy === 'highest') return (Number(b.valor) || 0) - (Number(a.valor) || 0);
        if (sortBy === 'lowest') return (Number(a.valor) || 0) - (Number(b.valor) || 0);
        return 0;
      });
  }, [recorte, statusFilter, sortBy]);

  const selected = modal?.type === 'details' ? despesas.find((d) => d.id === modal.id) : null;
  const temDespesas = despesas.length > 0;

  // ---------- Conteúdo principal ----------
  let conteudo;
  if (status === 'error') {
    conteudo = <LoadError onRetry={loadData} />;
  } else if (isInitialLoading) {
    // Antes de 300 ms não mostra nada; depois, skeleton. Nunca R$ 0,00 falso.
    conteudo = showSkeleton ? (
      <>
        <SummarySkeleton />
        <ExpenseList loading despesas={[]} totalCount={0} filters={{}} categorias={categorias} />
      </>
    ) : (
      <div className="loading-placeholder" aria-busy="true" aria-label="Carregando despesas" />
    );
  } else {
    conteudo = (
      <>
        {temDespesas && <SummaryCards despesas={despesas} onFilterStatus={handleFilterStatus} />}
        {temDespesas && (
          <ExpenseFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            categoryFilter={categoryFilter}
            onCategoryFilterChange={setCategoryFilter}
            categories={categoriasFiltro}
            sortBy={sortBy}
            onSortByChange={setSortBy}
            counts={counts}
            onClearAll={clearFilters}
          />
        )}
        <ExpenseList
          loading={false}
          despesas={filteredDespesas}
          totalCount={despesas.length}
          filters={{ searchTerm: searchTerm.trim(), statusFilter, categoryFilter }}
          categorias={categorias}
          onOpenNew={openNew}
          onClearFilters={clearFilters}
          onOpenDetails={(item) => setModal({ type: 'details', id: item.id })}
          onEdit={(item) => setModal({ type: 'form', despesa: item })}
          onDelete={handleDelete}
          onTogglePaid={handleTogglePaid}
        />
      </>
    );
  }

  return (
    <div className="app-layout">
      <Header status={status} onOpenModal={openNew} onRefresh={loadData} refreshing={loading} />

      <main className="page">
        <div className="page-head">
          <h1>Visão geral</h1>
          {hasLoaded && <p>{pluralize(despesas.length, 'despesa registrada', 'despesas registradas')}</p>}
        </div>

        {status === 'demo' && (
          <div className="banner" role="status">
            <TriangleAlert size={18} className="banner-icon" aria-hidden="true" />
            <div>
              <b>Exibindo dados de exemplo.</b> Alterações não serão salvas.
            </div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={loadData} disabled={loading}>
              Reconectar
            </button>
          </div>
        )}

        {conteudo}
      </main>

      {/* No celular, "Nova despesa" fica fixo no rodapé, na zona do polegar. */}
      <div className="fab-bar">
        <button type="button" className="btn btn-primary" onClick={openNew}>
          <Plus size={20} aria-hidden="true" />
          Nova despesa
        </button>
      </div>

      <Toast toast={toast} onClose={closeToast} />

      {modal?.type === 'form' && (
        <ExpenseModal
          key={modal.despesa?.id ?? 'novo'}
          despesa={modal.despesa}
          categorias={categorias}
          despesas={despesas}
          onClose={closeModal}
          onSave={handleSave}
        />
      )}

      {selected && (
        <ExpenseDetailsModal
          expense={selected}
          categorias={categorias}
          onClose={closeModal}
          onEdit={(item) => setModal({ type: 'form', despesa: item })}
          onDelete={handleDelete}
          onTogglePaid={handleTogglePaid}
        />
      )}
    </div>
  );
}
