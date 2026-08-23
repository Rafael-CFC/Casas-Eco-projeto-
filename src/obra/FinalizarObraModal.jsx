import React, { useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { formatMoney, formatDateBR, CATEGORIAS } from '../domain';
import { calcularResumoObra } from './obraResumoCalc';

export default function FinalizarObraModal({ obra, lancamentos, onCancelar, onConfirmar }) {
  const [observacoes, setObservacoes] = useState(obra.observacoesFinais || '');
  const resumo = calcularResumoObra(obra, lancamentos, CATEGORIAS);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-popover w-full max-w-md animate-scale-in max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-stone-100 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <div className="w-9 h-9 rounded-full bg-green-50 text-green-600 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <p className="text-base font-semibold text-stone-900">Finalizar esta obra?</p>
              <p className="text-xs text-stone-500 mt-0.5">
                Você está prestes a finalizar esta obra. Após a finalização, os dados financeiros serão consolidados em um resumo da obra.
              </p>
            </div>
          </div>
          <button onClick={onCancelar} className="text-stone-400 hover:text-stone-600 flex-shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <div className="eco-card p-3 space-y-1.5 text-sm">
            <div className="flex justify-between gap-2">
              <span className="text-stone-500">Obra</span>
              <span className="font-medium text-stone-900 text-right">{obra.nome}</span>
            </div>
            {obra.cliente && (
              <div className="flex justify-between gap-2">
                <span className="text-stone-500">Cliente</span>
                <span className="font-medium text-stone-900 text-right">{obra.cliente}</span>
              </div>
            )}
            <div className="flex justify-between gap-2">
              <span className="text-stone-500">Data de início</span>
              <span className="text-stone-800">{formatDateBR(obra.criadoEm)}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-stone-500">Total gasto</span>
              <span className="font-semibold text-green-800">{formatMoney(resumo.totalGasto)}</span>
            </div>
            {resumo.orcamento != null && (
              <div className="flex justify-between gap-2">
                <span className="text-stone-500">Orçamento</span>
                <span className="text-stone-800">{formatMoney(resumo.orcamento)}</span>
              </div>
            )}
            <div className="flex justify-between gap-2">
              <span className="text-stone-500">Lançamentos registrados</span>
              <span className="text-stone-800">{resumo.qtdLancamentos}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-stone-500">Itens/materiais distintos</span>
              <span className="text-stone-800">{resumo.qtdItensDistintos}</span>
            </div>
          </div>

          <div>
            <label className="eco-label">Observações da obra (opcional)</label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Ex: obra entregue conforme projeto, pequeno ajuste no acabamento externo..."
              rows={3}
              className="eco-input resize-none"
            />
          </div>
        </div>

        <div className="p-5 pt-0 flex justify-end gap-2">
          <button onClick={onCancelar} className="eco-btn-secondary eco-btn-sm">Cancelar</button>
          <button onClick={() => onConfirmar(observacoes)} className="eco-btn-primary eco-btn-sm">
            <CheckCircle2 size={14} /> Finalizar obra
          </button>
        </div>
      </div>
    </div>
  );
}
