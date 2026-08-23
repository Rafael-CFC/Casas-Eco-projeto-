import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

function ToastItem({ tipo, mensagem, onFechar }) {
  const Icon = tipo === 'erro' ? AlertCircle : CheckCircle2;
  const estilos = tipo === 'erro'
    ? 'bg-white border-red-200 text-red-700'
    : 'bg-white border-green-200 text-green-700';
  const iconBg = tipo === 'erro' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600';
  return (
    <div
      role="status"
      className={`pointer-events-auto flex items-start gap-2.5 border rounded-xl shadow-popover px-3.5 py-3 max-w-sm animate-toast-in ${estilos}`}
    >
      <span className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <Icon size={14} />
      </span>
      <p className="text-sm leading-snug flex-1 pt-0.5">{mensagem}</p>
      <button
        onClick={onFechar}
        className="text-stone-300 hover:text-stone-500 transition-colors flex-shrink-0 p-0.5 -m-0.5"
        aria-label="Fechar"
      >
        <X size={14} />
      </button>
    </div>
  );
}

// Componente único que renderiza os dois canais de mensagem já existentes no
// app (aviso = sucesso, erro = erro) como toasts animados, sem mudar quando
// ou por que essas mensagens aparecem — só a apresentação visual.
function ToastSlot({ tipo, mensagem, onFechar }) {
  const [exibido, setExibido] = useState(null);
  const [saindo, setSaindo] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (mensagem) {
      setExibido(mensagem);
      setSaindo(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    } else if (exibido) {
      setSaindo(true);
      timeoutRef.current = setTimeout(() => {
        setExibido(null);
        setSaindo(false);
      }, 180);
    }
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mensagem]);

  if (!exibido) return null;

  return (
    <div className={saindo ? 'animate-toast-out' : ''}>
      <ToastItem tipo={tipo} mensagem={exibido} onFechar={onFechar} />
    </div>
  );
}

export default function ToastStack({ aviso, erro, onFecharAviso, onFecharErro }) {
  return (
    <div className="fixed z-[70] top-3 right-3 left-3 sm:left-auto sm:w-auto flex flex-col gap-2 items-stretch sm:items-end pointer-events-none">
      <ToastSlot tipo="erro" mensagem={erro} onFechar={onFecharErro} />
      <ToastSlot tipo="sucesso" mensagem={aviso} onFechar={onFecharAviso} />
    </div>
  );
}
