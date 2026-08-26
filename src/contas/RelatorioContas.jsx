import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import {
  Filter, X, Download, AlertTriangle, CalendarClock, CalendarDays, CalendarRange, Wallet,
} from 'lucide-react';
import { formatMoney, formatDateBR, todayISO } from '../domain';
import { StatCard, SectionCard, CustomTooltip } from '../dashboard/FinanceiroDashboard';
import {
  TODAS, distribuidorasDasContas, filtrarContas, nomeDaConta, resumoVencimentos,
  somarContas, somarDias, totalPorDistribuidora, totalPorVencimento,
} from './contasCalc';

const VERDE = '#16a34a';
const VERMELHO = '#dc2626';

// Uma cor só por gráfico: cada barra é uma distribuidora (ou uma data), e
// quem diz qual é qual é o rótulo do eixo, não a cor. Cor aqui só marca
// exceção — o que já venceu sai em vermelho.
function GraficoPorDistribuidora({ dados }) {
  if (dados.length === 0) {
    return <p className="text-xs text-stone-400 py-8 text-center">Nenhuma conta no recorte escolhido.</p>;
  }
  const altura = Math.max(180, dados.length * 42);
  return (
    <ResponsiveContainer width="100%" height={altura}>
      <BarChart data={dados} layout="vertical" margin={{ left: 8, right: 28, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0efed" horizontal={false} />
        <XAxis type="number" tickFormatter={(v) => formatMoney(v)} tick={{ fontSize: 11, fill: '#78716c' }}
          axisLine={{ stroke: '#e7e5e4' }} tickLine={false} />
        <YAxis type="category" dataKey="nome" width={130} tick={{ fontSize: 12, fill: '#44403c' }}
          axisLine={{ stroke: '#e7e5e4' }} tickLine={false} />
        <Tooltip content={<CustomTooltip formatter={formatMoney} />} cursor={{ fill: '#f5f5f4' }} />
        <Bar dataKey="total" name="A pagar" fill={VERDE} radius={[0, 4, 4, 0]} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// Cada barra vem partida: vermelho é o que já venceu, verde o que ainda
// vai vencer. Pintar a barra inteira de uma cor só erraria justamente na
// semana que começou ontem e vence amanhã.
function GraficoPorVencimento({ dados }) {
  if (dados.length === 0) {
    return <p className="text-xs text-stone-400 py-8 text-center">Nenhuma conta no recorte escolhido.</p>;
  }
  const temVencido = dados.some((d) => d.vencido > 0);
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={dados} margin={{ left: 0, right: 12, top: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0efed" vertical={false} />
        <XAxis dataKey="rotulo" tick={{ fontSize: 11, fill: '#78716c' }} axisLine={{ stroke: '#e7e5e4' }} tickLine={false} />
        <YAxis tickFormatter={(v) => formatMoney(v)} tick={{ fontSize: 11, fill: '#78716c' }}
          axisLine={{ stroke: '#e7e5e4' }} tickLine={false} width={88} />
        <Tooltip content={<CustomTooltip formatter={formatMoney} />} cursor={{ fill: '#f5f5f4' }} />
        {temVencido && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {temVencido && (
          <Bar dataKey="vencido" stackId="v" name="Já venceu" fill={VERMELHO} maxBarSize={46} />
        )}
        <Bar dataKey="aVencer" stackId="v" name="A vencer" fill={VERDE} radius={[4, 4, 0, 0]} maxBarSize={46} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// Paga / Vencida / A pagar — o mesmo rótulo na tabela do computador e na
// lista do celular.
function Situacao({ conta, hoje, texto = false }) {
  const paga = conta.status === 'pago';
  const atrasada = !paga && conta.vencimento < hoje;
  const label = paga ? 'Paga' : atrasada ? 'Vencida' : 'A pagar';
  if (texto) {
    return <span className={atrasada ? 'text-red-600' : paga ? 'text-green-700' : ''}>{label}</span>;
  }
  return (
    <span className={`eco-badge border ${
      paga ? 'bg-green-50 text-green-700 border-green-200'
      : atrasada ? 'bg-red-50 text-red-600 border-red-200'
      : 'bg-stone-50 text-stone-600 border-stone-200'}`}
    >
      {label}
    </span>
  );
}

export default function RelatorioContas({ contas, onExportarCSV }) {
  const hoje = todayISO();
  const [distribuidora, setDistribuidora] = useState(TODAS);
  const [situacao, setSituacao] = useState('a_pagar');
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');
  const [granularidade, setGranularidade] = useState('mensal');

  const distribuidoras = useMemo(() => distribuidorasDasContas(contas), [contas]);

  // Os cartões de 7/15/30 dias contam sempre a partir de hoje — é o que
  // eles significam. Por isso obedecem só ao filtro de distribuidora, e
  // não ao período escolhido logo abaixo.
  const contasDaDistribuidora = useMemo(
    () => filtrarContas(contas, { distribuidora, situacao: 'todas' }),
    [contas, distribuidora]
  );
  const resumo = useMemo(() => resumoVencimentos(contasDaDistribuidora, hoje), [contasDaDistribuidora, hoje]);

  const filtradas = useMemo(
    () => filtrarContas(contas, { distribuidora, situacao, de, ate }),
    [contas, distribuidora, situacao, de, ate]
  );
  const porDistribuidora = useMemo(() => totalPorDistribuidora(filtradas), [filtradas]);
  const porVencimento = useMemo(() => totalPorVencimento(filtradas, granularidade, hoje), [filtradas, granularidade, hoje]);
  const totalFiltrado = somarContas(filtradas);

  const listaOrdenada = useMemo(
    () => [...filtradas].sort((a, b) => String(a.vencimento || '').localeCompare(String(b.vencimento || ''))),
    [filtradas]
  );

  const temFiltro = distribuidora !== TODAS || situacao !== 'a_pagar' || de || ate;
  function limpar() {
    setDistribuidora(TODAS); setSituacao('a_pagar'); setDe(''); setAte('');
  }
  function atalho(dias) {
    setDe(hoje);
    setAte(somarDias(hoje, dias));
    setGranularidade(dias <= 45 ? 'semanal' : 'mensal');
  }

  if (contas.length === 0) {
    return (
      <p className="text-center text-stone-400 py-12">
        Nenhuma conta registrada ainda. Registre na aba "Registrar" para o relatório aparecer aqui.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {/* ---- quanto tenho para pagar, a partir de hoje ---- */}
      <div>
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <div>
            <p className="text-sm font-semibold text-stone-700">A pagar a partir de hoje</p>
            <p className="text-xs text-stone-400">
              Janelas contadas de hoje ({formatDateBR(hoje)}) em diante, só do que ainda não foi pago.
              O que já venceu fica no cartão vermelho, separado.
            </p>
          </div>
          <div className="w-full sm:w-56">
            <select value={distribuidora} onChange={(e) => setDistribuidora(e.target.value)} className="eco-input">
              <option value={TODAS}>Todas as distribuidoras</option>
              {distribuidoras.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard
            label="Já vencidas" numero={resumo.vencidas.valor} formatar={formatMoney}
            sub={`${resumo.vencidas.quantidade} conta(s)`} icon={AlertTriangle}
            tone={resumo.vencidas.valor > 0 ? 'bad' : 'default'}
          />
          <StatCard label="Até 7 dias" numero={resumo.ate7.valor} formatar={formatMoney}
            sub={`${resumo.ate7.quantidade} conta(s)`} icon={CalendarClock} />
          <StatCard label="Até 15 dias" numero={resumo.ate15.valor} formatar={formatMoney}
            sub={`${resumo.ate15.quantidade} conta(s)`} icon={CalendarDays} />
          <StatCard label="Até 30 dias" numero={resumo.ate30.valor} formatar={formatMoney}
            sub={`${resumo.ate30.quantidade} conta(s)`} icon={CalendarRange} />
          <StatCard label="Total a pagar" numero={resumo.total.valor} formatar={formatMoney}
            sub={`${resumo.total.quantidade} conta(s) · sem data limite`} icon={Wallet} />
        </div>
        <p className="text-[11px] text-stone-400 mt-2">
          As janelas se somam: o que está em "até 7 dias" também está em "até 15" e em "até 30".
        </p>
      </div>

      {/* ---- recorte livre ---- */}
      <div className="eco-card p-4">
        <div className="flex items-center gap-1.5 text-xs font-medium text-stone-500 mb-3">
          <Filter size={13} /> Filtrar por período
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-stone-500 block mb-1">Situação</label>
            <select value={situacao} onChange={(e) => setSituacao(e.target.value)} className="eco-input">
              <option value="a_pagar">A pagar</option>
              <option value="pagas">Já pagas</option>
              <option value="todas">Todas</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-stone-500 block mb-1">Vencendo de</label>
            <input type="date" value={de} onChange={(e) => setDe(e.target.value)} className="eco-input" />
          </div>
          <div>
            <label className="text-xs text-stone-500 block mb-1">até</label>
            <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} className="eco-input" />
          </div>
          <div className="flex items-end">
            <button onClick={limpar} disabled={!temFiltro} className="eco-btn-secondary eco-btn-sm w-full disabled:opacity-40">
              <X size={14} /> Limpar filtros
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-3">
          <span className="text-xs text-stone-400 self-center mr-1">Atalhos:</span>
          {[['7 dias', 7], ['15 dias', 15], ['30 dias', 30], ['90 dias', 90]].map(([label, dias]) => (
            <button key={dias} onClick={() => atalho(dias)} className="eco-btn-secondary eco-btn-xs">{label}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total no recorte" numero={totalFiltrado} formatar={formatMoney}
          sub={`${filtradas.length} conta(s)`} icon={Wallet} />
        <StatCard label="Distribuidoras no recorte" numero={porDistribuidora.length}
          formatar={(v) => String(Math.round(v))} sub="com conta no período" icon={Filter} />
        <StatCard
          label="Maior distribuidora"
          valor={porDistribuidora[0] ? porDistribuidora[0].nome : '—'}
          sub={porDistribuidora[0] ? formatMoney(porDistribuidora[0].total) : 'sem contas'}
        />
        <StatCard label="Média por conta"
          numero={filtradas.length > 0 ? totalFiltrado / filtradas.length : 0}
          formatar={formatMoney} sub="no recorte" />
      </div>

      <SectionCard
        title="Quanto vence por distribuidora"
        subtitle="Soma das contas do recorte, da maior para a menor"
      >
        <GraficoPorDistribuidora dados={porDistribuidora} />
      </SectionCard>

      <SectionCard
        title="Quando o dinheiro sai"
        subtitle="Soma por data de vencimento · a parte vermelha da barra já venceu"
        right={
          <div className="flex gap-1 bg-stone-100 rounded-md p-0.5">
            {[['semanal', 'Semana'], ['mensal', 'Mês']].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setGranularidade(key)}
                className={`text-xs px-2.5 py-1 rounded ${granularidade === key ? 'bg-white text-green-700 shadow-sm font-medium' : 'text-stone-500'}`}
              >
                {label}
              </button>
            ))}
          </div>
        }
      >
        <GraficoPorVencimento dados={porVencimento} />
      </SectionCard>

      <SectionCard
        title="Contas do recorte"
        subtitle={`${filtradas.length} conta(s) · ${formatMoney(totalFiltrado)}`}
        right={
          <button onClick={() => onExportarCSV(listaOrdenada)} className="eco-btn-secondary eco-btn-sm">
            <Download size={14} /> Baixar CSV
          </button>
        }
      >
        {listaOrdenada.length === 0 ? (
          <p className="text-xs text-stone-400 py-8 text-center">Nenhuma conta no recorte escolhido.</p>
        ) : (
          <>
            {/* no celular a tabela não cabe sem cortar o valor, então lá
                cada conta vira uma linha empilhada */}
            <div className="sm:hidden divide-y divide-stone-100">
              {listaOrdenada.map((c) => (
                <div key={c.id} className="py-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm text-stone-700 truncate">{nomeDaConta(c)}</p>
                    <p className="text-xs text-stone-400">
                      vence {formatDateBR(c.vencimento)} · <Situacao conta={c} hoje={hoje} texto />
                    </p>
                  </div>
                  <span className="text-sm font-medium text-stone-800 whitespace-nowrap">{formatMoney(c.valor)}</span>
                </div>
              ))}
            </div>

            <div className="hidden sm:block overflow-x-auto -mx-1 px-1">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-stone-400 text-left border-b border-stone-200">
                    <th className="py-1.5 pr-2 font-medium">Distribuidora</th>
                    <th className="py-1.5 pr-2 font-medium whitespace-nowrap">Vencimento</th>
                    <th className="py-1.5 pr-2 font-medium">Situação</th>
                    <th className="py-1.5 font-medium text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {listaOrdenada.map((c) => (
                    <tr key={c.id} className="border-b border-stone-100 last:border-0">
                      <td className="py-1.5 pr-2 text-stone-700">{nomeDaConta(c)}</td>
                      <td className="py-1.5 pr-2 text-stone-500 whitespace-nowrap">{formatDateBR(c.vencimento)}</td>
                      <td className="py-1.5 pr-2"><Situacao conta={c} hoje={hoje} /></td>
                      <td className="py-1.5 text-right font-medium text-stone-800 whitespace-nowrap">{formatMoney(c.valor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </SectionCard>
    </div>
  );
}
