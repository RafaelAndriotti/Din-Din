import React from 'react';
import { Search, Filter, ArrowUpDown } from 'lucide-react';

export default function ExpenseFilters({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  categories,
  sortBy,
  onSortByChange
}) {
  return (
    <div className="filters-container">
      {/* Busca por texto */}
      <div className="search-input-wrapper">
        <Search size={18} className="search-icon" />
        <input
          type="text"
          placeholder="Buscar por descrição ou categoria..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="search-input"
        />
        {searchTerm && (
          <button 
            type="button" 
            className="clear-search-btn" 
            onClick={() => onSearchChange('')}
          >
            ×
          </button>
        )}
      </div>

      <div className="filters-controls">
        {/* Filtro de Status */}
        <div className="filter-group">
          <label className="filter-label">Status:</label>
          <select 
            value={statusFilter} 
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="filter-select"
          >
            <option value="all">Todos</option>
            <option value="paid">Pagos</option>
            <option value="pending">Pendentes</option>
          </select>
        </div>

        {/* Filtro de Categoria */}
        <div className="filter-group">
          <label className="filter-label">Categoria:</label>
          <select 
            value={categoryFilter} 
            onChange={(e) => onCategoryFilterChange(e.target.value)}
            className="filter-select"
          >
            <option value="all">Todas as categorias</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Ordenação */}
        <div className="filter-group">
          <label className="filter-label">Ordenar:</label>
          <select 
            value={sortBy} 
            onChange={(e) => onSortByChange(e.target.value)}
            className="filter-select"
          >
            <option value="newest">Mais recentes</option>
            <option value="oldest">Mais antigos</option>
            <option value="highest">Maior valor</option>
            <option value="lowest">Menor valor</option>
          </select>
        </div>
      </div>
    </div>
  );
}
