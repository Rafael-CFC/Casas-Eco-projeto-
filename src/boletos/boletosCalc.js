// Funções puras de filtragem/agregação do módulo de Boletos — mesmo estilo
// de src/dashboard/dashboardCalc.js: recebem os arrays já carregados e
// devolvem números prontos, sem mexer em estado do React.
import { todayISO } from '../domain';
import { classificarBoleto } from './boletosStore';
import { PERIODOS, getPeriodoRange } from '../dashboard/dashboardCalc';

export { PERIODOS, getPeriodoRange };

function dentroDoPeriodo(dataISO, range) {
  if (!range) return true;
  if (!dataISO) return false;
  return dataISO >= range.inicio && dataISO <= range.fim;
}

// Agrupamento simplificado em 4 estados (pendente/vencido/pago/cancelado),
// usado pelos filtros rápidos. A classificação mais fina (vence hoje/em 1
// dia/em 7 dias/futuro) vem de `classificarBoleto`, usada no agrupamento da
// listagem e nos alertas de vencimento.
export function statusSimplificado(boleto, hojeISO = todayISO()) {
  const c = classificarBoleto(boleto, hojeISO);
  if (c === 'pago' || c === 'cancelado' || c === 'vencido') return c;
  return 'pendente';
}

export function filtrarBoletos(boletos, { obraId, fornecedor, categoria, status, periodoRange, busca } = {}, hojeISO = todayISO()) {
  const termo = (busca || '').trim().toLowerCase();
  return boletos.filter((b) => {
    if (obraId && obraId !== 'todas') {
      if (obraId === 'sem_obra') { if (b.obraId) return false; }
      else if (b.obraId !== obraId) return false;
    }
    if (fornecedor && fornecedor !== 'todos' && (b.beneficiario || '') !== fornecedor) return false;
    if (categoria && categoria !== 'todas' && b.categoria !== categoria) return false;
    if (status && status !== 'todos' && statusSimplificado(b, hojeISO) !== status) return false;
    if (periodoRange && !dentroDoPeriodo(b.vencimento, periodoRange)) return false;
    if (termo) {
      const alvo = [b.beneficiario, b.cnpjCpfBeneficiario, b.numeroDocumento, b.nossoNumero, b.descricao, b.fornecedorNome]
        .filter(Boolean).join(' ').toLowerCase();
      if (!alvo.includes(termo)) return false;
    }
    return true;
  });
}

export function totalAPagar(boletos) {
  return boletos.filter((b) => b.status === 'pendente').reduce((a, b) => a + (Number(b.valor) || 0), 0);
}

export function totalVenceProximos7Dias(boletos, hojeISO = todayISO()) {
  return boletos
    .filter((b) => b.status === 'pendente' && ['venceHoje', 'venceEm1Dia', 'venceEm7Dias'].includes(classificarBoleto(b, hojeISO)))
    .reduce((a, b) => a + (Number(b.valor) || 0), 0);
}

export function totalVencidos(boletos, hojeISO = todayISO()) {
  return boletos
    .filter((b) => classificarBoleto(b, hojeISO) === 'vencido')
    .reduce((a, b) => a + (Number(b.valor) || 0), 0);
}

export function totalPagosNoMes(boletos, hojeISO = todayISO()) {
  const mes = hojeISO.slice(0, 7);
  return boletos
    .filter((b) => b.status === 'pago' && b.dataPagamento && b.dataPagamento.slice(0, 7) === mes)
    .reduce((a, b) => a + (Number(b.valorPago != null ? b.valorPago : b.valor) || 0), 0);
}

export function proximosVencimentos(boletos, hojeISO = todayISO(), limite = 5) {
  return boletos
    .filter((b) => b.status === 'pendente')
    .map((b) => ({ boleto: b, classe: classificarBoleto(b, hojeISO) }))
    .filter((x) => x.classe !== 'futuro')
    .sort((a, b) => a.boleto.vencimento.localeCompare(b.boleto.vencimento))
    .slice(0, limite);
}

export function totalBoletosPorObra(boletos, obraId) {
  const doObra = boletos.filter((b) => b.obraId === obraId && b.status !== 'cancelado');
  const pendente = doObra.filter((b) => b.status !== 'pago').reduce((a, b) => a + (Number(b.valor) || 0), 0);
  const pago = doObra.filter((b) => b.status === 'pago').reduce((a, b) => a + (Number(b.valorPago != null ? b.valorPago : b.valor) || 0), 0);
  return { pendente, pago, quantidade: doObra.length };
}

export function agruparBoletosPorCategoria(boletos) {
  const somas = {};
  boletos.forEach((b) => { somas[b.categoria] = (somas[b.categoria] || 0) + (Number(b.valor) || 0); });
  return Object.entries(somas).map(([categoria, total]) => ({ categoria, total })).sort((a, b) => b.total - a.total);
}

export function agruparBoletosPorFornecedor(boletos, limite) {
  const somas = {};
  boletos.forEach((b) => {
    const nome = (b.beneficiario || '').trim();
    if (!nome) return;
    somas[nome] = (somas[nome] || 0) + (Number(b.valor) || 0);
  });
  const lista = Object.entries(somas).map(([nome, total]) => ({ nome, total })).sort((a, b) => b.total - a.total);
  return limite ? lista.slice(0, limite) : lista;
}
