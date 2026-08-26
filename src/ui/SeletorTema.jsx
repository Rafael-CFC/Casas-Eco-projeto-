import React from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { TEMAS, ehEscuro } from './temaStore';
import usarTema from './usarTema';

const ICONES = { escuro: Moon, claro: Sun, sistema: Monitor };

// Botão de trocar o tema (escuro / claro / automático).
//
// `modo="trilho"`  — os três lado a lado, para a barra lateral e o menu
//                    "Mais" do celular.
// `modo="botao"`   — um botão só, que alterna entre escuro e claro; usado
//                    onde não cabe o trilho (cabeçalho do funcionário).
export default function SeletorTema({ modo = 'trilho', className = '' }) {
  const [tema, definirTema] = usarTema();

  if (modo === 'botao') {
    const escuro = ehEscuro(tema);
    const Icone = escuro ? Sun : Moon;
    return (
      <button
        type="button"
        onClick={() => definirTema(escuro ? 'claro' : 'escuro')}
        className={`eco-icon-btn flex-shrink-0 ${className}`}
        title={escuro ? 'Mudar para o modo claro' : 'Mudar para o modo escuro'}
        aria-label={escuro ? 'Mudar para o modo claro' : 'Mudar para o modo escuro'}
      >
        <Icone size={16} />
      </button>
    );
  }

  return (
    <div
      className={`flex bg-stone-100 rounded-lg p-1 gap-0.5 ${className}`}
      role="group"
      aria-label="Tema do site"
    >
      {TEMAS.map((t) => {
        const Icone = ICONES[t.key];
        const ativo = tema === t.key;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => definirTema(t.key)}
            title={t.label}
            aria-pressed={ativo}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs transition-colors duration-150 ${
              ativo ? 'bg-white text-green-700 shadow-sm font-medium' : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            <Icone size={14} />
            <span className="truncate">{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}
