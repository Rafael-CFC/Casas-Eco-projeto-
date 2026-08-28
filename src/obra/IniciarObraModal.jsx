import React, { useState } from 'react';
import { PlayCircle, X, CalendarDays, RotateCcw } from 'lucide-react';
import { formatDateBR, todayISO, diasCorridos } from '../domain';

// Modal de "Iniciar obra": pergunta a data em que a obra REALMENTE começou.
// Serve também para corrigir a data depois (obra já iniciada) e para desfazer
// o início, caso tenha sido marcado por engano.
export default function IniciarObraModal({ obra, onCancelar, onConfirmar, onDesfazer }) {
  const jaIniciada = !!obra.inicioObraEm;
  const [data, setData] = useState(obra.inicioObraEm || todayISO());
  const [observacao, setObservacao] = useState(obra.observacoesInicio || '');

  const hoje = todayISO();
  const dias = data ? diasCorridos(data, hoje) : null;
  const futuro = !!data && data > hoje;
  const antesDoCadastro = !!data && !!obra.criadoEm && data < obra.criadoEm;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-popover w-full max-w-md animate-scale-in max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-stone-100 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
              <PlayCircle size={18} />
            </div>
            <div>
              <p className="text-base font-semibold text-stone-900">
                {jaIniciada ? 'Corrigir a data de início' : 'Iniciar esta obra'}
              </p>
              <p className="text-xs text-stone-500 mt-0.5">
                O contrato é assinado num dia e a obra começa em outro. Informe o dia em que a obra
                realmente começou — é a partir dele que os dias de obra são contados.
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
              <span className="text-stone-500">Cadastrada no sistema em</span>
              <span className="text-stone-800">{formatDateBR(obra.criadoEm)}</span>
            </div>
          </div>

          <div>
            <label className="eco-label">Data em que a obra começou</label>
            <input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="eco-input"
            />
            <p className="text-xs text-stone-400 mt-1 flex items-center gap-1">
              <CalendarDays size={12} className="flex-shrink-0" />
              {!data
                ? 'Escolha a data de início.'
                : futuro
                  ? `Início programado para ${formatDateBR(data)}. A contagem de dias começa nessa data.`
                  : `Contando a partir de ${formatDateBR(data)}, a obra está com ${dias} ${dias === 1 ? 'dia' : 'dias'}.`}
            </p>
            {antesDoCadastro && (
              <p className="text-xs text-amber-700 mt-1">
                Atenção: essa data é anterior ao cadastro da obra no sistema. Pode ser proposital
                (a obra começou antes de você cadastrar), só confira.
              </p>
            )}
          </div>

          <div>
            <label className="eco-label">Observação do início (opcional)</label>
            <textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Ex: começou pela terraplanagem, equipe de 4 pessoas..."
              rows={2}
              className="eco-input resize-none"
            />
          </div>

          {jaIniciada && (
            <button
              onClick={() => onDesfazer && onDesfazer()}
              className="text-xs text-stone-400 hover:text-red-600 flex items-center gap-1 transition-colors"
            >
              <RotateCcw size={12} /> Desfazer início da obra
            </button>
          )}
        </div>

        <div className="p-5 pt-0 flex justify-end gap-2">
          <button onClick={onCancelar} className="eco-btn-secondary eco-btn-sm">Cancelar</button>
          <button
            onClick={() => onConfirmar(data, observacao)}
            disabled={!data}
            className="eco-btn-primary eco-btn-sm"
          >
            <PlayCircle size={14} /> {jaIniciada ? 'Salvar data' : 'Iniciar obra'}
          </button>
        </div>
      </div>
    </div>
  );
}
