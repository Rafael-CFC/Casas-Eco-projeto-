import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Loader2 } from 'lucide-react';
import './index.css';
import './storageAdapter'; // prepara o window.storage antes de tudo
import App from './App.jsx';
import Login from './Login.jsx';
import AppVenda from './venda/AppVenda.jsx';
import TrocarSenha from './auth/TrocarSenha.jsx';
import { aoMudarSessao, papelDoUsuario, sessaoAtual } from './auth/authStore';
import { aplicarTema, temaAtivo } from './ui/temaStore';

// O tema já entra aplicado pelo trecho no index.html (evita a tela piscar
// branca antes de carregar). Aqui é só a garantia de que ele continua
// certo se aquele trecho não tiver rodado.
aplicarTema(temaAtivo());

function Carregando() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <Loader2 size={26} className="animate-spin text-green-700" />
    </div>
  );
}

function Root() {
  // undefined = ainda perguntando ao servidor; null = ninguém logado
  const [sessao, setSessao] = useState(undefined);
  const [papel, setPapel] = useState(null);
  // quando a pessoa chega pelo link de "esqueci minha senha", o Supabase
  // abre uma sessão temporária só para ela cadastrar a senha nova
  const [recuperandoSenha, setRecuperandoSenha] = useState(false);

  useEffect(() => {
    let vivo = true;
    sessaoAtual().then((s) => { if (vivo) setSessao(s); });
    const cancelar = aoMudarSessao((s) => {
      if (!vivo) return;
      setSessao(s);
      if (!s) setPapel(null);
    });
    // o Supabase avisa pelo evento PASSWORD_RECOVERY, mas ele chega antes
    // do React montar; o rastro fica no endereço da página
    const marca = window.location.hash || '';
    if (marca.includes('type=recovery')) setRecuperandoSenha(true);
    return () => { vivo = false; cancelar(); };
  }, []);

  // Descobre se a conta é do dono ou de funcionário. Isso decide qual tela
  // montar; quem decide o que a conta pode LER é o banco de dados.
  useEffect(() => {
    if (!sessao) return;
    let vivo = true;
    papelDoUsuario().then((p) => { if (vivo) setPapel(p); });
    return () => { vivo = false; };
  }, [sessao?.user?.id]);

  if (sessao === undefined) return <Carregando />;
  if (!sessao) return <Login />;

  if (recuperandoSenha) {
    return (
      <TrocarSenha
        obrigatorio
        onPronto={() => {
          setRecuperandoSenha(false);
          window.location.hash = '';
        }}
      />
    );
  }

  if (papel === null) return <Carregando />;
  if (papel === 'funcionario') return <AppVenda email={sessao.user?.email} />;

  return <App usuario={sessao.user} />;
}

createRoot(document.getElementById('root')).render(<Root />);
