// Cálculo puro do resumo final de uma obra (finalizada ou não).
// Reaproveita as mesmas funções de agregação do Dashboard Financeiro
// (dashboardCalc.js) para garantir que os números batem em todo o sistema —
// nenhum valor aqui é inventado, tudo vem de soma/filtro sobre os
// lançamentos reais daquela obra.
import { somarTotal, agruparPorCategoria, agruparPorFornecedor, evoluirPorPeriodo } from '../dashboard/dashboardCalc';

export function calcularResumoObra(obra, todosLancamentos, CATEGORIAS, topN = 8) {
  const lancamentosObra = todosLancamentos.filter((l) => l.obraId === obra.id);
  const totalGasto = somarTotal(lancamentosObra);
  const orcamento = obra.orcamento || null;
  const saldo = orcamento != null ? orcamento - totalGasto : null;
  const pctUtilizado = orcamento ? (totalGasto / orcamento) * 100 : null;
  const statusOrcamentario = orcamento == null ? null : (totalGasto > orcamento ? 'acima' : 'dentro');

  const porCategoria = agruparPorCategoria(lancamentosObra, CATEGORIAS);
  const porFornecedor = agruparPorFornecedor(lancamentosObra, topN);
  const evolucaoMensal = evoluirPorPeriodo(lancamentosObra, 'mensal');

  const maioresDespesas = [...lancamentosObra]
    .sort((a, b) => (Number(b.total) || 0) - (Number(a.total) || 0))
    .slice(0, topN)
    .map((l) => ({
      descricao: l.descricao,
      categoria: l.categoria,
      categoriaLabel: CATEGORIAS[l.categoria] ? CATEGORIAS[l.categoria].label : l.categoria,
      total: Number(l.total) || 0,
      data: l.data,
      fornecedorNome: l.fornecedorNome || '',
    }));

  const dataInicio = obra.criadoEm;
  const dataFim = obra.finalizadaEm ? obra.finalizadaEm.slice(0, 10) : new Date().toISOString().slice(0, 10);
  const duracaoDias = dataInicio ? Math.max(1, Math.round((new Date(`${dataFim}T00:00:00`) - new Date(`${dataInicio}T00:00:00`)) / 86400000) + 1) : null;
  const duracaoMeses = duracaoDias ? Math.max(1, duracaoDias / 30) : null;
  const mediaGastoPorMes = duracaoMeses && evolucaoMensal.length > 1 ? totalGasto / duracaoMeses : null;

  return {
    lancamentosObra,
    totalGasto,
    orcamento,
    saldo,
    pctUtilizado,
    statusOrcamentario,
    qtdLancamentos: lancamentosObra.length,
    qtdItensDistintos: new Set(lancamentosObra.map((l) => l.descricao)).size,
    porCategoria,
    porFornecedor,
    evolucaoMensal,
    maioresDespesas,
    dataInicio,
    dataFim,
    duracaoDias,
    mediaGastoPorMes,
  };
}
