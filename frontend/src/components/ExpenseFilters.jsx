import React from 'react';
import { Search, X, Clock, CircleCheck } from 'lucide-react';

const STATUS_LABEL = { pending: 'Pendentes', paid: 'Pagos' };

export default function ExpenseFilters({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  categories,
  sortBy,
  onSortByChange,
  counts,
  onClearAll
}) {
  const statusOptions = [
    { value: 'all', label: 'Todos', count: counts.all },
    { value: 'pending', label: 'Pendentes', count: counts.pending, Icon: Clock },
    { value: 'paid', label: 'Pagos', count: counts.paid, Icon: CircleCheck }
  ];

  const ativos = [];
  if (searchTerm) ativos.push({ key: 'busca', label: `"${searchTerm}"`, onRemove: () => onSearchChange('') });
  if (statusFilter !== 'all') ativos.push({ key: 'status', label: STATUS_LABEL[statusFilter], onRemove: () => onStatusFilterChange('all') });
  if (categoryFilter !== 'all') ativos.push({ key: 'cat', label: categoryFilter, onRemove: () => onCategoryFilterChange('all') });

  return (
    <section className="card filters" aria-label="Filtros">
      <div className="search">
        <label htmlFor="busca" className="sr-only">Buscar despesas</label>
        <Search size={18} className="search-icon" aria-hidden="true" />
        <input
          id="busca"
          type="search"
          className="input"
          placeholder="Buscar por descrição ou categoria"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          autoComplete="off"
        />
        {searchTerm && (
          <button type="button" className="search-clear" aria-label="Limpar busca" onClick={() => onSearchChange('')}>
            <X size={16} aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="filters-row">
        <div className="segmented" role="group" aria-label="Status">
          {statusOptions.map(({ value, label, count, Icon }) => (
            <button
              key={value}
              type="button"
              aria-pressed={statusFilter === value}
              onClick={() => onStatusFilterChange(value)}
            >
              {Icon && <Icon size={14} aria-hidden="true" />}
              {label} <span className="count">{count}</span>
            </button>
          ))}
        </div>

        <div className="select-wrap">
          <label htmlFor="filtro-categoria" className="sr-only">Categoria</label>
          <select
            id="filtro-categoria"
            className="select"
            value={categoryFilter}
            onChange={(e) => onCategoryFilterChange(e.target.value)}
          >
            <option value="all">Todas as categorias</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="select-wrap">
          <label htmlFor="filtro-ordem" className="sr-only">Ordenar</label>
          <select
            id="filtro-ordem"
            className="select"
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value)}
          >
            <option value="newest">Mais recentes</option>
            <option value="oldest">Mais antigas</option>
            <option value="highest">Maior valor</option>
            <option value="lowest">Menor valor</option>
          </select>
        </div>
      </div>

      {ativos.length > 0 && (
        <div className="active-filters">
          <span>Filtrando por:</span>
          {ativos.map((f) => (
            <span key={f.key} className="tag">
              {f.label}
              <button type="button" aria-label={`Remover filtro ${f.label}`} onClick={f.onRemove}>
                <X size={14} aria-hidden="true" />
              </button>
            </span>
          ))}
          <button type="button" className="btn btn-ghost btn-xs" onClick={onClearAll}>
            Limpar filtros
          </button>
        </div>
      )}
    </section>
  );
}
