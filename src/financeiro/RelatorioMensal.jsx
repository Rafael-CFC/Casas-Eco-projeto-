import React, { useMemo, useState } from 'react';
import { CalendarDays, Check, Copy, TrendingDown, TrendingUp } from 'lucide-react';
import { formatMoney, formatDateBR } from '../domain';
import { relatorioMensal, textoDoRelatorio, mesesComLancamento } from './previsao';

// O fechamento do mês, montado sozinho.
//
// Nada aqui é digitado à parte: é o mesmo lançamento que entrou na obra,
// somado por mês. Escolhe o mês e o relatório está pronto — e o botão de
// copiar entrega o mesmo conteúdo em texto, para mandar no WhatsApp ou
// guardar junto da contabilidade.

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export function nomeDoMes(mes) {
  const [ano, m] = String(mes || '').split('-');
  const i = Number(m) - 1;
  return MESES[i] ? `${MESES[i]} de ${ano}` : mes;
}

function Linha({ nome, valor, total }) {
  const pct = total > 0 ? (valor / total) * 100 : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="text-stone-700 truncate">{nome}</span>
        <span className="tabular-nums text-stone-600 flex-shrink-0">
          {formatMoney(valor)} <span className="text-stone-400">{Math.round(pct)}%</span>
        </span>
      </div>
      <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden mt-1">
        <div className="h-full bg-green-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Bloco({ titulo, children }) {
  return (
    <div>
      <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">{titulo}</p>
      {children}
    </div>
  );
}

export default function RelatorioMensal({ lancamentos, obras, contas, hojeISO }) {
  const meses = useMemo(() => {
    const comGasto = mesesComLancamento(lancamentos);
    const atual = String(hojeISO || '').slice(0, 7);
    // o mês corrente aparece mesmo sem lançamento ainda — é o que o dono
    // procura primeiro
    return comGasto.includes(atual) ? comGasto : [atual, ...comGasto];
  }, [lancamentos, hojeISO]);

  const [mes, setMes] = useState(meses[0]);
  const [copiado, setCopiado] = useState(false);
  // quando o navegador não deixa copiar sozinho, o texto aparece aqui
  // para a pessoa copiar na mão — em vez de o botão não fazer nada
  const [textoManual, setTextoManual] = useState('');

  const r = useMemo(
    () => relatorioMensal({ lancamentos, obras, contas }, mes),
    [lancamentos, obras, contas, mes]
  );

  async function copiar() {
    const texto = textoDoRelatorio(r, { formatarMoeda: formatMoney, nomeDoMes });
    const avisarQueCopiou = () => {
      setTextoManual('');
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    };

    // 1. o jeito moderno
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(texto);
        avisarQueCopiou();
        return;
      }
    } catch { /* cai para o próximo */ }

    // 2. o jeito antigo, que ainda funciona em navegador de celular velho
    try {
      const caixa = document.createElement('textarea');
      caixa.value = texto;
      caixa.setAttribute('readonly', '');
      caixa.style.position = 'fixed';
      caixa.style.opacity = '0';
      document.body.appendChild(caixa);
      caixa.select();
      const deu = document.execCommand('copy');
      document.body.removeChild(caixa);
      if (deu) { avisarQueCopiou(); return; }
    } catch { /* cai para o próximo */ }

    // 3. nenhum dos dois: mostra o texto para copiar na mão
    setTextoManual(texto);
  }

  const subiu = r.variacaoPct != null && r.variacaoPct > 0;

  return (
    <div className="eco-card p-4 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-stone-700 flex items-center gap-2">
            <CalendarDays size={16} /> Relatório do mês
          </p>
          <p className="text-xs text-stone-400 mt-0.5">
            Montado com os lançamentos e as contas do mês escolhido — nada digitado à parte.
          </p>
        </div>
        <div className="w-full sm:w-52">
          <label className="eco-label">Mês</label>
          <select value={mes} onChange={(e) => setMes(e.target.value)} className="eco-input">
            {meses.map((m) => <option key={m} value={m}>{nomeDoMes(m)}</option>)}
          </select>
        </div>
        <button type="button" onClick={copiar} className="eco-btn-secondary eco-btn-sm w-full sm:w-auto">
          {copiado ? <><Check size={14} /> Copiado</> : <><Copy size={14} /> Copiar texto</>}
        </button>
      </div>

      {textoManual && (
        <div>
          <p className="text-xs text-amber-700 mb-1.5">
            Este navegador não deixou copiar sozinho. Selecione o texto abaixo e copie na mão.
          </p>
          <textarea
            readOnly
            value={textoManual}
            rows={10}
            onFocus={(e) => e.target.select()}
            className="eco-input font-mono text-xs leading-relaxed"
          />
        </div>
      )}

      {r.vazio ? (
        <p className="text-sm text-stone-400 py-6 text-center">
          Nenhum lançamento e nenhuma conta em {nomeDoMes(mes)}.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <p className="text-xs text-stone-500">Gasto no mês</p>
              <p className="text-lg font-semibold text-stone-900 tabular-nums">{formatMoney(r.total)}</p>
            </div>
            <div>
              <p className="text-xs text-stone-500">Mês anterior</p>
              <p className="text-lg font-semibold text-stone-500 tabular-nums">{formatMoney(r.totalAnterior)}</p>
              {r.variacaoPct != null && (
                <p className={`text-xs flex items-center gap-1 ${subiu ? 'text-red-600' : 'text-green-700'}`}>
                  {subiu ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {subiu ? '+' : ''}{r.variacaoPct.toFixed(0)}%
                </p>
              )}
            </div>
            <div>
              <p className="text-xs text-stone-500">Lançamentos</p>
              <p className="text-lg font-semibold text-stone-900 tabular-nums">{r.lancamentos}</p>
              <p className="text-xs text-stone-400">em {r.diasComGasto} dia(s)</p>
            </div>
            <div>
              <p className="text-xs text-stone-500">Contas do mês</p>
              <p className="text-lg font-semibold text-stone-900 tabular-nums">{formatMoney(r.contas.total)}</p>
              <p className="text-xs text-stone-400">
                {r.contas.abertas.quantidade > 0
                  ? `${r.contas.abertas.quantidade} em aberto (${formatMoney(r.contas.abertas.valor)})`
                  : 'todas pagas'}
              </p>
            </div>
          </div>

          {r.porObra.length > 0 && (
            <Bloco titulo="Por obra">
              <div className="space-y-2">
                {r.porObra.map((o) => <Linha key={o.chave} nome={o.nome} valor={o.valor} total={r.total} />)}
              </div>
            </Bloco>
          )}

          {r.porCategoria.length > 0 && (
            <Bloco titulo="Por categoria">
              <div className="space-y-2">
                {r.porCategoria.map((c) => <Linha key={c.chave} nome={c.nome} valor={c.valor} total={r.total} />)}
              </div>
            </Bloco>
          )}

          {r.porFornecedor.length > 0 && (
            <Bloco titulo="Quem mais recebeu">
              <div className="space-y-2">
                {r.porFornecedor.map((f) => <Linha key={f.chave} nome={f.nome} valor={f.valor} total={r.total} />)}
              </div>
            </Bloco>
          )}

          {r.altasDePreco.length > 0 && (
            <Bloco titulo="Subiu de preço neste mês">
              <ul className="space-y-1.5">
                {r.altasDePreco.map((a) => (
                  <li key={a.descricao} className="text-xs text-stone-600 leading-snug">
                    <strong>{a.descricao}</strong>: {formatMoney(a.de)} → {formatMoney(a.para)}{' '}
                    <span className="text-amber-700">(+{a.pct.toFixed(0)}%)</span>
                    <span className="text-stone-400"> · {a.compras} compras no histórico</span>
                  </li>
                ))}
              </ul>
            </Bloco>
          )}

          {r.comprasForaDoPadrao.length > 0 && (
            <Bloco titulo="Compras fora do padrão">
              <ul className="space-y-1.5">
                {r.comprasForaDoPadrao.map((c) => (
                  <li key={c.id} className="text-xs text-stone-600 leading-snug">
                    <strong>{c.descricao}</strong> em {formatDateBR(c.data)}: pagou {formatMoney(c.preco)},
                    costuma ser {formatMoney(c.referencia)}{' '}
                    <span className="text-amber-700">({formatMoney(c.diferenca)} a mais nessa compra)</span>
                    {c.fornecedorNome && <span className="text-stone-400"> · {c.fornecedorNome}</span>}
                  </li>
                ))}
              </ul>
            </Bloco>
          )}
        </>
      )}
    </div>
  );
}
