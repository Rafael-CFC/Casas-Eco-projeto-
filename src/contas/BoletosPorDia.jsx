import React, { useMemo, useState } from 'react';
import { AlertTriangle, CalendarClock, CalendarDays, Sun, Wallet } from 'lucide-react';
import { formatMoney, formatDateBR, todayISO } from '../domain';
import { StatCard } from '../dashboard/FinanceiroDashboard';
import { boletosPorDia, boletosVencidos, nomeDaConta, somarContas } from './contasCalc';

const PERIODOS = [[7, '7 dias'], [15, '15 dias'], [30, '30 dias']];

// Uma linha de boleto: quem cobra, quanto, e o botão de dar baixa.
function LinhaBoleto({ conta, onMarcarPaga }) {
  const paga = conta.status === 'pago';
  return (
    <div className="px-3 py-2 border-t border-stone-100 first:border-t-0 flex items-center justify-between gap-2">
      <p className={`text-sm truncate ${paga ? 'line-through text-stone-400' : 'text-stone-800'}`}>
        {nomeDaConta(conta)}
      </p>
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className={`text-sm font-medium whitespace-nowrap ${paga ? 'text-stone-400' : 'text-stone-800'}`}>
          {formatMoney(conta.valor)}
        </span>
        {onMarcarPaga && (
          <button
            onClick={() => onMarcarPaga(conta.id)}
            className={`text-xs px-2 py-1 rounded-lg border transition-colors duration-150 active:scale-[0.97] ${
              paga ? 'border-stone-300 text-stone-500' : 'border-green-300 text-green-700 hover:bg-green-50'
            }`}
          >
            {paga ? 'Reabrir' : 'Paga'}
          </button>
        )}
      </div>
    </div>
  );
}

// Um dia da agenda. O nome do dia da semana vem na frente porque é assim
// que a semana é falada ("na quinta vence a Albertina"), e a data logo
// atrás para não ter dúvida de qual quinta é.
function Dia({ dia, onMarcarPaga }) {
  const vazio = dia.quantidade === 0;
  const marca = dia.ehHoje ? 'Hoje' : dia.ehAmanha ? 'Amanhã' : '';

  const corCabecalho = dia.ehHoje
    ? 'bg-green-50 border-green-200 text-green-800'
    : vazio
      ? 'bg-stone-50 border-stone-200 text-stone-400'
      : 'bg-stone-50 border-stone-200 text-stone-700';

  return (
    <div>
      <div className={`text-sm px-3 py-1.5 border rounded-t flex items-center justify-between gap-2 flex-wrap ${corCabecalho} ${vazio ? 'rounded-b' : ''}`}>
        <span className="flex items-center gap-1.5 min-w-0">
          <span className="font-medium">{dia.nomeDia}</span>
          <span className="text-xs opacity-70 whitespace-nowrap">{formatDateBR(dia.iso)}</span>
          {marca && (
            <span className={`eco-badge border whitespace-nowrap ${
              dia.ehHoje ? 'bg-green-100 text-green-800 border-green-300' : 'bg-white text-stone-500 border-stone-200'
            }`}>
              {marca}
            </span>
          )}
          {dia.fimDeSemana && !vazio && (
            <span className="eco-badge border bg-amber-50 text-amber-700 border-amber-200 whitespace-nowrap">
              fim de semana
            </span>
          )}
        </span>
        <span className="whitespace-nowrap">
          {vazio ? (
            <span className="text-xs">nada vence</span>
          ) : (
            <>
              <span className="text-xs opacity-70 mr-2">
                {dia.quantidade} {dia.quantidade === 1 ? 'boleto' : 'boletos'}
              </span>
              <span className="font-medium">{formatMoney(dia.total)}</span>
            </>
          )}
        </span>
      </div>
      {!vazio && (
        <div className="bg-white border border-t-0 border-stone-200 rounded-b-lg overflow-hidden">
          {dia.contas.map((c) => (
            <LinhaBoleto key={c.id} conta={c} onMarcarPaga={onMarcarPaga} />
          ))}
        </div>
      )}
    </div>
  );
}

// A agenda dos boletos: hoje, amanhã e assim por diante, cada dia com o
// nome da semana na frente. É a tela de "o que eu pago essa semana".
export default function BoletosPorDia({ contas, onMarcarPaga }) {
  const hoje = todayISO();
  const [quantosDias, setQuantosDias] = useState(7);
  const [incluirPagas, setIncluirPagas] = useState(false);
  const [esconderVazios, setEsconderVazios] = useState(false);

  const vencidos = useMemo(() => boletosVencidos(contas, hoje), [contas, hoje]);
  const agenda = useMemo(
    () => boletosPorDia(contas, hoje, quantosDias, { incluirPagas }),
    [contas, hoje, quantosDias, incluirPagas]
  );

  const dias = esconderVazios ? agenda.filter((d) => d.quantidade > 0) : agenda;
  const totalPeriodo = agenda.reduce((a, d) => a + d.total, 0);
  const boletosPeriodo = agenda.reduce((a, d) => a + d.quantidade, 0);
  const diasComBoleto = agenda.filter((d) => d.quantidade > 0).length;
  const deHoje = agenda[0];
  const deAmanha = agenda[1];

  if (contas.length === 0) {
    return (
      <p className="text-center text-stone-400 py-12">
        Nenhuma conta registrada ainda. Registre na aba "Registrar" para os boletos aparecerem aqui por dia.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {/* ---- o resumo dos próximos dias ---- */}
      <div>
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <div>
            <p className="text-sm font-semibold text-stone-700">Boletos dia a dia</p>
            <p className="text-xs text-stone-400">
              A partir de hoje, {deHoje.nomeDia.toLowerCase()} ({formatDateBR(hoje)}). Cada dia com o nome da semana.
            </p>
          </div>
          <div className="flex gap-1 bg-stone-100 rounded-md p-0.5">
            {PERIODOS.map(([dias_, label]) => (
              <button
                key={dias_}
                onClick={() => setQuantosDias(dias_)}
                className={`text-xs px-2.5 py-1 rounded ${
                  quantosDias === dias_ ? 'bg-white text-green-700 shadow-sm font-medium' : 'text-stone-500'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Vence hoje" numero={deHoje.total} formatar={formatMoney}
            sub={`${deHoje.quantidade} boleto(s) · ${deHoje.nomeDia}`} icon={Sun}
            tone={deHoje.total > 0 ? 'warn' : 'default'}
          />
          <StatCard
            label="Vence amanhã" numero={deAmanha ? deAmanha.total : 0} formatar={formatMoney}
            sub={deAmanha ? `${deAmanha.quantidade} boleto(s) · ${deAmanha.nomeDia}` : '—'}
            icon={CalendarClock}
          />
          <StatCard
            label={`Nos ${quantosDias} dias`} numero={totalPeriodo} formatar={formatMoney}
            sub={`${boletosPeriodo} boleto(s) em ${diasComBoleto} dia(s)`} icon={Wallet}
          />
          <StatCard
            label="Já vencidos" numero={somarContas(vencidos)} formatar={formatMoney}
            sub={`${vencidos.length} boleto(s) atrasado(s)`} icon={AlertTriangle}
            tone={vencidos.length > 0 ? 'bad' : 'default'}
          />
        </div>
      </div>

      {/* ---- o que já passou do dia fica em cima, separado ---- */}
      {vencidos.length > 0 && (
        <div>
          <div className="text-sm font-medium px-3 py-1.5 rounded-t border bg-red-50 border-red-200 text-red-700 flex justify-between gap-2">
            <span>Já venceram ({vencidos.length})</span>
            <span className="whitespace-nowrap">{formatMoney(somarContas(vencidos))}</span>
          </div>
          <div className="bg-white border border-t-0 border-stone-200 rounded-b-lg overflow-hidden">
            {vencidos.map((c) => (
              <div key={c.id} className="px-3 py-2 border-t border-stone-100 first:border-t-0 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm text-stone-800 truncate">{nomeDaConta(c)}</p>
                  <p className="text-xs text-red-600">venceu {formatDateBR(c.vencimento)}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-sm font-medium text-stone-800 whitespace-nowrap">{formatMoney(c.valor)}</span>
                  {onMarcarPaga && (
                    <button
                      onClick={() => onMarcarPaga(c.id)}
                      className="text-xs px-2 py-1 rounded-lg border border-green-300 text-green-700 hover:bg-green-50 transition-colors duration-150 active:scale-[0.97]"
                    >
                      Paga
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---- os dias, um embaixo do outro ---- */}
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-1.5 text-xs text-stone-500 cursor-pointer">
          <input type="checkbox" checked={esconderVazios} onChange={(e) => setEsconderVazios(e.target.checked)}
            className="rounded border-stone-300" />
          Mostrar só os dias que têm boleto
        </label>
        <label className="flex items-center gap-1.5 text-xs text-stone-500 cursor-pointer">
          <input type="checkbox" checked={incluirPagas} onChange={(e) => setIncluirPagas(e.target.checked)}
            className="rounded border-stone-300" />
          Mostrar também as já pagas
        </label>
      </div>

      {dias.length === 0 ? (
        <p className="text-center text-stone-400 py-10">
          Nenhum boleto vence nos próximos {quantosDias} dias.
        </p>
      ) : (
        <div className="space-y-2">
          {dias.map((d) => (
            <Dia key={d.iso} dia={d} onMarcarPaga={onMarcarPaga} />
          ))}
        </div>
      )}

      <p className="text-[11px] text-stone-400">
        Só entram boletos com vencimento anotado. Os pagos ficam de fora, a não ser que você marque a
        opção acima — e o que já venceu aparece no bloco vermelho, não nos dias.
      </p>
    </div>
  );
}
