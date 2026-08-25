import React, { useState } from 'react';
import { LogOut, KeyRound } from 'lucide-react';
import OrcamentoVenda from './OrcamentoVenda';
import TrocarSenha from '../auth/TrocarSenha';
import { sair } from '../auth/authStore';

// Tela do funcionário: só a tabela de preços das madeiras e o orçamento.
//
// Não é só a barra de navegação que some — a conta dele não tem permissão
// no banco para ler obras, contratos, boletos ou lançamentos. Mesmo que
// alguém tente pedir esses dados por fora do site, o banco não entrega.
// A tabela de preços de venda vem do próprio código do site, então esta
// tela funciona sem tocar no banco.
export default function AppVenda({ email }) {
  const [aviso, setAviso] = useState('');
  const [erro, setErro] = useState('');
  const [trocandoSenha, setTrocandoSenha] = useState(false);

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800">
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-stone-200 px-4 py-3 flex items-center gap-3">
        <img src="/logo-casas-eco.jpeg" alt="Casas Eco" className="h-8 w-8 object-contain rounded flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-semibold text-stone-900 truncate">Orçamento de madeiras</h1>
          <p className="text-xs text-stone-400 truncate">{email}</p>
        </div>
        <button onClick={() => setTrocandoSenha(true)} className="eco-icon-btn flex-shrink-0" title="Trocar minha senha">
          <KeyRound size={16} />
        </button>
        <button onClick={sair} className="eco-icon-btn flex-shrink-0" title="Sair">
          <LogOut size={16} />
        </button>
      </header>

      {(aviso || erro) && (
        <div className="max-w-3xl mx-auto px-4 pt-3">
          <div className={`text-sm px-3 py-2 rounded-lg border ${erro ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-800'}`}>
            {erro || aviso}
          </div>
        </div>
      )}

      <main className="w-full max-w-3xl mx-auto px-4 py-5">
        <OrcamentoVenda onAviso={setAviso} onErro={setErro} />
        {/* Se o próprio dono cair aqui é porque a conta dele não foi marcada
            como dona no banco. Sem esse aviso a tela só pareceria errada. */}
        <p className="text-[11px] text-stone-400 text-center mt-6 leading-relaxed">
          Esta conta tem acesso só ao orçamento de madeiras.<br />
          Se você é o dono e caiu aqui, falta marcar seu e-mail como <strong>dono</strong> no
          Supabase (passo 5 do <code>schema.sql</code>).
        </p>
      </main>

      {trocandoSenha && (
        <TrocarSenha
          onFechar={() => setTrocandoSenha(false)}
          onPronto={() => { setTrocandoSenha(false); setAviso('Senha trocada.'); }}
        />
      )}
    </div>
  );
}
