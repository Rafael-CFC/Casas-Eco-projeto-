import React, { useState } from 'react';
import { Wallet, X, Trash2, AlertTriangle } from 'lucide-react';
import { formatMoney, formatDateBR, todayISO, parsePrecoBR } from '../domain';
import {
  pagamentosDaParcela, valorPagoParcela, saldoParcela, statusParcela, STATUS_PARCELA,
} from './contratosStore';

// Modal de recebimento de uma parcela: registra quanto o cliente pagou (o
// valor cheio ou só um pedaço), lista o que já foi recebido e permite apagar
// um lançamento feito por engano.
export default function ModalPagamentoParcela({ parcela, onCancelar, onRegistrar, onRemover }) {
  const pagos = pagamentosDaParcela(parcela);
  const jaPago = valorPagoParcela(parcela);
  const falta = saldoParcela(parcela);
  const st = STATUS_PARCELA[statusParcela(parcela)];

  const [valorTexto, setValorTexto] = useState(falta > 0 ? String(falta).replace('.', ',') : '');
  const [data, setData] = useState(todayISO());
  const [observacao, setObservacao] = useState('');

  const valor = parsePrecoBR(valorTexto);
  const valorValido = !isNaN(valor) && valor > 0;
  const passaDoSaldo = valorValido && valor > falta + 0.005;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-popover w-full max-w-md animate-scale-in max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-stone-100 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <div className="w-9 h-9 rounded-full bg-green-50 text-green-600 flex items-center justify-center flex-shrink-0">
              <Wallet size={18} />
            </div>
            <div>
              <p className="text-base font-semibold text-stone-900">
                Parcela {parcela.ordem}{parcela.etapa ? ` — ${parcela.etapa}` : ''}
              </p>
              <p className="text-xs text-stone-500 mt-0.5">
                Registre o que o cliente pagou. Pode ser o valor cheio ou só uma parte.
              </p>
            </div>
          </div>
          <button onClick={onCancelar} className="text-stone-400 hover:text-stone-600 flex-shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-stone-50 rounded-lg p-2">
              <p className="text-[11px] text-stone-400">Valor da parcela</p>
              <p className="text-sm font-semibold text-stone-800">{formatMoney(parcela.valor)}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-2">
              <p className="text-[11px] text-green-700/70">Já pago</p>
              <p className="text-sm font-semibold text-green-800">{formatMoney(jaPago)}</p>
            </div>
            <div className={`rounded-lg p-2 ${falta > 0 ? 'bg-amber-50' : 'bg-stone-50'}`}>
              <p className={`text-[11px] ${falta > 0 ? 'text-amber-700/70' : 'text-stone-400'}`}>Falta</p>
              <p className={`text-sm font-semibold ${falta > 0 ? 'text-amber-700' : 'text-stone-500'}`}>
                {formatMoney(falta)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`eco-badge border ${st.cls}`}>{st.label}</span>
            {parcela.vencimento && (
              <span className="text-xs text-stone-400">vence {formatDateBR(parcela.vencimento)}</span>
            )}
          </div>

          {/* ---- novo recebimento ---- */}
          <div className="space-y-2.5">
            <p className="text-sm font-semibold text-stone-700">Novo recebimento</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="eco-label">Valor pago (R$)</label>
                <input
                  value={valorTexto}
                  onChange={(e) => setValorTexto(e.target.value)}
                  inputMode="decimal"
                  placeholder="0,00"
                  className="eco-input font-semibold"
                />
              </div>
              <div>
                <label className="eco-label">Data do pagamento</label>
                <input type="date" value={data} onChange={(e) => setData(e.target.value)} className="eco-input" />
              </div>
            </div>
            {falta > 0 && (
              <button
                onClick={() => setValorTexto(String(falta).replace('.', ','))}
                className="eco-btn-secondary eco-btn-xs"
              >
                Recebi tudo o que falta ({formatMoney(falta)})
              </button>
            )}
            <div>
              <label className="eco-label">Observação (opcional)</label>
              <input
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Ex: PIX, entrada em dinheiro, cheque..."
                className="eco-input"
              />
            </div>
            {passaDoSaldo && (
              <p className="text-xs text-amber-700 flex items-start gap-1">
                <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
                Esse valor é maior do que os {formatMoney(falta)} que faltavam. Dá para lançar assim mesmo
                (o excedente fica registrado como pago a mais), só confira.
              </p>
            )}
          </div>

          {/* ---- o que já foi recebido ---- */}
          <div>
            <p className="text-sm font-semibold text-stone-700 mb-1.5">Recebimentos lançados</p>
            {pagos.length === 0 ? (
              <p className="text-xs text-stone-400">Nada recebido nesta parcela ainda.</p>
            ) : (
              <div className="space-y-1.5">
                {pagos.map((pg) => (
                  <div key={pg.id} className="flex items-center gap-2 bg-stone-50 rounded-lg p-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-stone-800">{formatMoney(pg.valor)}</p>
                      <p className="text-xs text-stone-400 truncate">
                        {pg.data ? formatDateBR(pg.data) : 'sem data'}
                        {pg.observacao ? ` · ${pg.observacao}` : ''}
                        {pg.legado ? ' · lançado antes do controle de recebimentos' : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => onRemover(pg.id)}
                      aria-label={`Apagar recebimento de ${formatMoney(pg.valor)}`}
                      className="eco-icon-btn eco-icon-btn-danger w-7 h-7 flex-shrink-0"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-5 pt-0 flex justify-end gap-2">
          <button onClick={onCancelar} className="eco-btn-secondary eco-btn-sm">Fechar</button>
          <button
            onClick={() => onRegistrar({ valor, data, observacao })}
            disabled={!valorValido || !data}
            className="eco-btn-primary eco-btn-sm"
          >
            <Wallet size={14} /> Lançar recebimento
          </button>
        </div>
      </div>
    </div>
  );
}
