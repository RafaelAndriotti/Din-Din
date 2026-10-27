import React from 'react';
import { Wallet, Plus, RefreshCw, Server, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function Header({ isConnected, onOpenModal, onRefresh, loading }) {
  return (
    <header className="app-header">
      <div className="header-container">
        <div className="header-brand">
          <div className="logo-icon-wrapper">
            <Wallet className="logo-icon" size={26} />
          </div>
          <div className="brand-text">
            <h1>DinDin</h1>
            <span className="brand-subtitle">Controle Financeiro</span>
          </div>
        </div>

        <div className="header-actions">
          {/* Status do Backend */}
          <div className={`status-pill ${isConnected ? 'online' : 'offline'}`} title={isConnected ? 'Backend respondendo na porta 3000' : 'Backend offline. Inicie com npm run dev:backend'}>
            <Server size={14} />
            <span className="status-indicator"></span>
            <span className="status-label">
              {isConnected ? 'API Online' : 'Modo Demonstração'}
            </span>
          </div>

          {/* Botão de Atualizar */}
          <button 
            type="button" 
            className="btn btn-secondary icon-only" 
            onClick={onRefresh} 
            disabled={loading}
            title="Recarregar despesas da API"
          >
            <RefreshCw size={18} className={loading ? 'spinning' : ''} />
          </button>

          {/* Botão Nova Despesa */}
          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={onOpenModal}
          >
            <Plus size={18} />
            <span>Nova Despesa</span>
          </button>
        </div>
      </div>
    </header>
  );
}
