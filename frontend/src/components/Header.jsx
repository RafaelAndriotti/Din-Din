import React from 'react';
import { Wallet, Plus, RefreshCw } from 'lucide-react';

const CONEXAO = {
  ready: { texto: 'API conectada', classe: 'on' },
  demo: { texto: 'Dados de exemplo', classe: 'off' },
  error: { texto: 'API indisponível', classe: 'error' }
};

export default function Header({ status, onOpenModal, onRefresh, refreshing }) {
  const conexao = CONEXAO[status];

  return (
    <header className="app-header">
      <div className="header-inner">
        <div className="brand">
          <div className="brand-logo" aria-hidden="true">
            <Wallet size={20} />
          </div>
          <span className="brand-name">Din-Din</span>
        </div>

        <div className="header-actions">
          {conexao && (
            <span className={`conn ${conexao.classe} hide-sm`}>
              <span className="conn-dot" aria-hidden="true" />
              {conexao.texto}
            </span>
          )}

          <button
            type="button"
            className="icon-btn"
            onClick={onRefresh}
            disabled={refreshing}
            aria-label="Recarregar despesas"
          >
            <RefreshCw size={18} className={refreshing ? 'spinning' : ''} aria-hidden="true" />
          </button>

          <button type="button" className="btn btn-primary hide-sm" onClick={onOpenModal}>
            <Plus size={18} aria-hidden="true" />
            Nova despesa
          </button>
        </div>
      </div>
    </header>
  );
}
