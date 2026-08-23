import React, { useState } from 'react';
import { supabase } from './supabaseClient';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function entrar(e) {
    e.preventDefault();
    setErro('');
    setCarregando(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    });
    setCarregando(false);
    if (error) {
      setErro('E-mail ou senha incorretos.');
      return;
    }
    onLogin(data.session);
  }

  return (
    <div className="min-h-screen bg-emerald-50 flex items-center justify-center p-4">
      <form onSubmit={entrar} className="bg-white border border-stone-200 rounded-lg p-6 w-full max-w-sm">
        <div className="flex items-center gap-2 mb-6">
          <span className="w-10 h-10 rounded-full bg-green-700 flex items-center justify-center flex-shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </span>
          <div>
            <p className="font-bold text-green-800 text-sm tracking-tight">CASAS ECO</p>
            <p className="text-xs text-stone-400">Custo de Obra</p>
          </div>
        </div>

        {erro && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded mb-3">
            {erro}
          </div>
        )}

        <label className="text-xs text-stone-500 block mb-1">E-mail</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
          className="w-full border border-stone-300 rounded px-2 py-1.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-green-400"
        />

        <label className="text-xs text-stone-500 block mb-1">Senha</label>
        <input
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required
          className="w-full border border-stone-300 rounded px-2 py-1.5 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-green-400"
        />

        <button
          type="submit"
          disabled={carregando}
          className="w-full bg-green-700 text-white text-sm py-2 rounded hover:bg-green-800 disabled:opacity-60"
        >
          {carregando ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
