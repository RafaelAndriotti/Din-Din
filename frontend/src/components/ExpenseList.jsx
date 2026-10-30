import React from 'react';
import { CircleCheck, Clock, Pencil, Trash2, Plus, Receipt, FunnelX, CloudOff, RefreshCw } from 'lucide-react';
import { formatCurrency, formatParcelas, isPago } from '../utils/format';
import { corDaCategoria } from '../utils/despesas';

export function StatusBadge({ despesa }) {
  const pago = isPago(despesa);
  return (
    <span className={`badge ${pago ? 'pago' : 'pendente'}`}>
      {pago ? <CircleCheck size={14} aria-hidden="true" /> : <Clock size={14} aria-hidden="true" />}
      {pago ? 'Pago' : 'Pendente'}
    </span>
  );
}

export function CategoryDot({ nome, categorias, small = false }) {
  return (
    <span
      className={`dot ${small ? 'sm' : ''}`}
      style={{ background: corDaCategoria(nome, categorias) }}
      aria-hidden="true"
    />
  );
}

function ListSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando despesas">
      {[70, 55, 62, 48].map((w) => (
        <div key={w} className="skel-row">
          <div className="skel" style={{ height: 14, width: `${w}%` }} />
          <div className="skel" style={{ height: 14 }} />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ icon: Icon, tone, title, text, children, role }) {
  return (
    <div className="empty" role={role}>
      <div className={`empty-ico ${tone || ''}`} aria-hidden="true">
        <Icon size={28} />
      </div>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      <div className="empty-actions">{children}</div>
    </div>
  );
}

export function LoadError({ onRetry }) {
  return (
    <section className="card">
      <EmptyState
        icon={CloudOff}
        tone="err"
        role="alert"
        title="Não foi possível carregar suas despesas"
        text="Verifique sua conexão e tente de novo. Nenhum dado foi perdido."
      >
        <button type="button" className="btn btn-primary" onClick={onRetry}>
          <RefreshCw size={18} aria-hidden="true" />
          Tentar de novo
        </button>
      </EmptyState>
    </section>
  );
}

function descreverFiltros({ searchTerm, statusFilter, categoryFilter }) {
  const partes = [];
  if (statusFilter === 'pending') partes.push('pendente');
  if (statusFilter === 'paid') partes.push('paga');
  let frase = `Nenhuma despesa${partes.length ? ` ${partes.join(' ')}` : ''}`;
  if (categoryFilter !== 'all') frase += ` em ${categoryFilter}`;
  frase += searchTerm ? ' bate com essa busca.' : ' encontrada com esses filtros.';
  return frase;
}

export default function ExpenseList({
  loading,
  despesas,
  totalCount,
  filters,
  categorias,
  onOpenNew,
  onClearFilters,
  onOpenDetails,
  onEdit,
  onDelete,
  onTogglePaid
}) {
  const totalExibido = despesas.reduce((acc, d) => acc + (Number(d.valor) || 0), 0);

  let conteudo;
  if (loading) {
    conteudo = <ListSkeleton />;
  } else if (totalCount === 0) {
    conteudo = (
      <EmptyState
        icon={Receipt}
        title="Comece registrando um gasto"
        text="Cadastre o aluguel, o mercado ou uma conta do mês. O resumo aparece aqui assim que houver a primeira despesa."
      >
        <button type="button" className="btn btn-primary" onClick={onOpenNew}>
          <Plus size={18} aria-hidden="true" />
          Cadastrar primeira despesa
        </button>
      </EmptyState>
    );
  } else if (despesas.length === 0) {
    conteudo = (
      <EmptyState
        icon={FunnelX}
        title={filters.searchTerm ? `Nada encontrado para "${filters.searchTerm}"` : 'Nada encontrado'}
        text={descreverFiltros(filters)}
      >
        <button type="button" className="btn btn-secondary" onClick={onClearFilters}>
          Limpar filtros
        </button>
      </EmptyState>
    );
  } else {
    conteudo = (
      <>
        <table className="expenses-table">
          <caption className="sr-only">Lista de despesas</caption>
          <thead>
            <tr>
              <th scope="col">Descrição</th>
              <th scope="col">Categoria</th>
              <th scope="col">Pagamento</th>
              <th scope="col">Status</th>
              <th scope="col" className="num">Valor</th>
              <th scope="col"><span className="sr-only">Ações</span></th>
            </tr>
          </thead>
          <tbody>
            {despesas.map((item) => (
              <tr key={item.id}>
                <td>
                  <button type="button" className="desc-btn" onClick={() => onOpenDetails(item)}>
                    {item.descricao}
                  </button>
                </td>
                <td>
                  <span className="cat">
                    <CategoryDot nome={item.categoria} categorias={categorias} />
                    {item.categoria || 'Sem categoria'}
                  </span>
                </td>
                <td className="muted">
                  {item.metodoPagamento || 'Não informado'}
                  <span className="sub money">{formatParcelas(item.parcelas, item.valor)}</span>
                </td>
                <td><StatusBadge despesa={item} /></td>
                <td className="num"><span className="val money">{formatCurrency(item.valor)}</span></td>
                <td>
                  <div className="row-actions">
                    {!isPago(item) && (
                      <button type="button" className="quick-pay" onClick={() => onTogglePaid(item)}>
                        Marcar como pago
                        <span className="sr-only">: {item.descricao}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      className="icon-btn sm"
                      aria-label={`Editar ${item.descricao}`}
                      onClick={() => onEdit(item)}
                    >
                      <Pencil size={18} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="icon-btn sm danger"
                      aria-label={`Excluir ${item.descricao}`}
                      onClick={() => onDelete(item)}
                    >
                      <Trash2 size={18} aria-hidden="true" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Mesma lista em cards: aparece abaixo de 720px (troca feita só no CSS). */}
        <ul className="cards">
          {despesas.map((item) => (
            <li key={item.id}>
              <button type="button" className="item" onClick={() => onOpenDetails(item)}>
                <span className="item-title">{item.descricao}</span>
                <span className="item-val money">{formatCurrency(item.valor)}</span>
                <span className="item-meta">
                  <CategoryDot nome={item.categoria} categorias={categorias} small />
                  <span className="item-meta-text">
                    {item.categoria || 'Sem categoria'} · {Number(item.parcelas) > 1
                      ? formatParcelas(item.parcelas, item.valor)
                      : item.metodoPagamento || 'Não informado'}
                  </span>
                </span>
                <span className="item-status"><StatusBadge despesa={item} /></span>
              </button>
            </li>
          ))}
        </ul>
      </>
    );
  }

  return (
    <section className="card list-card" aria-labelledby="lista-titulo" aria-busy={loading || undefined}>
      <div className="list-head">
        <h2 id="lista-titulo" tabIndex={-1}>
          Lançamentos {!loading && <span>({despesas.length})</span>}
        </h2>
        {!loading && despesas.length > 0 && (
          <span className="total">
            Total exibido: <b className="money">{formatCurrency(totalExibido)}</b>
          </span>
        )}
      </div>
      {conteudo}
    </section>
  );
}
