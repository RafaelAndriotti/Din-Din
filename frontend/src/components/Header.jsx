import React from 'react';
import { LogOut, Moon, Plus, RefreshCw, Sun } from 'lucide-react';
import useTema from '../hooks/useTema';

const CONEXAO = {
  ready: { texto: 'API conectada', classe: 'on' },
  demo: { texto: 'Dados de exemplo', classe: 'off' },
  error: { texto: 'API indisponível', classe: 'error' }
};

// Sem onSair (tela de login), a barra mostra só a marca e o tema.
export default function Header({ status, onOpenModal, onRefresh, refreshing, onSair }) {
  const conexao = CONEXAO[status];
  const { tema, alternar } = useTema();
  const noturno = tema === 'dark';
  const logado = Boolean(onSair);

  return (
    <header className="app-header">
      <div className="header-inner">
        <span className="brand-name">Din-Din</span>

        <div className="header-actions">
          {logado && conexao && (
            <span className={`conn ${conexao.classe} hide-sm`}>
              <span className="conn-dot" aria-hidden="true" />
              {conexao.texto}
            </span>
          )}

          {logado && (
            <button
              type="button"
              className="icon-btn"
              onClick={onRefresh}
              disabled={refreshing}
              aria-label="Recarregar despesas"
            >
              <RefreshCw size={18} className={refreshing ? 'spinning' : ''} aria-hidden="true" />
            </button>
          )}

          <button
            type="button"
            className="icon-btn"
            onClick={alternar}
            aria-pressed={noturno}
            aria-label="Modo noturno"
            title={noturno ? 'Voltar ao modo claro' : 'Ativar modo noturno'}
          >
            {noturno ? (
              <Sun size={18} aria-hidden="true" />
            ) : (
              <Moon size={18} aria-hidden="true" />
            )}
          </button>

          {logado && (
            <>
              <button type="button" className="btn btn-on-bar hide-sm" onClick={onOpenModal}>
                <Plus size={18} aria-hidden="true" />
                Nova despesa
              </button>

              <button type="button" className="icon-btn" onClick={onSair} aria-label="Sair" title="Sair da conta">
                <LogOut size={18} aria-hidden="true" />
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
