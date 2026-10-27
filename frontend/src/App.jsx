import React, { useState, useEffect, useMemo } from 'react';
import Header from './components/Header';
import MetricsCards from './components/MetricsCards';
import ExpenseFilters from './components/ExpenseFilters';
import ExpenseTable from './components/ExpenseTable';
import ExpenseModal from './components/ExpenseModal';
import ExpenseDetailsModal from './components/ExpenseDetailsModal';
import { getDespesas, getDespesaById, createDespesa, checkBackendHealth } from './services/api';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';
import './App.css';

export default function App() {
  const [despesas, setDespesas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [toast, setToast] = useState(null);

  // Filtros e busca
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // Carrega dados iniciais e verifica conexão
  async function loadData() {
    setLoading(true);
    try {
      const isOnline = await checkBackendHealth();
      setIsConnected(isOnline);

      const result = await getDespesas();
      setDespesas(result.data || []);
      
      if (!isOnline) {
        showToast('Backend offline. Exibindo dados de demonstração. Inicie o backend com: npm run dev:backend', 'info');
      }
    } catch (err) {
      showToast('Erro ao carregar despesas: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function showToast(message, type = 'success') {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  }

  // Criação de nova despesa
  async function handleCreateExpense(newExpenseData) {
    try {
      const created = await createDespesa(newExpenseData);
      setDespesas(prev => [created, ...prev]);
      showToast(`Despesa "${created.desc}" cadastrada com sucesso!`, 'success');
      return created;
    } catch (err) {
      showToast(err.message, 'error');
      throw err;
    }
  }

  // Selecionar despesa para ver detalhes (dispara getDespesaById se possível)
  async function handleSelectExpense(item) {
    try {
      const fullDetails = await getDespesaById(item.id);
      setSelectedExpense(fullDetails || item);
    } catch {
      setSelectedExpense(item);
    }
    setIsDetailsOpen(true);
  }

  // Lista de categorias únicas para o filtro
  const uniqueCategories = useMemo(() => {
    const set = new Set();
    despesas.forEach(d => {
      if (d.category) set.add(d.category);
    });
    return Array.from(set).sort();
  }, [despesas]);

  // Despesas filtradas e ordenadas
  const filteredDespesas = useMemo(() => {
    return despesas
      .filter(item => {
        // Busca textual
        const matchesSearch = 
          !searchTerm ||
          (item.desc && item.desc.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase()));

        // Filtro por status
        const matchesStatus = 
          statusFilter === 'all' ||
          (statusFilter === 'paid' && String(item.status).toLowerCase() === 'paid') ||
          (statusFilter === 'pending' && String(item.status).toLowerCase() !== 'paid');

        // Filtro por categoria
        const matchesCategory = 
          categoryFilter === 'all' ||
          item.category === categoryFilter;

        return matchesSearch && matchesStatus && matchesCategory;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') return (b.id || 0) - (a.id || 0);
        if (sortBy === 'oldest') return (a.id || 0) - (b.id || 0);
        if (sortBy === 'highest') return (Number(b.value) || 0) - (Number(a.value) || 0);
        if (sortBy === 'lowest') return (Number(a.value) || 0) - (Number(b.value) || 0);
        return 0;
      });
  }, [despesas, searchTerm, statusFilter, categoryFilter, sortBy]);

  return (
    <div className="app-layout">
      {/* Notificação Toast */}
      {toast && (
        <div className={`toast-notification ${toast.type}`}>
          {toast.type === 'success' && <CheckCircle size={18} />}
          {toast.type === 'error' && <AlertCircle size={18} />}
          {toast.type === 'info' && <Info size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Header */}
      <Header
        isConnected={isConnected}
        onOpenModal={() => setIsModalOpen(true)}
        onRefresh={loadData}
        loading={loading}
      />

      {/* Conteúdo Principal */}
      <main className="main-content">
        <div className="content-container">
          {/* Alerta de Modo Demonstração se o backend estiver desligado */}
          {!isConnected && (
            <div className="backend-banner">
              <Info size={20} className="banner-icon" />
              <div className="banner-text">
                <strong>Backend Desconectado:</strong> O front-end está ativo em modo de visualização. Para conectar à sua API real em Node.js, abra outro terminal e execute: <code>npm run dev:backend</code>
              </div>
            </div>
          )}

          {/* Cards de Métricas e Totais */}
          <section className="section-metrics">
            <MetricsCards despesas={despesas} />
          </section>

          {/* Barra de Filtros e Busca */}
          <section className="section-filters">
            <ExpenseFilters
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              categoryFilter={categoryFilter}
              onCategoryFilterChange={setCategoryFilter}
              categories={uniqueCategories}
              sortBy={sortBy}
              onSortByChange={setSortBy}
            />
          </section>

          {/* Tabela de Despesas */}
          <section className="section-table">
            <div className="section-table-header">
              <h3>Lançamentos ({filteredDespesas.length})</h3>
              {searchTerm && <span className="search-result-hint">Filtrado por: "{searchTerm}"</span>}
            </div>

            <ExpenseTable
              despesas={filteredDespesas}
              onSelectExpense={handleSelectExpense}
              onOpenNewModal={() => setIsModalOpen(true)}
            />
          </section>
        </div>
      </main>

      {/* Modal Nova Despesa */}
      <ExpenseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleCreateExpense}
      />

      {/* Modal Detalhes da Despesa */}
      <ExpenseDetailsModal
        isOpen={isDetailsOpen}
        expense={selectedExpense}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedExpense(null);
        }}
      />
    </div>
  );
}
