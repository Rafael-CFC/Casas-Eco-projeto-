// Cálculo puro do resumo final de uma obra (finalizada ou não).
// Reaproveita as mesmas funções de agregação do Dashboard Financeiro
// (dashboardCalc.js) para garantir que os números batem em todo o sistema —
// nenhum valor aqui é inventado, tudo vem de soma/filtro sobre os
// lançamentos reais daquela obra.
import { somarTotal, agruparPorCategoria, agruparPorFornecedor, evoluirPorPeriodo } from '../dashboard/dashboardCalc';
import { diasCorridos } from '../domain';
import { grupoDeGasto } from '../produtos/madeiras';
import { obraFoiIniciada } from './obraStatus';

// `grupos` é GRUPOS_GASTO (categorias do relatório, com Madeiras separada
// de Produtos da Loja) — ver src/produtos/madeiras.js.
export function calcularResumoObra(obra, todosLancamentos, grupos, topN = 8) {
  const lancamentosObra = todosLancamentos.filter((l) => l.obraId === obra.id);
  const totalGasto = somarTotal(lancamentosObra);
  const orcamento = obra.orcamento || null;
  const saldo = orcamento != null ? orcamento - totalGasto : null;
  const pctUtilizado = orcamento ? (totalGasto / orcamento) * 100 : null;
  const statusOrcamentario = orcamento == null ? null : (totalGasto > orcamento ? 'acima' : 'dentro');

  const porCategoria = agruparPorCategoria(lancamentosObra, grupos);
  const porFornecedor = agruparPorFornecedor(lancamentosObra, topN);
  const evolucaoMensal = evoluirPorPeriodo(lancamentosObra, 'mensal');

  const maioresDespesas = [...lancamentosObra]
    .sort((a, b) => (Number(b.total) || 0) - (Number(a.total) || 0))
    .slice(0, topN)
    .map((l) => ({
      descricao: l.descricao,
      categoria: l.categoria,
      categoriaLabel: (grupos[grupoDeGasto(l)] || {}).label || l.categoria,
      total: Number(l.total) || 0,
      data: l.data,
      fornecedorNome: l.fornecedorNome || '',
    }));

  // Duração conta do início REAL da obra (quando alguém apertou "Iniciar
  // obra"). Obras que nunca tiveram o início registrado caem no cadastro,
  // que é como era antes desta funcionalidade existir.
  const iniciada = obraFoiIniciada(obra);
  const dataInicio = obra.inicioObraEm || obra.criadoEm;
  const dataFim = obra.finalizadaEm ? obra.finalizadaEm.slice(0, 10) : new Date().toISOString().slice(0, 10);
  const duracaoDias = dataInicio ? Math.max(1, diasCorridos(dataInicio, dataFim)) : null;
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
    inicioRegistrado: iniciada,
    dataCadastro: obra.criadoEm,
    dataFim,
    duracaoDias,
    mediaGastoPorMes,
  };
}
