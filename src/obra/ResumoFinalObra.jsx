import React, { useMemo, useState } from 'react';
import {
  ArrowLeft, Download, Wallet, PiggyBank, TrendingUp, TrendingDown, Percent,
  Layers, AlertTriangle, CheckCircle2, Calendar, MapPin, User,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { formatMoney, formatDateBR, CATEGORIAS, CORES_CATEGORIA, formatPct } from '../domain';
import { StatCard, SectionCard, CustomTooltip, RankingFornecedores } from '../dashboard/FinanceiroDashboard';
import { calcularResumoObra } from './obraResumoCalc';
import { gerarPdfResumoObra } from './gerarPdfResumoObra';

const VERDE = '#16a34a';
const VERMELHO = '#dc2626';
const CINZA_REF = '#d6d3d1';

function formatDuracao(dias) {
  if (!dias) return '—';
  if (dias < 30) return `${dias} dia${dias === 1 ? '' : 's'}`;
  const meses = Math.round(dias / 30);
  return `${dias} dias (~${meses} ${meses === 1 ? 'mês' : 'meses'})`;
}

function GraficoCategoriaResumo({ dados }) {
  if (dados.length === 0) return <p className="text-xs text-stone-400 py-8 text-center">Nenhum lançamento registrado.</p>;
  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <div className="w-full sm:w-[180px] flex-shrink-0">
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie data={dados} dataKey="valor" nameKey="label" innerRadius={45} outerRadius={72} paddingAngle={2} stroke="#fff" strokeWidth={2}>
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

function GraficoEvolucaoResumo({ dados }) {
  if (dados.length < 2) return <p className="text-xs text-stone-400 py-8 text-center">Poucos meses de histórico para exibir uma evolução.</p>;
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={dados} margin={{ left: 0, right: 16, top: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0efed" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#78716c' }} axisLine={{ stroke: '#e7e5e4' }} tickLine={false} />
        <YAxis tickFormatter={(v) => formatMoney(v)} tick={{ fontSize: 11, fill: '#78716c' }} axisLine={false} tickLine={false} width={90} />
        <Tooltip content={<CustomTooltip formatter={formatMoney} />} />
        <Line type="monotone" dataKey="total" name="Gasto" stroke={VERDE} strokeWidth={2} dot={{ r: 3, fill: VERDE }} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function GraficoOrcamentoXRealizado({ orcamento, totalGasto, nome }) {
  if (orcamento == null) return <p className="text-xs text-stone-400 py-8 text-center">Nenhum orçamento definido para esta obra.</p>;
  const dados = [{ nome, orcamento, realizado: totalGasto }];
  return (
    <ResponsiveContainer width="100%" height={130}>
      <BarChart data={dados} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }} barGap={4} barCategoryGap="40%">
        <CartesianGrid strokeDasharray="3 3" stroke="#f0efed" horizontal={false} />
        <XAxis type="number" tickFormatter={(v) => formatMoney(v)} tick={{ fontSize: 11, fill: '#78716c' }} axisLine={{ stroke: '#e7e5e4' }} tickLine={false} />
        <YAxis type="category" dataKey="nome" width={0} tick={false} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip formatter={formatMoney} />} cursor={{ fill: '#f5f5f4' }} />
        <Bar dataKey="orcamento" name="Orçamento" fill={CINZA_REF} radius={[0, 4, 4, 0]} barSize={22} />
        <Bar dataKey="realizado" name="Custo real" fill={totalGasto > orcamento ? VERMELHO : VERDE} radius={[0, 4, 4, 0]} barSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function TabelaMaioresDespesas({ itens }) {
  if (itens.length === 0) return <p className="text-xs text-stone-400 py-6 text-center">Nenhum lançamento registrado.</p>;
  return (
    <div className="overflow-x-auto -mx-4">
      <table className="w-full text-sm min-w-[420px]">
        <tbody>
          {itens.map((l, i) => (
            <tr key={i} className="border-t border-stone-100 first:border-t-0">
              <td className="px-4 py-2 text-stone-400 w-6">{i + 1}.</td>
              <td className="px-2 py-2 text-stone-800">
                {l.descricao}
                {l.fornecedorNome && <span className="text-xs text-stone-400"> · {l.fornecedorNome}</span>}
              </td>
              <td className="px-2 py-2 text-xs text-stone-500 whitespace-nowrap">{l.categoriaLabel}</td>
              <td className="px-4 py-2 text-right font-medium text-stone-900 whitespace-nowrap">{formatMoney(l.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ResumoFinalObra({ obra, lancamentos, onVoltar }) {
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const resumo = useMemo(() => calcularResumoObra(obra, lancamentos, CATEGORIAS), [obra, lancamentos]);

  const acimaDoOrcamento = resumo.statusOrcamentario === 'acima';
  const dentroDoOrcamento = resumo.statusOrcamentario === 'dentro';

  async function handleGerarPdf() {
    setGerandoPdf(true);
    try {
      await gerarPdfResumoObra(obra, resumo);
    } finally {
      setGerandoPdf(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button onClick={onVoltar} className="text-sm text-stone-500 hover:text-stone-800 flex items-center gap-1 transition-colors">
          <ArrowLeft size={14} /> Voltar para a obra
        </button>
        <button onClick={handleGerarPdf} disabled={gerandoPdf} className="eco-btn-primary eco-btn-sm">
          <Download size={14} /> {gerandoPdf ? 'Gerando PDF...' : 'Gerar PDF'}
        </button>
      </div>

      {/* ---- Informações da obra ---- */}
      <SectionCard title="Informações da obra">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div className="flex justify-between sm:justify-start sm:gap-2">
            <span className="text-stone-500">Nome</span>
            <span className="font-medium text-stone-900 sm:ml-auto">{obra.nome}</span>
          </div>
          {obra.cliente && (
            <div className="flex justify-between sm:justify-start sm:gap-2">
              <span className="text-stone-500 flex items-center gap-1"><User size={12} /> Cliente</span>
              <span className="text-stone-800 sm:ml-auto">{obra.cliente}</span>
            </div>
          )}
          {obra.endereco && (
            <div className="flex justify-between sm:justify-start sm:gap-2">
              <span className="text-stone-500 flex items-center gap-1"><MapPin size={12} /> Endereço</span>
              <span className="text-stone-800 sm:ml-auto text-right">{obra.endereco}</span>
            </div>
          )}
          <div className="flex justify-between sm:justify-start sm:gap-2">
            <span className="text-stone-500 flex items-center gap-1"><Calendar size={12} /> Data de início</span>
            <span className="text-stone-800 sm:ml-auto">
              {formatDateBR(resumo.dataInicio)}
              {!resumo.inicioRegistrado && <span className="text-stone-400"> (cadastro)</span>}
            </span>
          </div>
          <div className="flex justify-between sm:justify-start sm:gap-2">
            <span className="text-stone-500 flex items-center gap-1"><Calendar size={12} /> Data de finalização</span>
            <span className="text-stone-800 sm:ml-auto">{obra.finalizadaEm ? formatDateBR(obra.finalizadaEm.slice(0, 10)) : '—'}</span>
          </div>
          <div className="flex justify-between sm:justify-start sm:gap-2">
            <span className="text-stone-500">Duração da obra</span>
            <span className="text-stone-800 sm:ml-auto">{formatDuracao(resumo.duracaoDias)}</span>
          </div>
          <div className="flex justify-between sm:justify-start sm:gap-2">
            <span className="text-stone-500">Status</span>
            <span className="eco-badge bg-green-50 text-green-700 border border-green-200 sm:ml-auto"><CheckCircle2 size={12} /> CONCLUÍDA</span>
          </div>
        </div>
      </SectionCard>

      {/* ---- Conclusão financeira ---- */}
      {resumo.orcamento != null && (
        <div className={`eco-card p-4 flex items-center gap-3 ${acimaDoOrcamento ? 'border-red-200 bg-red-50/40' : 'border-green-200 bg-green-50/40'}`}>
          {acimaDoOrcamento ? <AlertTriangle size={20} className="text-red-600 flex-shrink-0" /> : <CheckCircle2 size={20} className="text-green-600 flex-shrink-0" />}
          <div>
            <p className={`text-sm font-semibold ${acimaDoOrcamento ? 'text-red-700' : 'text-green-700'}`}>
              {acimaDoOrcamento ? 'Obra finalizada acima do orçamento' : 'Obra finalizada dentro do orçamento'}
            </p>
            <p className="text-xs text-stone-500">
              {acimaDoOrcamento
                ? `Excedente de ${formatMoney(Math.abs(resumo.saldo))} (${formatPct(resumo.pctUtilizado)} do orçamento utilizado)`
                : `Economia de ${formatMoney(resumo.saldo)} (${formatPct(resumo.pctUtilizado)} do orçamento utilizado)`}
            </p>
          </div>
        </div>
      )}

      {/* ---- Resumo financeiro ---- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 eco-stagger">
        <StatCard label="Orçamento total" numero={resumo.orcamento} formatar={formatMoney} valor="—" icon={PiggyBank} />
        <StatCard label="Custo total" numero={resumo.totalGasto} formatar={formatMoney} icon={Wallet} />
        <StatCard
          label="Saldo"
          numero={resumo.saldo}
          formatar={formatMoney}
          valor="—"
          tone={resumo.saldo != null ? (resumo.saldo < 0 ? 'bad' : 'good') : 'default'}
          icon={resumo.saldo != null && resumo.saldo < 0 ? TrendingDown : TrendingUp}
        />
        <StatCard
          label="% do orçamento utilizado"
          numero={resumo.pctUtilizado}
          formatar={formatPct}
          valor="—"
          tone={resumo.pctUtilizado != null && resumo.pctUtilizado > 100 ? 'bad' : 'default'}
          icon={Percent}
        />
        <StatCard label="Lançamentos" numero={resumo.qtdLancamentos} formatar={(v) => String(Math.round(v))} icon={Layers} />
        {resumo.mediaGastoPorMes != null && (
          <StatCard label="Média de gasto por mês" numero={resumo.mediaGastoPorMes} formatar={formatMoney} icon={TrendingUp} />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 eco-stagger">
        <SectionCard title="Gastos por categoria" subtitle="Onde o dinheiro desta obra foi gasto">
          <GraficoCategoriaResumo dados={resumo.porCategoria} />
        </SectionCard>

        <SectionCard title="Evolução dos gastos" subtitle="Total gasto por mês, do início até a finalização">
          <GraficoEvolucaoResumo dados={resumo.evolucaoMensal} />
        </SectionCard>

        <SectionCard title="Orçamento x Custo real">
          <GraficoOrcamentoXRealizado orcamento={resumo.orcamento} totalGasto={resumo.totalGasto} nome={obra.nome} />
        </SectionCard>

        <SectionCard title="Principais fornecedores">
          <RankingFornecedores dados={resumo.porFornecedor} />
        </SectionCard>

        <div className="lg:col-span-2">
          <SectionCard title="Maiores despesas da obra">
            <TabelaMaioresDespesas itens={resumo.maioresDespesas} />
          </SectionCard>
        </div>
      </div>

      {obra.observacoesFinais && (
        <SectionCard title="Observações da obra">
          <p className="text-sm text-stone-600 whitespace-pre-wrap">{obra.observacoesFinais}</p>
        </SectionCard>
      )}

      {obra.finalizadaEm && (
        <p className="text-xs text-stone-400 text-center">
          Obra finalizada em {formatDateBR(obra.finalizadaEm.slice(0, 10))} às {obra.finalizadaEm.slice(11, 16)}.
        </p>
      )}
    </div>
  );
}
