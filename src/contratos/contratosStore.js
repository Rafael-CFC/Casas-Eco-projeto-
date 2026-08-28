// Regras do módulo de Contratos (funções puras, sem React e sem rede).
//
// Decisão importante: quando um contrato é GERADO, o texto dos blocos e os
// dados da contratada são "congelados" dentro do próprio registro. Assim,
// se o modelo for alterado depois em Configurações, contratos antigos
// continuam exatamente como foram emitidos.
import { todayISO, formatMoney, formatDateBR } from '../domain';
import { valorPorExtenso } from './numeroPorExtenso';
import { aplicarMarcadores, blocosContratoDaConfig, blocosMemorialDaConfig } from '../config/configStore';
import { ETAPAS_PARCELAS } from './modeloCasasEco';

export const STATUS_CONTRATO = {
  rascunho: { label: 'RASCUNHO', cls: 'bg-stone-100 text-stone-600 border-stone-200' },
  gerado: { label: 'GERADO', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  assinado: { label: 'ASSINADO', cls: 'bg-green-50 text-green-700 border-green-200' },
  cancelado: { label: 'CANCELADO', cls: 'bg-red-50 text-red-600 border-red-200' },
};

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export function dataPorExtenso(iso) {
  if (!iso) return '';
  const [ano, mes, dia] = iso.split('-');
  return `${Number(dia)} de ${MESES[Number(mes) - 1]} de ${ano}`;
}

export function clienteVazio() {
  return { nome: '', cpfCnpj: '', endereco: '', cidade: '', estado: '', telefone: '', email: '' };
}

export function novaParcela(ordem, etapa = '', valor = 0) {
  return {
    id: crypto.randomUUID(), ordem, etapa, valor: Number(valor) || 0, vencimento: '',
    status: 'pendente', dataPagamento: null, observacao: '', pagamentos: [],
  };
}

// Contrato novo já nasce com as 7 etapas de pagamento que a empresa usa.
export function novoContratoRascunho(config) {
  const hoje = todayISO();
  return {
    id: crypto.randomUUID(),
    numero: null,
    status: 'rascunho',
    cliente: clienteVazio(),
    obraId: null,
    // campos que mudam de obra para obra
    descricaoObra: '',
    inicioObra: '',
    prazoEntrega: '60',
    valorTotal: 0,
    dataContrato: hoje,
    cidadeContrato: config?.cidadeContrato || '',
    parcelas: ETAPAS_PARCELAS.map((e, i) => novaParcela(i + 1, e)),
    // edições feitas só neste contrato (sobrescrevem o modelo)
    blocosContrato: [],
    blocosMemorial: [],
    // congelados ao gerar
    contratadaSnapshot: null,
    blocosContratoSnapshot: null,
    blocosMemorialSnapshot: null,
    versaoModelo: null,
    criadoEm: hoje,
    atualizadoEm: hoje,
    geradoEm: null,
  };
}

export function proximoNumeroContrato(contratos, hojeISO = todayISO()) {
  const ano = hojeISO.slice(0, 4);
  const doAno = contratos.filter((c) => c.numero && String(c.numero).startsWith(`${ano}/`));
  const maior = doAno.reduce((max, c) => {
    const n = parseInt(String(c.numero).split('/')[1], 10);
    return isNaN(n) ? max : Math.max(max, n);
  }, 0);
  return `${ano}/${String(maior + 1).padStart(3, '0')}`;
}

export function reordenarParcelas(parcelas) {
  return parcelas.map((p, i) => ({ ...p, ordem: i + 1 }));
}

export function moverParcela(parcelas, index, direcao) {
  const destino = index + direcao;
  if (destino < 0 || destino >= parcelas.length) return parcelas;
  const copia = [...parcelas];
  [copia[index], copia[destino]] = [copia[destino], copia[index]];
  return reordenarParcelas(copia);
}

export function totalParcelas(parcelas) {
  return (parcelas || []).reduce((a, p) => a + (Number(p.valor) || 0), 0);
}

export function diferencaParcelas(valorTotal, parcelas) {
  const diff = (Number(valorTotal) || 0) - totalParcelas(parcelas);
  return Math.abs(diff) < 0.005 ? 0 : Math.round(diff * 100) / 100;
}

export function distribuirValorIgualmente(valorTotal, parcelas) {
  const n = parcelas.length;
  if (n === 0) return parcelas;
  const total = Number(valorTotal) || 0;
  const base = Math.floor((total / n) * 100) / 100;
  return parcelas.map((p, i) => ({
    ...p,
    valor: i === n - 1 ? Math.round((total - base * (n - 1)) * 100) / 100 : base,
  }));
}

export function validarContrato(contrato, config) {
  const problemas = [];
  const bloqueios = [];

  if (!contrato.cliente.nome.trim()) bloqueios.push('Informe o nome do cliente.');
  if (!(Number(contrato.valorTotal) > 0)) bloqueios.push('Informe o valor total do contrato.');
  if (!config?.contratada?.razaoSocial?.trim()) bloqueios.push('Preencha os dados da empresa em Configurações.');

  if (!contrato.descricaoObra.trim()) problemas.push('A descrição da casa (cláusula primeira) está vazia.');
  if (!contrato.cliente.cpfCnpj.trim()) problemas.push('O CPF do cliente não foi informado.');
  if (!contrato.cliente.endereco.trim()) problemas.push('O endereço do cliente não foi informado.');

  const diff = diferencaParcelas(contrato.valorTotal, contrato.parcelas);
  if (diff !== 0) {
    problemas.push(
      diff > 0
        ? `A soma das parcelas está ${formatMoney(diff)} ABAIXO do valor do contrato.`
        : `A soma das parcelas está ${formatMoney(Math.abs(diff))} ACIMA do valor do contrato.`
    );
  }

  return { problemas, bloqueios, podeGerar: bloqueios.length === 0 };
}

// Dicionário de marcadores {{...}} com os dados reais do contrato.
export function montarValoresMarcadores(contrato, config) {
  const contratada = contrato.contratadaSnapshot || config?.contratada || {};
  const cidade = contrato.cidadeContrato || config?.cidadeContrato || contratada.cidade || '';
  return {
    '{{CONTRATADA_RAZAO_SOCIAL}}': contratada.razaoSocial,
    '{{CONTRATADA_CNPJ}}': contratada.cnpj,
    '{{CONTRATADA_ENDERECO}}': contratada.endereco,
    '{{CONTRATADA_REPRESENTANTE}}': contratada.representante,
    '{{CONTRATADA_CPF}}': contratada.cpfRepresentante,
    '{{CLIENTE_NOME}}': contrato.cliente.nome,
    '{{CLIENTE_CPF}}': contrato.cliente.cpfCnpj,
    '{{CLIENTE_ENDERECO}}': contrato.cliente.endereco,
    '{{DESCRICAO_OBRA}}': contrato.descricaoObra,
    '{{INICIO_OBRA}}': contrato.inicioObra,
    '{{PRAZO_ENTREGA}}': contrato.prazoEntrega,
    '{{VALOR_TOTAL}}': `R$${(Number(contrato.valorTotal) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    '{{VALOR_TOTAL_EXTENSO}}': valorPorExtenso(contrato.valorTotal),
    '{{DATA_CONTRATO_EXTENSO}}': dataPorExtenso(contrato.dataContrato),
    '{{CIDADE_DATA}}': `${cidade}, ${dataPorExtenso(contrato.dataContrato)}`,
  };
}

// Blocos prontos para exibição/PDF: estrutura do modelo + edições do
// contrato + marcadores substituídos.
function resolverBlocos(blocosBase, edicoes, valores) {
  const porChave = Object.fromEntries((edicoes || []).map((b) => [b.chave, b.texto]));
  return blocosBase.map((b) => {
    const texto = porChave[b.chave] !== undefined ? porChave[b.chave] : b.texto;
    return { ...b, texto: aplicarMarcadores(texto, valores) };
  });
}

export function blocosContratoResolvidos(contrato, config) {
  const valores = montarValoresMarcadores(contrato, config);
  const base = contrato.blocosContratoSnapshot || blocosContratoDaConfig(config);
  return resolverBlocos(base, contrato.blocosContrato, valores);
}

export function blocosMemorialResolvidos(contrato, config) {
  const valores = montarValoresMarcadores(contrato, config);
  const base = contrato.blocosMemorialSnapshot || blocosMemorialDaConfig(config);
  return resolverBlocos(base, contrato.blocosMemorial, valores);
}

export function congelarContrato(contrato, config, contratos) {
  return {
    ...contrato,
    numero: contrato.numero || proximoNumeroContrato(contratos),
    status: contrato.status === 'rascunho' ? 'gerado' : contrato.status,
    contratadaSnapshot: contrato.contratadaSnapshot || { ...config.contratada },
    blocosContratoSnapshot: contrato.blocosContratoSnapshot || blocosContratoDaConfig(config),
    blocosMemorialSnapshot: contrato.blocosMemorialSnapshot || blocosMemorialDaConfig(config),
    versaoModelo: contrato.versaoModelo || config.modeloContrato?.versao || 1,
    cidadeContrato: contrato.cidadeContrato || config.cidadeContrato || config.contratada?.cidade || '',
    geradoEm: contrato.geradoEm || todayISO(),
    atualizadoEm: todayISO(),
  };
}

export function duplicarContrato(contrato) {
  const hoje = todayISO();
  return {
    ...contrato,
    id: crypto.randomUUID(),
    numero: null,
    status: 'rascunho',
    cliente: clienteVazio(),
    obraId: null,
    dataContrato: hoje,
    parcelas: (contrato.parcelas || []).map((p) => ({
      ...p, id: crypto.randomUUID(), vencimento: '', status: 'pendente', dataPagamento: null,
      observacao: '', pagamentos: [],
    })),
    // volta a usar o modelo ATUAL
    contratadaSnapshot: null,
    blocosContratoSnapshot: null,
    blocosMemorialSnapshot: null,
    versaoModelo: null,
    criadoEm: hoje,
    atualizadoEm: hoje,
    geradoEm: null,
  };
}

// ---- parcelas como cronograma financeiro (valores A RECEBER do cliente) ----
// Parcelas de contrato são RECEITA (dinheiro que entra); lançamentos,
// as contas a pagar são CUSTO. Por isso nunca são somadas ao custo da obra.
//
// Uma parcela pode ser recebida em pedaços (o cliente paga metade agora e o
// resto depois). Cada recebimento vira uma entrada em `parcela.pagamentos`
// — { id, data, valor, observacao } — e é dela que sai tudo: quanto já foi
// pago, quanto falta e a situação da parcela. Os campos antigos `status` e
// `dataPagamento` continuam sendo gravados, derivados dos pagamentos, porque
// outras telas e exportações ainda os leem.
//
// Compatibilidade: parcela antiga marcada como 'pago' e sem lista de
// pagamentos vale como um recebimento do valor cheio, na data que estava
// gravada. Nada precisa ser migrado no banco.
const CENTAVO = 0.005;

function arredondar(v) {
  return Math.round((Number(v) || 0) * 100) / 100;
}

export function pagamentosDaParcela(parcela) {
  if (!parcela) return [];
  if (Array.isArray(parcela.pagamentos)) return parcela.pagamentos;
  if (parcela.status === 'pago') {
    return [{
      id: `legado-${parcela.id}`,
      data: parcela.dataPagamento || null,
      valor: Number(parcela.valor) || 0,
      observacao: '',
      legado: true,
    }];
  }
  return [];
}

export function valorPagoParcela(parcela) {
  return arredondar(pagamentosDaParcela(parcela).reduce((a, p) => a + (Number(p.valor) || 0), 0));
}

// O que ainda falta receber. Nunca negativo: se o cliente pagou a mais, o
// excedente aparece em `valorPago`, não como saldo negativo.
export function saldoParcela(parcela) {
  return Math.max(0, arredondar((Number(parcela?.valor) || 0) - valorPagoParcela(parcela)));
}

// Parcela sem valor definido (contrato ainda em rascunho) nunca conta como
// quitada — senão o cronograma inteiro nasceria "recebido".
export function parcelaQuitada(parcela) {
  const valor = Number(parcela?.valor) || 0;
  return valor > 0 && valorPagoParcela(parcela) + CENTAVO >= valor;
}

export function statusParcela(parcela) {
  if (parcelaQuitada(parcela)) return 'pago';
  return valorPagoParcela(parcela) > 0 ? 'parcial' : 'pendente';
}

export const STATUS_PARCELA = {
  pendente: { label: 'A RECEBER', cls: 'bg-stone-100 text-stone-600 border-stone-200' },
  parcial: { label: 'PARCIAL', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  pago: { label: 'RECEBIDA', cls: 'bg-green-50 text-green-700 border-green-200' },
};

export function parcelaVencida(parcela, hojeISO = todayISO()) {
  return saldoParcela(parcela) > 0 && !!parcela?.vencimento && parcela.vencimento < hojeISO;
}

// Devolve SÓ os campos que mudam na parcela — feito para o
// `onAtualizarParcela(contratoId, parcelaId, campos)` do App.
function camposDosPagamentos(parcela, pagamentos) {
  const ordenados = [...pagamentos].sort((a, b) => String(a.data || '').localeCompare(String(b.data || '')));
  const atualizada = { ...parcela, pagamentos: ordenados };
  const status = statusParcela(atualizada);
  const ultimo = ordenados.length ? ordenados[ordenados.length - 1].data || null : null;
  return {
    pagamentos: ordenados,
    status,
    // `dataPagamento` sempre significou "quitada em"; num recebimento
    // parcial a parcela ainda não foi quitada, então continua vazia.
    dataPagamento: status === 'pago' ? ultimo : null,
  };
}

export function registrarPagamento(parcela, { valor, data, observacao } = {}) {
  const novo = {
    id: crypto.randomUUID(),
    data: data || todayISO(),
    valor: arredondar(valor),
    observacao: (observacao || '').trim(),
  };
  return camposDosPagamentos(parcela, [...pagamentosDaParcela(parcela), novo]);
}

export function removerPagamento(parcela, pagamentoId) {
  return camposDosPagamentos(parcela, pagamentosDaParcela(parcela).filter((p) => p.id !== pagamentoId));
}

// Atalho do botão "Recebida": lança de uma vez tudo o que ainda falta.
export function quitarParcela(parcela, data = todayISO()) {
  const falta = saldoParcela(parcela);
  if (falta <= 0) return camposDosPagamentos(parcela, pagamentosDaParcela(parcela));
  return registrarPagamento(parcela, { valor: falta, data });
}

export function limparPagamentos(parcela) {
  return camposDosPagamentos(parcela, []);
}

export function resumoParcelas(parcelas, hojeISO = todayISO()) {
  const lista = parcelas || [];
  const total = arredondar(lista.reduce((a, p) => a + (Number(p.valor) || 0), 0));
  const recebido = arredondar(lista.reduce((a, p) => a + valorPagoParcela(p), 0));
  const aReceber = arredondar(lista.reduce((a, p) => a + saldoParcela(p), 0));
  const vencidas = lista.filter((p) => parcelaVencida(p, hojeISO));
  return {
    total,
    recebido,
    aReceber,
    vencidas: vencidas.length,
    valorVencido: arredondar(vencidas.reduce((a, p) => a + saldoParcela(p), 0)),
    quantidade: lista.length,
    quitadas: lista.filter((p) => statusParcela(p) === 'pago').length,
    parciais: lista.filter((p) => statusParcela(p) === 'parcial').length,
    pctRecebido: total > 0 ? Math.min(100, (recebido / total) * 100) : 0,
  };
}

export function resumoParcelasDaObra(contratos, obraId, hojeISO = todayISO()) {
  const doObra = contratos.filter((c) => c.obraId === obraId && c.status !== 'cancelado');
  const todas = doObra.flatMap((c) => c.parcelas || []);
  return { ...resumoParcelas(todas, hojeISO), contratos: doObra.length };
}
