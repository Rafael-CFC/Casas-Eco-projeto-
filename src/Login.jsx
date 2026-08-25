import React, { useState } from 'react';
import { LogIn, Loader2, KeyRound, ArrowLeft } from 'lucide-react';
import { entrar, enviarRecuperacaoDeSenha } from './auth/authStore';

// Tela de entrada. A senha NÃO fica guardada aqui nem em lugar nenhum do
// site — quem confere é o servidor do Supabase.
export default function Login() {
  const [modo, setModo] = useState('entrar'); // 'entrar' | 'recuperar'
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [ocupado, setOcupado] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    if (ocupado) return;
    setErro('');
    setAviso('');
    setOcupado(true);
    try {
      if (modo === 'recuperar') {
        const r = await enviarRecuperacaoDeSenha(email);
        if (r.ok) {
          setAviso('Se existir uma conta com esse e-mail, o link para trocar a senha chegou na caixa de entrada.');
        } else {
          setErro(r.erro);
        }
        return;
      }
      const r = await entrar(email, senha);
      if (!r.ok) {
        setErro(r.erro);
        setSenha('');
      }
      // deu certo: quem troca de tela é o main.jsx, avisado pela sessão
    } finally {
      setOcupado(false);
    }
  }

  function trocarModo(novo) {
    setModo(novo);
    setErro('');
    setAviso('');
    setSenha('');
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

      <form
        onSubmit={enviar}
        className="relative z-10 bg-white/95 backdrop-blur-sm border border-white/20 rounded-xl p-6 w-full max-w-sm shadow-popover animate-scale-in"
      >
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
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg mb-3 animate-fade-in-up">
            {erro}
          </div>
        )}
        {aviso && (
          <div className="bg-green-50 border border-green-200 text-green-800 text-sm px-3 py-2 rounded-lg mb-3 animate-fade-in-up">
            {aviso}
          </div>
        )}

        <label className="eco-label" htmlFor="login-email">E-mail</label>
        <input
          id="login-email"
          type="email"
          autoComplete="username"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
          className="eco-input mb-3"
        />

        {modo === 'entrar' && (
          <>
            <label className="eco-label" htmlFor="login-senha">Senha</label>
            <input
              id="login-senha"
              type="password"
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              className="eco-input mb-4"
            />
          </>
        )}

        {modo === 'recuperar' && (
          <p className="text-xs text-stone-500 mb-4">
            Enviamos um link para você criar uma senha nova.
          </p>
        )}

        <button type="submit" disabled={ocupado} className="eco-btn-primary w-full">
          {ocupado ? <Loader2 size={16} className="animate-spin" /> : modo === 'entrar' ? <LogIn size={16} /> : <KeyRound size={16} />}
          {ocupado ? 'Aguarde…' : modo === 'entrar' ? 'Entrar' : 'Enviar link'}
        </button>

        <button
          type="button"
          onClick={() => trocarModo(modo === 'entrar' ? 'recuperar' : 'entrar')}
          className="w-full text-xs text-stone-500 hover:text-green-700 mt-3 flex items-center justify-center gap-1"
        >
          {modo === 'entrar' ? 'Esqueci minha senha' : (<><ArrowLeft size={12} /> Voltar para o login</>)}
        </button>
      </form>
    </div>
  );
}
