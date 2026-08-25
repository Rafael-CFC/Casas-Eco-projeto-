import React, { useState } from 'react';
import { KeyRound, Loader2, X } from 'lucide-react';
import { trocarSenha } from './authStore';

// Usada em dois momentos: quando a pessoa chega pelo link de "esqueci minha
// senha" (aí `obrigatorio` é true e não dá para fechar) e quando ela mesma
// pede para trocar a senha dentro do sistema.
export default function TrocarSenha({ obrigatorio = false, onPronto, onFechar }) {
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    if (ocupado) return;
    setErro('');
    if (senha !== confirmacao) {
      setErro('As duas senhas não são iguais.');
      return;
    }
    setOcupado(true);
    try {
      const r = await trocarSenha(senha);
      if (!r.ok) { setErro(r.erro); return; }
      setSenha('');
      setConfirmacao('');
      onPronto?.();
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <form onSubmit={enviar} className="eco-card p-5 w-full max-w-sm shadow-popover animate-scale-in">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <p className="font-semibold text-stone-700 flex items-center gap-1.5">
              <KeyRound size={16} className="text-green-700" /> Nova senha
            </p>
            <p className="text-xs text-stone-400 mt-0.5">
              {obrigatorio ? 'Escolha a senha que você vai usar daqui pra frente.' : 'A senha antiga para de valer na hora.'}
            </p>
          </div>
          {!obrigatorio && (
            <button type="button" onClick={onFechar} className="eco-icon-btn flex-shrink-0"><X size={16} /></button>
          )}
        </div>

        {erro && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg mb-3">{erro}</div>
        )}

        <label className="eco-label" htmlFor="nova-senha">Senha nova (mínimo 8 caracteres)</label>
        <input
          id="nova-senha"
          type="password"
          autoComplete="new-password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required
          minLength={8}
          autoFocus
          className="eco-input mb-3"
        />

        <label className="eco-label" htmlFor="confirma-senha">Repita a senha nova</label>
        <input
          id="confirma-senha"
          type="password"
          autoComplete="new-password"
          value={confirmacao}
          onChange={(e) => setConfirmacao(e.target.value)}
          required
          minLength={8}
          className="eco-input mb-4"
        />

        <button type="submit" disabled={ocupado} className="eco-btn-primary w-full">
          {ocupado ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
          {ocupado ? 'Salvando…' : 'Salvar senha'}
        </button>
      </form>
    </div>
  );
}
