import React from 'react';
import { CheckCircle2, ClipboardCheck } from 'lucide-react';

export default function SucessoFinalizacaoModal({ obra, onFechar, onVerResumo }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-popover w-full max-w-sm p-6 animate-scale-in text-center">
        <div className="w-16 h-16 rounded-full bg-green-50 text-green-600 flex items-center justify-center mx-auto mb-4 animate-scale-in">
          <CheckCircle2 size={32} />
        </div>
        <p className="text-lg font-semibold text-stone-900">Obra concluída!</p>
        <p className="text-sm text-stone-500 mt-1">
          "{obra.nome}" foi finalizada. Resumo financeiro gerado com sucesso.
        </p>
        <div className="flex flex-col gap-2 mt-5">
          <button onClick={onVerResumo} className="eco-btn-primary w-full">
            <ClipboardCheck size={15} /> Ver resumo final
          </button>
          <button onClick={onFechar} className="eco-btn-secondary w-full">Fechar</button>
        </div>
      </div>
    </div>
  );
}
