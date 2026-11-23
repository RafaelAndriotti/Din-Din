import React, { useState } from 'react';
import { CircleAlert } from 'lucide-react';
import Header from './Header';
import { criarConta, entrar } from '../services/api';

const MENSAGEM_POR_ERRO = {
  network: 'Sem conexão com o servidor. Confira se a API está rodando.',
  auth: 'E-mail ou senha incorretos.',
  conflict: 'Já existe uma conta com esse e-mail. Entre com ela.',
  validation: 'Confira o e-mail e a senha. A senha precisa ter pelo menos 8 caracteres.',
  rate_limit: 'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.'
};

// Entrar ou criar conta. Ao terminar, chama onEntrar(); o token já foi guardado pelo api.js.
export default function Login({ aviso, onEntrar }) {
  const [modo, setModo] = useState('entrar');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const criando = modo === 'criar';

  async function handleSubmit(e) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await (criando ? criarConta : entrar)(email, senha);
      onEntrar();
    } catch (err) {
      setErro(MENSAGEM_POR_ERRO[err.kind] ?? 'O servidor encontrou um erro. Tente de novo.');
      setEnviando(false);
    }
  }

  function alternarModo() {
    setModo(criando ? 'entrar' : 'criar');
    setErro(null);
  }

  const mensagem = erro ?? aviso;

  return (
    <div className="app-layout">
      <Header />
      <main className="page">
        <section className="auth" aria-labelledby="auth-titulo">
          <h1 id="auth-titulo" className="auth-titulo">{criando ? 'Criar conta' : 'Entrar'}</h1>
          <p className="auth-sub">
            {criando ? 'Suas despesas ficam visíveis só para você.' : 'Entre para ver as suas despesas.'}
          </p>

          <form className="auth-form" onSubmit={handleSubmit}>
            {mensagem && (
              <div className="form-alert" role="alert">
                <CircleAlert size={18} aria-hidden="true" />
                <span>{mensagem}</span>
              </div>
            )}

            <div className="field">
              <label htmlFor="auth-email">E-mail</label>
              <input
                id="auth-email"
                className="input"
                type="email"
                autoComplete="username"
                required
                maxLength={254}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="auth-senha">Senha</label>
              <input
                id="auth-senha"
                className="input"
                type="password"
                autoComplete={criando ? 'new-password' : 'current-password'}
                required
                minLength={criando ? 8 : undefined}
                maxLength={128}
                aria-describedby={criando ? 'auth-senha-dica' : undefined}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
              {criando && (
                <span className="hint" id="auth-senha-dica">
                  Pelo menos 8 caracteres.
                </span>
              )}
            </div>

            <button type="submit" className="btn btn-primary" disabled={enviando}>
              {enviando ? 'Aguarde…' : criando ? 'Criar conta' : 'Entrar'}
            </button>
          </form>

          <p className="auth-troca">
            {criando ? 'Já tem conta?' : 'Ainda não tem conta?'}{' '}
            <button type="button" className="link-btn" onClick={alternarModo}>
              {criando ? 'Entrar' : 'Criar conta'}
            </button>
          </p>
        </section>
      </main>
    </div>
  );
}
