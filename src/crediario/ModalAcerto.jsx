import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Check } from 'lucide-react';
import { formatMoney, parsePrecoBR, todayISO } from '../domain';
import { FORMAS_ACERTO, nomeExibicao } from './crediarioStore';

// Baixa do crediário: normalmente é o desconto feito na mão de obra do
// montador, mas também aceita dinheiro/PIX quando ele prefere pagar.
export default function ModalAcerto({ montador, saldo, acertoEditando, onConfirmar, onFechar }) {
  const editando = Boolean(acertoEditando);
  const [data, setData] = useState(acertoEditando?.data || todayISO());
  const [valorTexto, setValorTexto] = useState(
    acertoEditando ? String(acertoEditando.valor).replace('.', ',') : (saldo > 0 ? String(saldo.toFixed(2)).replace('.', ',') : '')
  );
  const [forma, setForma] = useState(acertoEditando?.forma || 'desconto_mao_de_obra');
  const [observacao, setObservacao] = useState(acertoEditando?.observacao || '');
  const [erroLocal, setErroLocal] = useState('');

  const valor = parsePrecoBR(valorTexto);
  const valorValido = !isNaN(valor) && valor > 0;
  const saldoDepois = Math.round((saldo - (valorValido ? valor : 0)) * 100) / 100;

  function confirmar() {
    if (!valorValido) {
      setErroLocal('Informe um valor maior que zero.');
      return;
    }
    onConfirmar({ data, valor, forma, observacao });
  }

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-6 animate-fade-in">
      <div className="absolute inset-0 bg-black/40" onClick={onFechar} />
      <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-xl shadow-popover animate-scale-in p-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-stone-900">{editando ? 'Editar acerto' : 'Registrar acerto'}</p>
            <p className="text-xs text-stone-500">{nomeExibicao(montador)}</p>
          </div>
          <button onClick={onFechar} className="eco-icon-btn"><X size={16} /></button>
        </div>

        <div className="bg-stone-50 rounded-lg p-3">
          <p className="text-xs text-stone-400">Saldo em aberto hoje</p>
          <p className="text-xl font-semibold text-stone-900">{formatMoney(saldo)}</p>
        </div>

        <div className="flex gap-3">
          <div className="w-40">
            <label className="text-xs text-stone-500 block mb-1">Data</label>
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} className="eco-input" />
          </div>
          <div className="flex-1 min-w-0">
            <label className="text-xs text-stone-500 block mb-1">Valor descontado</label>
            <input
              value={valorTexto}
              onChange={(e) => { setValorTexto(e.target.value); setErroLocal(''); }}
              placeholder="0,00"
              inputMode="decimal"
              className="eco-input"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-stone-500 block mb-1">Como foi acertado</label>
          <select value={forma} onChange={(e) => setForma(e.target.value)} className="eco-input">
            {FORMAS_ACERTO.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs text-stone-500 block mb-1">Observação (opcional)</label>
          <input
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Ex: descontado no pagamento da obra do Zé"
            className="eco-input"
          />
        </div>

        {valorValido && (
          <p className="text-xs text-stone-500">
            Saldo depois desse acerto: <strong className={saldoDepois >= 0.01 ? 'text-stone-800' : 'text-green-700'}>{formatMoney(saldoDepois)}</strong>
            {saldoDepois < -0.01 && ' (ficou crédito a favor do montador)'}
          </p>
        )}

        {erroLocal && <p className="text-xs text-red-600">{erroLocal}</p>}

        <div className="flex justify-end gap-2">
          <button onClick={onFechar} className="eco-btn-secondary eco-btn-sm">Cancelar</button>
          <button onClick={confirmar} className="eco-btn-primary eco-btn-sm">
            <Check size={14} /> {editando ? 'Salvar' : 'Registrar acerto'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
