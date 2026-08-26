import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, X } from 'lucide-react';
import { formatMoney, parsePrecoBR, todayISO, CATEGORIAS } from '../domain';
import { mapearCategoriaBoletoParaLancamento } from './boletosStore';

// Renderizado num portal em document.body pelo mesmo motivo do painel de
// foto (ver SeletorFotoBoleto.jsx): este modal é aberto de dentro de
// <main>, que tem uma animação de entrada baseada em `transform` — sem o
// portal, um modal position:fixed ficaria preso atrás do menu inferior
// fixo no celular.
export default function ModalPagamento({ boleto, onCancelar, onConfirmar }) {
  const [dataPagamento, setDataPagamento] = useState(todayISO());
  const [valorPagoTexto, setValorPagoTexto] = useState(String(boleto.valor).replace('.', ','));
  const [observacaoPagamento, setObservacaoPagamento] = useState('');
  const [lancarComoDespesa, setLancarComoDespesa] = useState(false);

  const jaLancado = !!boleto.lancamentoGeradoId;

  function aoConfirmar(e) {
    e.preventDefault();
    const valorPago = parsePrecoBR(valorPagoTexto);
    onConfirmar({
      dataPagamento,
      valorPago: isNaN(valorPago) ? boleto.valor : valorPago,
      observacaoPagamento,
      lancarComoDespesa: lancarComoDespesa && !jaLancado,
    });
  }

  return createPortal((
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-fade-in">
      <form onSubmit={aoConfirmar} className="bg-white rounded-xl shadow-popover w-full max-w-md animate-scale-in max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-stone-100 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <div className="w-9 h-9 rounded-full bg-green-50 text-green-600 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <p className="text-base font-semibold text-stone-900">Marcar como pago</p>
              <p className="text-xs text-stone-500 mt-0.5">{boleto.beneficiario} · {formatMoney(boleto.valor)}</p>
            </div>
          </div>
          <button type="button" onClick={onCancelar} className="text-stone-400 hover:text-stone-600 flex-shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <div>
            <label className="eco-label">Data do pagamento</label>
            <input type="date" value={dataPagamento} onChange={(e) => setDataPagamento(e.target.value)} className="eco-input" required />
          </div>
          <div>
            <label className="eco-label">Valor pago</label>
            <input value={valorPagoTexto} onChange={(e) => setValorPagoTexto(e.target.value)} inputMode="decimal" className="eco-input" placeholder="0,00" />
          </div>
          <div>
            <label className="eco-label">Observação (opcional)</label>
            <textarea value={observacaoPagamento} onChange={(e) => setObservacaoPagamento(e.target.value)} className="eco-input" rows={2} />
          </div>

          {boleto.obraId && (
            jaLancado ? (
              <p className="text-xs text-stone-400 bg-stone-50 border border-stone-200 rounded-lg p-2.5">
                Este boleto já foi lançado como despesa da obra.
              </p>
            ) : (
              <label className="flex items-start gap-2 text-sm text-stone-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={lancarComoDespesa}
                  onChange={(e) => setLancarComoDespesa(e.target.checked)}
                  className="mt-0.5 text-green-700 focus:ring-green-500/40"
                />
                <span>
                  Também lançar como despesa da obra (categoria "{boleto.categoria}" → {CATEGORIAS[mapearCategoriaBoletoParaLancamento(boleto.categoria)].label})
                </span>
              </label>
            )
          )}
        </div>

        <div className="p-5 pt-0 flex gap-2">
          <button type="button" onClick={onCancelar} className="eco-btn-secondary flex-1">Cancelar</button>
          <button type="submit" className="eco-btn-primary flex-1">Confirmar pagamento</button>
        </div>
      </form>
    </div>
  ), document.body);
}
