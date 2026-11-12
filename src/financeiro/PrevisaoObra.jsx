import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, TrendingUp, Target, Gauge, Scale } from 'lucide-react';
import { formatMoney, formatDateBR } from '../domain';
import {
  previstoVersusRealizado, previsaoCustoFinal, ritmoDeGasto, compararComSemelhantes,
} from './previsao';

// A obra vista para a frente, não só para trás.
//
// Quatro perguntas, cada uma respondida com o número que a sustenta e com
// a base da conta escrita do lado. Quando os dados não dão para responder,
// aparece o motivo — nunca um número estimado sem origem.

function Caixa({ icon: Icon, titulo, children }) {
  return (
    <div className="rounded-lg border border-stone-200 p-3">
      <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide flex items-center gap-1.5 mb-2">
        <Icon size={13} /> {titulo}
      </p>
      {children}
    </div>
  );
}

function SemDados({ children }) {
  return <p className="text-xs text-stone-400 leading-snug">{children}</p>;
}

function Barra({ pct, estourou }) {
  return (
    <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden mt-1.5">
      <div
        className={`h-full ${estourou ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-green-500'}`}
        style={{ width: `${Math.min(100, Math.max(0, pct || 0))}%` }}
      />
    </div>
  );
}

export default function PrevisaoObra({ obra, etapas, lancamentos, obras, hojeISO }) {
  const [aberto, setAberto] = useState(false);

  // Só calcula quando a seção está aberta: são contas que varrem todos os
  // lançamentos de todas as obras, e na tela fechada ninguém está vendo.
  const dados = useMemo(() => {
    if (!aberto) return null;
    return {
      pvr: previstoVersusRealizado(obra, etapas, lancamentos),
      previsao: previsaoCustoFinal(obra, etapas, lancamentos, hojeISO),
      ritmo: ritmoDeGasto(obra, lancamentos, hojeISO),
      comparacao: compararComSemelhantes(obra, obras, lancamentos, hojeISO),
    };
  }, [aberto, obra, etapas, lancamentos, obras, hojeISO]);

  return (
    <div className="eco-card p-4">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="w-full flex items-center justify-between gap-2 text-left"
      >
        <span className="text-sm font-semibold text-stone-700 flex items-center gap-2">
          <TrendingUp size={16} /> Previsão desta obra
        </span>
        {aberto ? <ChevronUp size={16} className="text-stone-400" /> : <ChevronDown size={16} className="text-stone-400" />}
      </button>
      {!aberto && (
        <p className="text-xs text-stone-400 mt-1.5">
          Previsto × realizado por etapa, previsão de custo final, ritmo de gasto e comparação com obras de porte parecido.
        </p>
      )}

      {aberto && dados && (
        <div className="mt-3 space-y-3">
          {/* ---- 1. previsto x realizado ---- */}
          <Caixa icon={Target} titulo="Previsto × realizado, por etapa">
            {dados.pvr.linhas.length === 0 ? (
              <SemDados>
                Esta obra não tem etapas. Criando etapas com orçamento (fundação, alvenaria,
                cobertura…) aqui aparece onde o dinheiro está estourando dentro da obra.
              </SemDados>
            ) : (
              <>
                <div className="space-y-2">
                  {dados.pvr.linhas.map((et) => (
                    <div key={et.id}>
                      <div className="flex items-baseline justify-between gap-2 text-sm">
                        <span className="text-stone-700 truncate">{et.nome}</span>
                        <span className="tabular-nums text-stone-600 flex-shrink-0">
                          {formatMoney(et.realizado)}
                          {et.previsto != null && <span className="text-stone-400"> / {formatMoney(et.previsto)}</span>}
                        </span>
                      </div>
                      {et.previsto != null ? (
                        <>
                          <Barra pct={et.pct} estourou={et.estourou} />
                          <p className={`text-xs mt-1 ${et.estourou ? 'text-red-600' : 'text-stone-400'}`}>
                            {et.estourou
                              ? `passou ${formatMoney(-et.saldo)} do previsto`
                              : `resta ${formatMoney(et.saldo)} (${Math.round(et.pct || 0)}% usado)`}
                          </p>
                        </>
                      ) : (
                        <p className="text-xs text-stone-400 mt-1">sem orçamento nesta etapa — não há o que comparar</p>
                      )}
                    </div>
                  ))}
                </div>
                {dados.pvr.semEtapa > 0 && (
                  <p className="text-xs text-amber-700 mt-2.5 leading-snug">
                    <strong>{formatMoney(dados.pvr.semEtapa)}</strong> de gasto não está em etapa nenhuma —
                    esse dinheiro não aparece em nenhuma barra acima.
                  </p>
                )}
                {dados.pvr.etapasCobremOrcamento != null && dados.pvr.etapasCobremOrcamento < 0.9 && (
                  <p className="text-xs text-stone-400 mt-1.5 leading-snug">
                    As etapas com orçamento somam {formatMoney(dados.pvr.previstoEtapas)}, que é{' '}
                    {Math.round(dados.pvr.etapasCobremOrcamento * 100)}% do orçamento da obra
                    ({formatMoney(dados.pvr.orcamentoObra)}).
                  </p>
                )}
              </>
            )}
          </Caixa>

          {/* ---- 2. previsão de custo final ---- */}
          <Caixa icon={Scale} titulo="Previsão de custo final">
            {dados.previsao.naoDaParaPrever ? (
              <SemDados>{dados.previsao.naoDaParaPrever}</SemDados>
            ) : (
              <>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-xl font-semibold text-stone-900 tabular-nums">
                    {formatMoney(dados.previsao.previsto)}
                  </span>
                  {dados.previsao.orcamento != null && (
                    <span className={`text-sm font-medium ${
                      dados.previsao.previsto > dados.previsao.orcamento ? 'text-red-600' : 'text-green-700'
                    }`}>
                      {dados.previsao.previsto > dados.previsao.orcamento
                        ? `${formatMoney(dados.previsao.previsto - dados.previsao.orcamento)} acima do orçamento`
                        : `${formatMoney(dados.previsao.orcamento - dados.previsao.previsto)} abaixo do orçamento`}
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-500 mt-1">
                  Já gastou {formatMoney(dados.previsao.realizado)}
                  {dados.previsao.orcamento != null && <> de {formatMoney(dados.previsao.orcamento)} previstos</>}.
                </p>
                {/* a base da conta fica à vista: previsão sem origem é chute */}
                <p className="text-xs text-stone-400 mt-1.5 leading-snug">
                  <strong>Como foi calculado:</strong> {dados.previsao.explicacao}
                </p>
              </>
            )}
          </Caixa>

          {/* ---- 3. ritmo ---- */}
          <Caixa icon={Gauge} titulo={`Ritmo dos últimos ${dados.ritmo.janela} dias`}>
            {!dados.ritmo.temRitmo ? (
              <SemDados>
                Nenhum gasto nos últimos {dados.ritmo.janela} dias nesta obra — sem gasto recente não
                existe ritmo para medir.
              </SemDados>
            ) : (
              <>
                <p className="text-sm text-stone-700">
                  <span className="font-semibold tabular-nums">{formatMoney(dados.ritmo.porDia)}</span> por dia
                  <span className="text-stone-400"> · {formatMoney(dados.ritmo.gastoNaJanela)} em {dados.ritmo.lancamentosNaJanela} lançamento(s)</span>
                </p>
                {dados.ritmo.jaEstourou ? (
                  <p className="text-xs text-red-600 mt-1">
                    O orçamento já foi ultrapassado em {formatMoney(-dados.ritmo.resta)}.
                  </p>
                ) : dados.ritmo.acabaEm ? (
                  <p className="text-xs text-stone-500 mt-1">
                    Restam {formatMoney(dados.ritmo.resta)}: nesse ritmo, o orçamento termina em{' '}
                    <strong>{formatDateBR(dados.ritmo.acabaEm)}</strong> ({dados.ritmo.diasAteAcabar} dia(s)).
                  </p>
                ) : (
                  <p className="text-xs text-stone-400 mt-1">Esta obra não tem orçamento definido, então não há prazo para calcular.</p>
                )}
              </>
            )}
          </Caixa>

          {/* ---- 4. comparação com obras semelhantes ---- */}
          <Caixa icon={Scale} titulo="Comparada com obras de porte parecido">
            {dados.comparacao.naoDaParaComparar ? (
              <SemDados>{dados.comparacao.naoDaParaComparar}</SemDados>
            ) : (
              <>
                <p className="text-xs text-stone-500 leading-snug">
                  Comparando com {dados.comparacao.semelhantes.length}{' '}
                  {dados.comparacao.semelhantes.length === 1 ? 'obra' : 'obras'} de orçamento parecido
                  ({dados.comparacao.semelhantes.map((o) => o.nome).join(', ')}).
                </p>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <p className="text-xs text-stone-400">Gasto desta obra</p>
                    <p className="text-sm font-medium text-stone-800 tabular-nums">{formatMoney(dados.comparacao.minha.total)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-stone-400">Mediana das parecidas</p>
                    <p className="text-sm font-medium text-stone-800 tabular-nums">{formatMoney(dados.comparacao.grupo.total)}</p>
                  </div>
                  {dados.comparacao.minha.porDia != null && dados.comparacao.grupo.porDia != null && (
                    <>
                      <div>
                        <p className="text-xs text-stone-400">Por dia de obra</p>
                        <p className="text-sm font-medium text-stone-800 tabular-nums">{formatMoney(dados.comparacao.minha.porDia)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-stone-400">Por dia nas parecidas</p>
                        <p className="text-sm font-medium text-stone-800 tabular-nums">{formatMoney(dados.comparacao.grupo.porDia)}</p>
                      </div>
                    </>
                  )}
                </div>
                {dados.comparacao.diferencas.length === 0 ? (
                  <p className="text-xs text-stone-400 mt-2 leading-snug">
                    A divisão do gasto por categoria é parecida com a das outras — nada fora do padrão.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-1">
                    {dados.comparacao.diferencas.map((d) => (
                      <li key={d.categoria} className="text-xs leading-snug text-stone-600">
                        <strong>{d.label}</strong>: {Math.round(d.minha)}% do gasto desta obra, contra{' '}
                        {Math.round(d.doGrupo)}% nas parecidas{' '}
                        <span className={d.diferenca > 0 ? 'text-amber-700' : 'text-stone-400'}>
                          ({d.diferenca > 0 ? '+' : ''}{Math.round(d.diferenca)} pontos)
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </Caixa>
        </div>
      )}
    </div>
  );
}
