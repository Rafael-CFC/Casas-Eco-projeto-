import React, { useMemo, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, TrendingUp, TrendingDown, Wallet, PiggyBank,
  Percent, Layers, Building2, Users, ArrowUpRight, ArrowDownRight, Filter, X,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { formatMoney, formatDateBR, todayISO, CATEGORIAS, CLS } from '../domain';
import useCountUp from '../ui/useCountUp';
import {
  PERIODOS, getPeriodoRange, filtrarLancamentos, filtrarContas, somarTotal,
  agruparPorObra, agruparPorCategoria, agruparPorFornecedor, evoluirPorPeriodo,
  orcamentoDaObra, orcamentoTotalEscopo, gerarAlertasFinanceiro,
} from './dashboardCalc';

const VERDE = '#16a34a';
const VERMELHO = '#dc2626';
const CINZA_REF = '#d6d3d1';
const CORES_CATEGORIA = { mao_de_obra: '#d97706', material_bruto: '#0d9488', produto_loja: '#2563eb' };

function formatPct(v) {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  const arredondado = Math.round(v * 10) / 10;
  return `${arredondado.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
}

function StatCard({ label, valor, numero, formatar, sub, icon: Icon, tone = 'default' }) {
  const tones = {
    default: 'text-stone-900',
    good: 'text-green-700',
    bad: 'text-red-600',
  };
  const contado = useCountUp(numero != null ? numero : 0, { formatar });
  const exibido = numero != null ? contado : valor;
  return (
    <div className="eco-card eco-card-hover p-4">
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-xs font-medium text-stone-500">{label}</p>
        {Icon && <Icon size={15} className="text-stone-300 flex-shrink-0" />}
      </div>
      <p className={`text-xl sm:text-2xl font-semibold tracking-tight ${tones[tone]}`}>{exibido}</p>
      {sub && <p className="text-xs text-stone-400 mt-1">{sub}</p>}
    </div>
  );
}

function CustomTooltip({ active, payload, label, formatter }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-white border border-stone-200 rounded-md shadow-lg px-3 py-2 text-xs">
      {label && <p className="font-semibold text-stone-700 mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="text-stone-600 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color || p.fill }} />
          {p.name}: <span className="font-medium text-stone-900">{formatter ? formatter(p.value) : p.value}</span>
        </p>
      ))}
    </div>
  );
}

function SectionCard({ title, subtitle, children, right }) {
  return (
    <div className="eco-card p-4">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div>
          <p className="text-sm font-semibold text-stone-700">{title}</p>
          {subtitle && <p className="text-xs text-stone-400">{subtitle}</p>}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

function GraficoPorObra({ dados }) {
  const altura = Math.max(180, dados.length * 42);
  return (
    <ResponsiveContainer width="100%" height={altura}>
      <BarChart data={dados} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0efed" horizontal={false} />
        <XAxis type="number" tickFormatter={(v) => formatMoney(v)} tick={{ fontSize: 11, fill: '#78716c' }} axisLine={{ stroke: '#e7e5e4' }} tickLine={false} />
        <YAxis type="category" dataKey="nome" width={110} tick={{ fontSize: 12, fill: '#44403c' }} axisLine={{ stroke: '#e7e5e4' }} tickLine={false} />
        <Tooltip content={<CustomTooltip formatter={formatMoney} />} cursor={{ fill: '#f5f5f4' }} />
        <Bar dataKey="total" name="Gasto" fill={VERDE} radius={[0, 4, 4, 0]} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function GraficoEvolucao({ dados, granularidade, setGranularidade }) {
  const opcoes = [['diario', 'Diário'], ['semanal', 'Semanal'], ['mensal', 'Mensal']];
  return (
    <SectionCard
      title="Evolução dos gastos"
      subtitle="Soma dos lançamentos ao longo do tempo, no recorte filtrado"
      right={
        <div className="flex gap-1 bg-stone-100 rounded-md p-0.5">
          {opcoes.map(([key, label]) => (
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
      {dados.length === 0 ? (
        <p className="text-xs text-stone-400 py-10 text-center">Nenhum lançamento no recorte selecionado.</p>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={dados} margin={{ left: 0, right: 16, top: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0efed" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#78716c' }} axisLine={{ stroke: '#e7e5e4' }} tickLine={false} />
            <YAxis tickFormatter={(v) => formatMoney(v)} tick={{ fontSize: 11, fill: '#78716c' }} axisLine={false} tickLine={false} width={96} />
            <Tooltip content={<CustomTooltip formatter={formatMoney} />} />
            <Line type="monotone" dataKey="total" name="Gasto" stroke={VERDE} strokeWidth={2} dot={{ r: 3, fill: VERDE }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </SectionCard>
  );
}

function GraficoCategoria({ dados }) {
  if (dados.length === 0) {
    return <p className="text-xs text-stone-400 py-10 text-center">Sem gastos por categoria neste recorte.</p>;
  }
  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <div className="w-full sm:w-[200px] flex-shrink-0">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={dados}
              dataKey="valor"
              nameKey="label"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              stroke="#fff"
              strokeWidth={2}
            >
              {dados.map((d) => <Cell key={d.key} fill={CORES_CATEGORIA[d.key] || '#a8a29e'} />)}
            </Pie>
            <Tooltip content={<CustomTooltip formatter={formatMoney} />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex-1 w-full space-y-2">
        {dados.map((d) => (
          <div key={d.key} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-stone-600">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: CORES_CATEGORIA[d.key] || '#a8a29e' }} />
              {d.label}
            </span>
            <span className="text-right">
              <span className="font-medium text-stone-900">{formatMoney(d.valor)}</span>
              <span className="text-xs text-stone-400 ml-1.5">{formatPct(d.pct)}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BadgeOrcamento({ pctDiff }) {
  if (pctDiff === null) return null;
  const acima = pctDiff > 0;
  const zerado = Math.abs(pctDiff) < 0.5;
  if (zerado) {
    return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">NO ORÇAMENTO</span>;
  }
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1 w-fit ${acima ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
      {acima ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
      {acima ? `+${formatPct(pctDiff)} ACIMA DO ORÇAMENTO` : `${formatPct(Math.abs(pctDiff))} ABAIXO DO ORÇAMENTO`}
    </span>
  );
}

function GraficoOrcamentoRealizado({ dados }) {
  if (dados.length === 0) {
    return <p className="text-xs text-stone-400 py-6 text-center">Nenhuma obra com orçamento definido neste recorte.</p>;
  }
  const altura = Math.max(160, dados.length * 90) + 40;
  return (
    <>
      <ResponsiveContainer width="100%" height={altura}>
        <BarChart data={dados} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }} barGap={4} barCategoryGap="24%">
          <CartesianGrid strokeDasharray="3 3" stroke="#f0efed" horizontal={false} />
          <XAxis type="number" tickFormatter={(v) => formatMoney(v)} tick={{ fontSize: 11, fill: '#78716c' }} axisLine={{ stroke: '#e7e5e4' }} tickLine={false} />
          <YAxis type="category" dataKey="nome" width={110} tick={{ fontSize: 12, fill: '#44403c' }} axisLine={{ stroke: '#e7e5e4' }} tickLine={false} />
          <Tooltip content={<CustomTooltip formatter={formatMoney} />} cursor={{ fill: '#f5f5f4' }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="orcamento" name="Orçamento" fill={CINZA_REF} radius={[0, 4, 4, 0]} barSize={18} />
          <Bar dataKey="realizado" name="Realizado" radius={[0, 4, 4, 0]} barSize={18}>
            {dados.map((d) => <Cell key={d.obraId} fill={d.realizado > d.orcamento ? VERMELHO : VERDE} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-3 space-y-1.5">
        {dados.map((d) => (
          <div key={d.obraId} className="flex items-center justify-between text-xs gap-2">
            <span className="text-stone-600 truncate">{d.nome}</span>
            <BadgeOrcamento pctDiff={d.pctDiff} />
          </div>
        ))}
      </div>
    </>
  );
}

function AlertaItem({ alerta }) {
  const estilos = {
    critical: { bg: 'bg-red-50 border-red-200 text-red-700', Icon: AlertTriangle },
    warning: { bg: 'bg-amber-50 border-amber-200 text-amber-700', Icon: AlertTriangle },
    good: { bg: 'bg-green-50 border-green-200 text-green-700', Icon: CheckCircle2 },
  };
  const { bg, Icon } = estilos[alerta.tipo] || estilos.warning;
  return (
    <div className={`text-sm px-3 py-2 rounded-lg border flex items-start gap-2 ${bg}`}>
      <Icon size={15} className="flex-shrink-0 mt-0.5" />
      <span>{alerta.texto}</span>
    </div>
  );
}

function RankingObras({ dados, obras, categoria }) {
  return (
    <div className="space-y-2">
      {dados.slice(0, 10).map((d, i) => {
        const obra = obras.find((o) => o.id === d.obraId);
        const orcamento = obra ? orcamentoDaObra(obra, categoria) : null;
        const pct = orcamento ? (d.total / orcamento) * 100 : null;
        return (
          <div key={d.obraId} className="flex items-center gap-3">
            <span className="w-6 h-6 rounded-full bg-stone-100 text-stone-500 text-xs font-semibold flex items-center justify-center flex-shrink-0">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-stone-800 truncate">{d.nome}</span>
                <span className="text-sm font-medium text-stone-900 flex-shrink-0">{formatMoney(d.total)}</span>
              </div>
              <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden mt-1">
                <div
                  className={`h-full ${pct !== null && pct > 100 ? 'bg-red-500' : 'bg-green-500'}`}
                  style={{ width: `${Math.min(100, (d.total / dados[0].total) * 100)}%` }}
                />
              </div>
              {pct !== null && <p className="text-xs text-stone-400 mt-0.5">{formatPct(pct)} do orçamento</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RankingFornecedores({ dados }) {
  if (dados.length === 0) return <p className="text-xs text-stone-400 py-6 text-center">Nenhum lançamento com fornecedor informado neste recorte.</p>;
  const max = dados[0].total;
  return (
    <div className="space-y-2.5">
      {dados.map((f) => (
        <div key={f.nome}>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-stone-600 truncate">{f.nome}</span>
            <span className="font-medium text-stone-800 flex-shrink-0 ml-2">{formatMoney(f.total)}</span>
          </div>
          <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500" style={{ width: `${(f.total / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function TabelaLancamentos({ titulo, itens }) {
  return (
    <SectionCard title={titulo}>
      {itens.length === 0 ? (
        <p className="text-xs text-stone-400 py-6 text-center">Nenhum lançamento neste recorte.</p>
      ) : (
        <div className="overflow-x-auto -mx-4">
          <table className="w-full text-sm min-w-[420px]">
            <tbody>
              {itens.map((l) => (
                <tr key={l.id} className="border-t border-stone-100 first:border-t-0">
                  <td className="px-4 py-2 text-stone-500 whitespace-nowrap">{formatDateBR(l.data)}</td>
                  <td className="px-2 py-2 text-stone-800">{l.descricao}</td>
                  <td className="px-2 py-2">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${CLS[CATEGORIAS[l.categoria]?.cls]?.bg || 'bg-stone-100'} ${CLS[CATEGORIAS[l.categoria]?.cls]?.text || 'text-stone-500'}`}>
                      {CATEGORIAS[l.categoria]?.label || l.categoria}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right font-medium text-stone-900 whitespace-nowrap">{formatMoney(l.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

export default function FinanceiroDashboard({ obras, lancamentos, fornecedores, contas }) {
  const [obraId, setObraId] = useState('todas');
  const [periodo, setPeriodo] = useState('todos');
  const [dataInicioPersonalizada, setDataInicioPersonalizada] = useState('');
  const [dataFimPersonalizada, setDataFimPersonalizada] = useState('');
  const [categoria, setCategoria] = useState('todas');
  const [fornecedor, setFornecedor] = useState('todos');
  const [status, setStatus] = useState('todas');
  const [granularidade, setGranularidade] = useState('mensal');

  const hoje = todayISO();
  const periodoRange = useMemo(
    () => getPeriodoRange(periodo, dataInicioPersonalizada, dataFimPersonalizada, hoje),
    [periodo, dataInicioPersonalizada, dataFimPersonalizada, hoje]
  );

  const { escopo, periodo: periodoLancamentos } = useMemo(
    () => filtrarLancamentos(lancamentos, { obraId, categoria, fornecedor, periodoRange }),
    [lancamentos, obraId, categoria, fornecedor, periodoRange]
  );

  const contasFiltradas = useMemo(
    () => filtrarContas(contas, { obraId, fornecedor, status, periodoRange }),
    [contas, obraId, fornecedor, status, periodoRange]
  );

  const custoTotal = useMemo(() => somarTotal(escopo), [escopo]);
  const custoPeriodo = useMemo(() => somarTotal(periodoLancamentos), [periodoLancamentos]);
  const orcamentoTotal = useMemo(() => orcamentoTotalEscopo(obras, obraId, categoria), [obras, obraId, categoria]);
  const saldo = orcamentoTotal != null ? orcamentoTotal - custoTotal : null;
  const pctUtilizado = orcamentoTotal ? (custoTotal / orcamentoTotal) * 100 : null;
  const mediaGastos = periodoLancamentos.length ? custoPeriodo / periodoLancamentos.length : 0;

  const categoriaDados = useMemo(() => agruparPorCategoria(periodoLancamentos, CATEGORIAS), [periodoLancamentos]);
  const maiorCategoria = categoriaDados[0] || null;

  const obraDados = useMemo(() => agruparPorObra(periodoLancamentos, obras), [periodoLancamentos, obras]);
  const evolucaoDados = useMemo(() => evoluirPorPeriodo(periodoLancamentos, granularidade), [periodoLancamentos, granularidade]);
  const fornecedoresDadosTodos = useMemo(() => agruparPorFornecedor(periodoLancamentos), [periodoLancamentos]);
  const fornecedoresDados = fornecedoresDadosTodos.slice(0, 8);

  const obrasEscopo = obraId === 'todas' ? obras : obras.filter((o) => o.id === obraId);
  const alertas = useMemo(
    () => gerarAlertasFinanceiro(obrasEscopo, escopo, categoria, CATEGORIAS),
    [obrasEscopo, escopo, categoria]
  );

  const orcamentoRealizadoDados = useMemo(() => {
    return obrasEscopo
      .map((o) => {
        const orcamento = orcamentoDaObra(o, categoria);
        if (orcamento == null || orcamento <= 0) return null;
        const realizado = somarTotal(escopo.filter((l) => l.obraId === o.id));
        const pctDiff = ((realizado - orcamento) / orcamento) * 100;
        return { obraId: o.id, nome: o.nome, orcamento, realizado, pctDiff };
      })
      .filter(Boolean)
      .sort((a, b) => b.realizado - a.realizado);
  }, [obrasEscopo, escopo, categoria]);

  const valorPago = useMemo(() => contasFiltradas.filter((c) => c.status === 'pago').reduce((a, c) => a + c.valor, 0), [contasFiltradas]);
  const valorPendente = useMemo(() => contasFiltradas.filter((c) => c.status !== 'pago').reduce((a, c) => a + c.valor, 0), [contasFiltradas]);
  const contasEmAtraso = useMemo(() => contasFiltradas.filter((c) => c.status !== 'pago' && c.vencimento < hoje), [contasFiltradas, hoje]);

  const maioresLancamentos = useMemo(() => periodoLancamentos.slice().sort((a, b) => b.total - a.total).slice(0, 5), [periodoLancamentos]);
  const ultimosLancamentos = useMemo(() => periodoLancamentos.slice().sort((a, b) => b.data.localeCompare(a.data)).slice(0, 5), [periodoLancamentos]);

  const temFiltrosAtivos = obraId !== 'todas' || periodo !== 'todos' || categoria !== 'todas' || fornecedor !== 'todos' || status !== 'todas';

  function limparFiltros() {
    setObraId('todas');
    setPeriodo('todos');
    setDataInicioPersonalizada('');
    setDataFimPersonalizada('');
    setCategoria('todas');
    setFornecedor('todos');
    setStatus('todas');
  }

  const obraSelecionada = obraId !== 'todas' ? obras.find((o) => o.id === obraId) : null;
  const nomeFornecedores = fornecedores.slice().sort((a, b) => a.nome.localeCompare(b.nome));
  const temContas = contas.length > 0;

  return (
    <div className="space-y-6">
      {/* ---- filtros ---- */}
      <div className="eco-card p-4">
        <div className="flex items-center gap-1.5 text-xs font-medium text-stone-500 mb-3">
          <Filter size={13} /> Filtros
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <label className="text-xs text-stone-500 block mb-1">Obra</label>
            <select value={obraId} onChange={(e) => setObraId(e.target.value)}
              className="eco-input">
              <option value="todas">Todas as obras</option>
              {obras.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-stone-500 block mb-1">Período</label>
            <select value={periodo} onChange={(e) => setPeriodo(e.target.value)}
              className="eco-input">
              {PERIODOS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-stone-500 block mb-1">Categoria</label>
            <select value={categoria} onChange={(e) => setCategoria(e.target.value)}
              className="eco-input">
              <option value="todas">Todas as categorias</option>
              {Object.entries(CATEGORIAS).map(([key, c]) => <option key={key} value={key}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-stone-500 block mb-1">Fornecedor</label>
            <select value={fornecedor} onChange={(e) => setFornecedor(e.target.value)}
              className="eco-input">
              <option value="todos">Todos os fornecedores</option>
              {nomeFornecedores.map((f) => <option key={f.id} value={f.nome}>{f.nome}</option>)}
            </select>
          </div>
          {temContas && (
            <div>
              <label className="text-xs text-stone-500 block mb-1">Status (contas)</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}
                className="eco-input">
                <option value="todas">Todas</option>
                <option value="pago">Pagas</option>
                <option value="pendente">Pendentes</option>
                <option value="atraso">Em atraso</option>
              </select>
            </div>
          )}
          <div className="flex items-end">
            <button
              onClick={limparFiltros}
              disabled={!temFiltrosAtivos}
              className="eco-btn-secondary eco-btn-sm w-full"
            >
              <X size={14} /> Limpar filtros
            </button>
          </div>
        </div>
        {periodo === 'personalizado' && (
          <div className="flex flex-wrap gap-3 mt-3">
            <div>
              <label className="text-xs text-stone-500 block mb-1">De</label>
              <input type="date" value={dataInicioPersonalizada} onChange={(e) => setDataInicioPersonalizada(e.target.value)}
                className="eco-input" />
            </div>
            <div>
              <label className="text-xs text-stone-500 block mb-1">Até</label>
              <input type="date" value={dataFimPersonalizada} onChange={(e) => setDataFimPersonalizada(e.target.value)}
                className="eco-input" />
            </div>
          </div>
        )}
      </div>

      {/* ---- cards de indicadores ---- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 eco-stagger">
        <StatCard label="Custo total" numero={custoTotal} formatar={formatMoney} sub={obraSelecionada ? obraSelecionada.nome : 'Todas as obras · desde o início'} icon={Wallet} />
        <StatCard label="Custo no período" numero={custoPeriodo} formatar={formatMoney} sub={PERIODOS.find((p) => p.key === periodo)?.label} icon={TrendingUp} />
        <StatCard label="Orçamento total" numero={orcamentoTotal} formatar={formatMoney} valor="—" sub={orcamentoTotal == null ? 'Nenhum orçamento definido' : undefined} icon={PiggyBank} />
        <StatCard
          label="Saldo disponível"
          numero={saldo}
          formatar={formatMoney}
          valor="—"
          tone={saldo != null ? (saldo < 0 ? 'bad' : 'good') : 'default'}
          sub={saldo != null && saldo < 0 ? 'Orçamento ultrapassado' : undefined}
          icon={saldo != null && saldo < 0 ? TrendingDown : TrendingUp}
        />
        <StatCard
          label="% do orçamento utilizado"
          numero={pctUtilizado}
          formatar={formatPct}
          valor="—"
          tone={pctUtilizado != null && pctUtilizado > 100 ? 'bad' : 'default'}
          icon={Percent}
        />
        <StatCard label="Média por lançamento" numero={mediaGastos} formatar={formatMoney} sub={`${periodoLancamentos.length} lançamento(s) no período`} icon={Layers} />
        <StatCard label="Maior categoria de gasto" valor={maiorCategoria ? maiorCategoria.label : '—'} sub={maiorCategoria ? `${formatMoney(maiorCategoria.valor)} · ${formatPct(maiorCategoria.pct)}` : 'Sem lançamentos'} icon={Layers} />
        {obraId === 'todas' ? (
          <StatCard label="Obras no recorte" numero={obraDados.length} formatar={(v) => String(Math.round(v))} sub={`de ${obras.length} cadastrada(s)`} icon={Building2} />
        ) : (
          <StatCard label="Fornecedores envolvidos" numero={fornecedoresDadosTodos.length} formatar={(v) => String(Math.round(v))} icon={Users} />
        )}
        {temContas && (
          <>
            <StatCard label="Valor pago" numero={valorPago} formatar={formatMoney} tone="good" icon={CheckCircle2} />
            <StatCard label="Valor pendente" numero={valorPendente} formatar={formatMoney} icon={Wallet} />
            <StatCard
              label="Contas em atraso"
              numero={contasEmAtraso.length}
              formatar={(v) => String(Math.round(v))}
              sub={contasEmAtraso.length > 0 ? formatMoney(contasEmAtraso.reduce((a, c) => a + c.valor, 0)) : 'Nenhuma'}
              tone={contasEmAtraso.length > 0 ? 'bad' : 'good'}
              icon={AlertTriangle}
            />
          </>
        )}
      </div>

      {/* ---- alertas ---- */}
      {alertas.length > 0 && (
        <SectionCard title="Alertas financeiros">
          <div className="space-y-1.5 eco-stagger">
            {alertas.slice(0, 8).map((a, i) => <AlertaItem key={i} alerta={a} />)}
          </div>
        </SectionCard>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 eco-stagger">
        {obraId === 'todas' && (
          <SectionCard title="Custos por obra" subtitle="Quanto cada obra consumiu no recorte filtrado">
            {obraDados.length === 0 ? <p className="text-xs text-stone-400 py-10 text-center">Nenhum lançamento no recorte selecionado.</p> : <GraficoPorObra dados={obraDados} />}
          </SectionCard>
        )}

        <SectionCard title="Gastos por categoria" subtitle="Onde o dinheiro está sendo gasto">
          {categoria !== 'todas' ? (
            <p className="text-xs text-stone-400 py-10 text-center">Filtro de categoria ativo — selecione "Todas as categorias" para ver a distribuição.</p>
          ) : (
            <GraficoCategoria dados={categoriaDados} />
          )}
        </SectionCard>

        <div className={obraId === 'todas' ? 'lg:col-span-2' : ''}>
          <GraficoEvolucao dados={evolucaoDados} granularidade={granularidade} setGranularidade={setGranularidade} />
        </div>

        <SectionCard title="Orçamento x Realizado" subtitle="Comparação entre o planejado e o gasto real (desde o início da obra)">
          <GraficoOrcamentoRealizado dados={orcamentoRealizadoDados} />
        </SectionCard>

        {obraId === 'todas' ? (
          <SectionCard title="Obras com maior custo" subtitle="Ranking pelo total gasto no recorte filtrado">
            {obraDados.length === 0 ? <p className="text-xs text-stone-400 py-10 text-center">Nenhum lançamento no recorte selecionado.</p> : <RankingObras dados={obraDados} obras={obras} categoria={categoria} />}
          </SectionCard>
        ) : (
          <>
            <TabelaLancamentos titulo="Maiores lançamentos" itens={maioresLancamentos} />
            <TabelaLancamentos titulo="Últimos lançamentos" itens={ultimosLancamentos} />
          </>
        )}

        <SectionCard title="Fornecedores que mais geram custo" subtitle="Soma dos lançamentos por fornecedor, no recorte filtrado">
          <RankingFornecedores dados={fornecedoresDados} />
        </SectionCard>
      </div>
    </div>
  );
}
