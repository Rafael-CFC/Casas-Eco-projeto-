import React, { useRef, useState } from 'react';
import { CornerDownLeft, Info, MessageSquare, Sparkles } from 'lucide-react';
import { perguntar, PERGUNTAS_SUGERIDAS } from './perguntas';

// A tela do Assistente Casas Eco.
//
// É uma conversa, mas a resposta não é texto solto: é o número que saiu
// da conta, com as linhas que formam esse número. Assim o dono pode
// conferir de onde veio — e quando a conta não existe, o assistente diz
// isso com todas as letras em vez de inventar.
//
// A tela é de propósito sem cara de "dashboard de IA": mesmo cartão,
// mesma tipografia e mesmas cores do resto do sistema.

function Barra({ fatia, alerta }) {
  return (
    <div className="w-full h-1 rounded-full bg-stone-100 overflow-hidden mt-1">
      <div
        className={`h-full ${alerta ? 'bg-red-500' : 'bg-green-600'}`}
        style={{ width: `${Math.max(2, Math.min(100, (fatia || 0) * 100))}%` }}
      />
    </div>
  );
}

function Resposta({ pergunta, resposta }) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-stone-500 flex items-start gap-1.5">
        <MessageSquare size={14} className="mt-0.5 flex-shrink-0 text-stone-300" />
        {pergunta}
      </p>

      {resposta.semDados ? (
        <div className="eco-card p-4 border-amber-200 bg-amber-50">
          <p className="text-sm text-amber-800">{resposta.motivo}</p>
          {resposta.sugestao && <p className="text-xs text-amber-700 mt-1">{resposta.sugestao}</p>}
        </div>
      ) : (
        <div className="eco-card p-4">
          <p className="text-xs text-stone-400">{resposta.titulo}</p>
          <p className="text-xl font-semibold text-stone-900 mt-0.5 break-words">{resposta.valor}</p>
          {resposta.detalhe && <p className="text-xs text-stone-500 mt-1">{resposta.detalhe}</p>}

          {resposta.linhas && resposta.linhas.length > 0 && (
            <div className="mt-3 space-y-2">
              {resposta.linhas.map((l, i) => (
                <div key={`${l.rotulo}-${i}`}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate text-stone-600">{l.rotulo}</span>
                    <span className={`flex-shrink-0 tabular-nums ${l.alerta ? 'text-red-600 font-medium' : 'text-stone-700'}`}>
                      {l.valor}
                    </span>
                  </div>
                  <Barra fatia={l.fatia} alerta={l.alerta} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Assistente({ lancamentos, obras, contas, hojeISO }) {
  const [texto, setTexto] = useState('');
  const [conversa, setConversa] = useState([]);
  const campoRef = useRef(null);

  function enviar(pergunta) {
    const p = String(pergunta == null ? texto : pergunta).trim();
    if (!p) return;
    const { resposta } = perguntar(p, { lancamentos, obras, contas, hojeISO });
    setConversa((c) => [{ id: `${Date.now()}`, pergunta: p, resposta }, ...c]);
    setTexto('');
    if (campoRef.current) campoRef.current.focus();
  }

  return (
    <div className="space-y-5">
      <div className="eco-card p-4">
        <div className="flex items-start gap-2">
          <Sparkles size={18} className="text-green-700 flex-shrink-0 mt-2" />
          <div className="flex-1 min-w-0">
            <div className="flex gap-2">
              <input
                ref={campoRef}
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') enviar(); }}
                placeholder="Pergunte sobre as obras: quanto gastamos, onde está indo o dinheiro…"
                className="eco-input flex-1 min-w-0"
              />
              <button type="button" onClick={() => enviar()} disabled={!texto.trim()} className="eco-btn-primary flex-shrink-0">
                <CornerDownLeft size={15} /> <span className="hidden sm:inline">Perguntar</span>
              </button>
            </div>
            <p className="text-[11px] text-stone-400 mt-1.5 flex items-start gap-1">
              <Info size={11} className="mt-0.5 flex-shrink-0" />
              As respostas saem dos seus lançamentos, obras e contas. O que não estiver lançado no
              sistema, o assistente não sabe — e ele diz quando não sabe, em vez de chutar.
            </p>
          </div>
        </div>
      </div>

      {conversa.length === 0 && (
        <div>
          <p className="text-xs text-stone-400 mb-2">Perguntas que ele sabe responder:</p>
          <div className="flex flex-wrap gap-1.5">
            {PERGUNTAS_SUGERIDAS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => enviar(p)}
                className="text-xs px-2.5 py-1.5 rounded-full border border-stone-200 bg-white text-stone-600 hover:border-green-300 hover:text-green-800 transition-colors"
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-5">
        {conversa.map((c) => (
          <Resposta key={c.id} pergunta={c.pergunta} resposta={c.resposta} />
        ))}
      </div>

      {conversa.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {PERGUNTAS_SUGERIDAS.slice(0, 5).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => enviar(p)}
              className="text-xs px-2.5 py-1.5 rounded-full border border-stone-200 bg-white text-stone-500 hover:border-green-300 hover:text-green-800 transition-colors"
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
