// Funções puras de filtragem/agregação usadas pelo Dashboard Financeiro.
// Nenhuma delas mexe em estado do React — recebem os arrays já carregados
// pelo app (obras, lancamentos, fornecedores, contas) e devolvem números
// prontos para exibição. Mantidas separadas da UI para ficar fácil de
// conferir que nenhum valor é inventado: tudo vem de soma/filtro sobre os
// dados reais.

import { chaveFornecedor } from '../textUtils';

const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export const PERIODOS = [
  { key: 'todos', label: 'Todo o período' },
  { key: '7d', label: 'Últimos 7 dias' },
  { key: '30d', label: 'Últimos 30 dias' },
  { key: '90d', label: 'Últimos 90 dias' },
  { key: 'mes_atual', label: 'Este mês' },
  { key: 'ano_atual', label: 'Este ano' },
  { key: 'personalizado', label: 'Personalizado' },
];

export function getPeriodoRange(periodo, dataInicioPersonalizada, dataFimPersonalizada, hojeISO) {
  const hoje = hojeISO || new Date().toISOString().slice(0, 10);
  if (periodo === 'todos') return null;
  if (periodo === 'personalizado') {
    if (!dataInicioPersonalizada && !dataFimPersonalizada) return null;
    return { inicio: dataInicioPersonalizada || '0000-01-01', fim: dataFimPersonalizada || hoje };
  }
  if (periodo === 'mes_atual') {
    return { inicio: `${hoje.slice(0, 7)}-01`, fim: hoje };
  }
  if (periodo === 'ano_atual') {
    return { inicio: `${hoje.slice(0, 4)}-01-01`, fim: hoje };
  }
  const dias = { '7d': 7, '30d': 30, '90d': 90 }[periodo];
  if (!dias) return null;
  const limite = new Date(`${hoje}T00:00:00`);
  limite.setDate(limite.getDate() - dias);
  return { inicio: limite.toISOString().slice(0, 10), fim: hoje };
}

function dentroDoPeriodo(dataISO, range) {
  if (!range) return true;
  if (!dataISO) return false;
  return dataISO >= range.inicio && dataISO <= range.fim;
}

// Separa os lançamentos em dois recortes:
// - escopo: filtrado por obra/categoria/fornecedor (sem período) — usado para
//   métricas "desde o início" (custo total, orçamento, saldo).
// - periodo: o mesmo recorte, restrito ao período selecionado — usado nos
//   gráficos e nas métricas "no período".
export function filtrarLancamentos(lancamentos, { obraId, categoria, fornecedor, periodoRange }) {
  const escopo = lancamentos.filter((l) => {
    if (obraId && obraId !== 'todas' && l.obraId !== obraId) return false;
    if (categoria && categoria !== 'todas' && l.categoria !== categoria) return false;
    if (fornecedor && fornecedor !== 'todos' && chaveFornecedor(l.fornecedorNome) !== chaveFornecedor(fornecedor)) return false;
    return true;
  });
  const periodo = periodoRange ? escopo.filter((l) => dentroDoPeriodo(l.data, periodoRange)) : escopo;
  return { escopo, periodo };
}

export function filtrarContas(contas, { obraId, fornecedor, status, periodoRange }) {
  return contas.filter((c) => {
    if (obraId && obraId !== 'todas' && c.obraId !== obraId) return false;
    if (fornecedor && fornecedor !== 'todos' && chaveFornecedor(c.fornecedorNome) !== chaveFornecedor(fornecedor)) return false;
    if (status && status !== 'todas') {
      if (status === 'atraso') {
        const hoje = new Date().toISOString().slice(0, 10);
        if (c.status === 'pago' || c.vencimento >= hoje) return false;
      } else if (c.status !== status) {
        return false;
      }
    }
    if (periodoRange && !dentroDoPeriodo(c.vencimento, periodoRange)) return false;
    return true;
  });
}

export function somarTotal(lancamentos) {
  return lancamentos.reduce((a, l) => a + (Number(l.total) || 0), 0);
}

export function agruparPorObra(lancamentos, obras) {
  const somas = {};
  lancamentos.forEach((l) => { somas[l.obraId] = (somas[l.obraId] || 0) + (Number(l.total) || 0); });
  return obras
    .map((o) => ({ obraId: o.id, nome: o.nome, total: somas[o.id] || 0 }))
    .filter((x) => x.total > 0)
    .sort((a, b) => b.total - a.total);
}

export function agruparPorCategoria(lancamentos, CATEGORIAS) {
  const somas = {};
  Object.keys(CATEGORIAS).forEach((k) => { somas[k] = 0; });
  lancamentos.forEach((l) => { somas[l.categoria] = (somas[l.categoria] || 0) + (Number(l.total) || 0); });
  const total = Object.values(somas).reduce((a, v) => a + v, 0);
  return Object.entries(somas)
    // um lançamento antigo com categoria que não existe mais não pode
    // derrubar a tela inteira: ele aparece agrupado como "Outros"
    .map(([key, valor]) => ({ key, label: (CATEGORIAS[key] || {}).label || 'Outros', valor, pct: total > 0 ? (valor / total) * 100 : 0 }))
    .filter((c) => c.valor > 0)
    .sort((a, b) => b.valor - a.valor);
}

// Agrupa pelo nome "sem caixa e sem acento", senão a mesma distribuidora
// escrita de dois jeitos ("ALBERTINA" e "Albertina") apareceria duas
// vezes, cada uma com metade do valor. Na tela sai a primeira grafia.
export function agruparPorFornecedor(lancamentos, limite) {
  const somas = {};
  lancamentos.forEach((l) => {
    const nome = String(l.fornecedorNome || '').trim();
    if (!nome) return;
    const chave = chaveFornecedor(nome);
    if (!somas[chave]) somas[chave] = { nome, total: 0 };
    somas[chave].total += Number(l.total) || 0;
  });
  const lista = Object.values(somas).sort((a, b) => b.total - a.total);
  return limite ? lista.slice(0, limite) : lista;
}

function chaveSemana(dataISO) {
  const d = new Date(`${dataISO}T00:00:00`);
  const diaSemana = (d.getDay() + 6) % 7; // segunda = 0
  d.setDate(d.getDate() - diaSemana);
  return d.toISOString().slice(0, 10);
}

export function evoluirPorPeriodo(lancamentos, granularidade) {
  const somas = {};
  lancamentos.forEach((l) => {
    if (!l.data) return;
    let chave;
    if (granularidade === 'diario') chave = l.data;
    else if (granularidade === 'semanal') chave = chaveSemana(l.data);
    else chave = l.data.slice(0, 7); // mensal: YYYY-MM
    somas[chave] = (somas[chave] || 0) + (Number(l.total) || 0);
  });
  return Object.entries(somas)
    .map(([chave, total]) => ({
      chave,
      total,
      label: granularidade === 'mensal'
        ? `${MESES_ABREV[Number(chave.slice(5, 7)) - 1]}/${chave.slice(2, 4)}`
        : `${chave.slice(8, 10)}/${chave.slice(5, 7)}`,
    }))
    .sort((a, b) => a.chave.localeCompare(b.chave));
}

// Orçamento aplicável ao recorte atual: se uma categoria específica está
// selecionada e a obra tem orçamento definido para ela, usa esse valor;
// caso contrário usa o orçamento total da obra. Orçamento é um conceito da
// obra inteira (não do período), por isso não é filtrado por data.
export function orcamentoDaObra(obra, categoria) {
  if (categoria && categoria !== 'todas' && obra.orcamentoCategorias && obra.orcamentoCategorias[categoria] != null) {
    return obra.orcamentoCategorias[categoria];
  }
  if (categoria && categoria !== 'todas') return null;
  return obra.orcamento || null;
}

export function orcamentoTotalEscopo(obras, obraId, categoria) {
  const lista = obraId && obraId !== 'todas' ? obras.filter((o) => o.id === obraId) : obras;
  let total = 0;
  let algumDefinido = false;
  lista.forEach((o) => {
    const v = orcamentoDaObra(o, categoria);
    if (v != null) { total += v; algumDefinido = true; }
  });
  return algumDefinido ? total : null;
}

export function gerarAlertasFinanceiro(obras, lancamentosTodos, categoria, CATEGORIAS) {
  const alertas = [];
  obras.forEach((obra) => {
    const gastos = lancamentosTodos.filter((l) => l.obraId === obra.id);
    const gasto = somarTotal(gastos);
    const orcamento = orcamentoDaObra(obra, categoria);
    if (orcamento && orcamento > 0) {
      const pct = (gasto / orcamento) * 100;
      if (pct > 100) {
        alertas.push({ tipo: 'critical', texto: `${obra.nome.toUpperCase()} ultrapassou o orçamento em ${formatarValorSimples(gasto - orcamento)}.` });
      } else if (pct >= 80) {
        alertas.push({ tipo: 'warning', texto: `${obra.nome.toUpperCase()} está com ${pct.toFixed(0)}% do orçamento utilizado.` });
      } else {
        alertas.push({ tipo: 'good', texto: `${obra.nome.toUpperCase()} está dentro do orçamento planejado (${pct.toFixed(0)}% utilizado).` });
      }
    }
    if (!categoria || categoria === 'todas') {
      const porCategoria = {};
      gastos.forEach((l) => { porCategoria[l.categoria] = (porCategoria[l.categoria] || 0) + (Number(l.total) || 0); });
      const totalObra = gasto;
      Object.entries(porCategoria).forEach(([cat, valor]) => {
        const pctCat = totalObra > 0 ? (valor / totalObra) * 100 : 0;
        if (pctCat >= 60 && totalObra > 0) {
          const label = CATEGORIAS[cat] ? CATEGORIAS[cat].label : cat;
          alertas.push({ tipo: 'warning', texto: `Em ${obra.nome.toUpperCase()}, a categoria ${label.toUpperCase()} representa ${pctCat.toFixed(0)}% dos gastos.`, categoriaKey: cat });
        }
      });
    }
  });
  const ordem = { critical: 0, warning: 1, good: 2 };
  return alertas.sort((a, b) => ordem[a.tipo] - ordem[b.tipo]);
}

function formatarValorSimples(v) {
  return (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
