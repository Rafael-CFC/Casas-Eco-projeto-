import React, { useState } from 'react';

// Troque a senha aqui quando quiser.
const SENHA_DO_SITE = '1234';

export default function Login({ onLogin }) {
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');

  function entrar(e) {
    e.preventDefault();
    if (senha === SENHA_DO_SITE) {
      try {
        localStorage.setItem('casaseco-autenticado', 'sim');
      } catch (err) {
        // se o navegador bloquear localStorage, só segue sem lembrar
      }
      onLogin();
    } else {
      setErro('Senha incorreta.');
      setSenha('');
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-stone-900">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: 'url(/loja-fundo.jpg)',
          animation: 'zoomFundo 22s ease-in-out infinite alternate',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-green-950/70" />

      <style>{`
        @keyframes zoomFundo {
          0% { transform: scale(1); }
          100% { transform: scale(1.12); }
        }
      `}</style>

      <form onSubmit={entrar} className="relative z-10 bg-white/95 backdrop-blur-sm border border-white/20 rounded-lg p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center gap-2 mb-6">
          <img
            src="/logo-casas-eco.jpeg"
            alt="Casas Eco"
            className="h-12 w-auto object-contain rounded flex-shrink-0"
          />
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

        <label className="text-xs text-stone-500 block mb-1">Senha de acesso</label>
        <input
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required
          autoFocus
          className="w-full border border-stone-300 rounded px-2 py-1.5 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-green-400"
        />

        <button
          type="submit"
          className="w-full bg-green-700 text-white text-sm py-2 rounded hover:bg-green-800"
        >
          Entrar
        </button>
      </form>
    </div>
  );
}
