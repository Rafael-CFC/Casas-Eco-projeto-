import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, CornerDownLeft } from 'lucide-react';
import { buscaGlobal } from './analiseCalc';

// Busca única que procura em obras, contratos, clientes, contas,
// fornecedores, produtos, contas e materiais comprados — e leva direto
// para o lugar do resultado.
export default function BuscaGlobal({ aberto, onFechar, dados, onIr }) {
  const [termo, setTermo] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (aberto) {
      setTermo('');
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (e) => { if (e.key === 'Escape') onFechar(); };
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [aberto, onFechar]);

  const grupos = useMemo(() => (aberto ? buscaGlobal(termo, dados) : []), [aberto, termo, dados]);
  const totalResultados = grupos.reduce((a, g) => a + g.itens.length, 0);

  if (!aberto) return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-start justify-center p-3 sm:p-6 animate-fade-in">
      <div className="absolute inset-0 bg-black/40" onClick={onFechar} />
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-popover animate-scale-in mt-4 sm:mt-16 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-stone-100">
          <Search size={18} className="text-stone-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder="Buscar obra, cliente, contrato, conta, material, fornecedor…"
            className="flex-1 min-w-0 text-sm outline-none placeholder:text-stone-400"
          />
          <button onClick={onFechar} className="eco-icon-btn flex-shrink-0">
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto">
          {termo.trim().length < 2 ? (
            <p className="px-4 py-8 text-center text-sm text-stone-400">Digite ao menos 2 letras para buscar.</p>
          ) : totalResultados === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-stone-400">Nada encontrado para "{termo.trim()}".</p>
          ) : (
            grupos.map((g) => (
              <div key={g.titulo} className="py-1.5">
                <p className="px-4 py-1 text-[11px] font-semibold text-stone-400 uppercase tracking-wide">{g.titulo}</p>
                {g.itens.map((item) => (
                  <button
                    key={`${g.titulo}-${item.id}`}
                    onClick={() => { onIr(item.destino); onFechar(); }}
                    className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-stone-50 transition-colors group"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-stone-800 truncate">{item.titulo}</p>
                      <p className="text-xs text-stone-400 truncate">{item.subtitulo}</p>
                    </div>
                    <CornerDownLeft size={13} className="text-stone-300 opacity-0 group-hover:opacity-100 flex-shrink-0" />
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
