// Regras do módulo de Contratos (funções puras, sem React e sem rede).
//
// Decisão importante de arquitetura: quando um contrato é GERADO, os dados
// da contratada, o texto das cláusulas e o memorial são "congelados" dentro
// do próprio registro do contrato (snapshots). Assim, se o modelo for
// alterado depois em Configurações, contratos antigos continuam exatamente
// como foram gerados — o documento vira histórico, não muda sozinho.
import { todayISO, formatMoney, formatDateBR } from '../domain';
import { valorPorExtenso } from './numeroPorExtenso';
import { aplicarMarcadores, memorialPadraoDoModelo, CATEGORIAS_MEMORIAL } from '../config/configStore';

export const STATUS_CONTRATO = {
  rascunho: { label: 'RASCUNHO', cls: 'bg-stone-100 text-stone-600 border-stone-200' },
  gerado: { label: 'GERADO', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  assinado: { label: 'ASSINADO', cls: 'bg-green-50 text-green-700 border-green-200' },
  cancelado: { label: 'CANCELADO', cls: 'bg-red-50 text-red-600 border-red-200' },
};

export function clienteVazio() {
  return { nome: '', cpfCnpj: '', endereco: '', cidade: '', estado: '', telefone: '', email: '' };
}

export function dadosObraVazios() {
  return {
    nome: '', endereco: '', cidade: '', estado: '',
    area: '', varanda: '', deck: '', pavimentos: '',
    dataInicio: '', prazo: '', observacoes: '',
  };
}

export function novoContratoRascunho(config, modeloObra = 'mista') {
  return {
    id: crypto.randomUUID(),
    numero: null, // só recebe número quando é gerado
    status: 'rascunho',
    modeloObra,
    cliente: clienteVazio(),
    obraId: null,
    obra: dadosObraVazios(),
    valorTotal: 0,
    parcelas: [],
    memorial: memorialPadraoDoModelo(config, modeloObra),
    contratadaSnapshot: null,
    clausulasSnapshot: null,
    versaoModelo: null,
    cidadeContrato: config?.cidadeContrato || '',
    criadoEm: todayISO(),
    atualizadoEm: todayISO(),
    geradoEm: null,
  };
}

// Numeração sequencial por ano: 2026/001, 2026/002...
export function proximoNumeroContrato(contratos, hojeISO = todayISO()) {
  const ano = hojeISO.slice(0, 4);
  const doAno = contratos.filter((c) => c.numero && c.numero.startsWith(`${ano}/`));
  const maior = doAno.reduce((max, c) => {
    const n = parseInt(String(c.numero).split('/')[1], 10);
    return isNaN(n) ? max : Math.max(max, n);
  }, 0);
  return `${ano}/${String(maior + 1).padStart(3, '0')}`;
}

export function novaParcela(ordem, etapa = '', valor = 0) {
  return {
    id: crypto.randomUUID(),
    ordem,
    etapa,
    valor: Number(valor) || 0,
    vencimento: '',
    status: 'pendente', // 'pendente' | 'pago'
    dataPagamento: null,
    observacao: '',
  };
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

// Diferença entre o valor do contrato e a soma das parcelas.
// Positivo = falta distribuir; negativo = parcelas passaram do valor.
export function diferencaParcelas(valorTotal, parcelas) {
  const diff = (Number(valorTotal) || 0) - totalParcelas(parcelas);
  return Math.abs(diff) < 0.005 ? 0 : Math.round(diff * 100) / 100;
}

// Distribui o valor total igualmente entre as parcelas existentes, jogando
// a sobra dos centavos na última — evita o clássico "faltou R$ 0,01".
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

// Lista de problemas que impedem (ou merecem atenção antes de) gerar o
// documento. Nada é gerado silenciosamente com dado divergente.
export function validarContrato(contrato, config) {
  const problemas = [];
  const bloqueios = [];

  if (!contrato.cliente.nome.trim()) bloqueios.push('Informe o nome do cliente.');
  if (!contrato.obra.nome.trim()) bloqueios.push('Informe o nome da obra.');
  if (!(Number(contrato.valorTotal) > 0)) bloqueios.push('Informe o valor total do contrato.');

  if (!config?.contratada?.razaoSocial?.trim()) {
    bloqueios.push('Preencha os dados da CONTRATADA em Configurações antes de gerar contratos.');
  }

  const semTextoClausulas = !(config?.modeloContrato?.clausulas || []).some((c) => c.texto.trim());
  if (semTextoClausulas) {
    problemas.push('O modelo de contrato está sem texto nas cláusulas. Cole o texto do contrato da Casas Eco em Configurações → Modelo de contrato (você faz isso uma única vez).');
  }

  if (contrato.parcelas.length === 0) {
    problemas.push('Nenhuma parcela cadastrada — o contrato sairá sem tabela de pagamento.');
  } else {
    const diff = diferencaParcelas(contrato.valorTotal, contrato.parcelas);
    if (diff !== 0) {
      problemas.push(
        diff > 0
          ? `A soma das parcelas está ${formatMoney(diff)} ABAIXO do valor do contrato.`
          : `A soma das parcelas está ${formatMoney(Math.abs(diff))} ACIMA do valor do contrato.`
      );
    }
  }

  const memorialVazio = !(contrato.memorial || []).some((m) => m.texto.trim());
  if (memorialVazio) {
    problemas.push('O memorial descritivo está vazio. Preencha em Configurações → Memorial padrão para já vir pronto nos próximos contratos.');
  }

  return { problemas, bloqueios, podeGerar: bloqueios.length === 0 };
}

// Monta o dicionário de marcadores {{...}} com os dados reais do contrato.
export function montarValoresMarcadores(contrato, config) {
  const contratada = contrato.contratadaSnapshot || config?.contratada || {};
  const tabela = (contrato.parcelas || [])
    .map((p) => `${p.ordem}. ${p.etapa || 'Parcela'} — ${formatMoney(p.valor)}${p.vencimento ? ` (venc. ${formatDateBR(p.vencimento)})` : ''}`)
    .join('\n');

  return {
    '{{CONTRATADA_RAZAO_SOCIAL}}': contratada.razaoSocial,
    '{{CONTRATADA_CNPJ}}': contratada.cnpj,
    '{{CONTRATADA_ENDERECO}}': contratada.endereco,
    '{{CONTRATADA_REPRESENTANTE}}': contratada.representante,
    '{{CONTRATADA_CPF}}': contratada.cpfRepresentante,
    '{{CONTRATADA_TELEFONE}}': contratada.telefone,
    '{{CONTRATADA_EMAIL}}': contratada.email,
    '{{CONTRATADA_DADOS_BANCARIOS}}': contratada.dadosBancarios,
    '{{CLIENTE_NOME}}': contrato.cliente.nome,
    '{{CLIENTE_CPF_CNPJ}}': contrato.cliente.cpfCnpj,
    '{{CLIENTE_ENDERECO}}': contrato.cliente.endereco,
    '{{CLIENTE_CIDADE}}': contrato.cliente.cidade,
    '{{CLIENTE_ESTADO}}': contrato.cliente.estado,
    '{{CLIENTE_TELEFONE}}': contrato.cliente.telefone,
    '{{OBRA_NOME}}': contrato.obra.nome,
    '{{OBRA_ENDERECO}}': contrato.obra.endereco,
    '{{OBRA_CIDADE}}': contrato.obra.cidade,
    '{{OBRA_ESTADO}}': contrato.obra.estado,
    '{{OBRA_AREA}}': contrato.obra.area,
    '{{OBRA_VARANDA}}': contrato.obra.varanda,
    '{{OBRA_DECK}}': contrato.obra.deck,
    '{{OBRA_PAVIMENTOS}}': contrato.obra.pavimentos,
    '{{OBRA_DATA_INICIO}}': contrato.obra.dataInicio ? formatDateBR(contrato.obra.dataInicio) : '',
    '{{OBRA_PRAZO}}': contrato.obra.prazo,
    '{{VALOR_TOTAL}}': formatMoney(contrato.valorTotal),
    '{{VALOR_TOTAL_EXTENSO}}': valorPorExtenso(contrato.valorTotal),
    '{{NUMERO_PARCELAS}}': String((contrato.parcelas || []).length),
    '{{TABELA_PARCELAS}}': tabela,
    '{{DATA_HOJE}}': formatDateBR(todayISO()),
    '{{CIDADE_CONTRATO}}': contrato.cidadeContrato || contratada.cidade,
  };
}

// Devolve as cláusulas com os marcadores já substituídos, prontas para o PDF.
export function clausulasResolvidas(contrato, config) {
  const clausulas = contrato.clausulasSnapshot || config?.modeloContrato?.clausulas || [];
  const valores = montarValoresMarcadores(contrato, config);
  return clausulas
    .filter((c) => c.texto && c.texto.trim())
    .map((c) => ({ ...c, texto: aplicarMarcadores(c.texto, valores) }));
}

export function memorialResolvido(contrato, config) {
  const valores = montarValoresMarcadores(contrato, config);
  return (contrato.memorial || CATEGORIAS_MEMORIAL.map((c) => ({ ...c, texto: '' })))
    .filter((m) => m.texto && m.texto.trim())
    .map((m) => ({ ...m, texto: aplicarMarcadores(m.texto, valores) }));
}

// Congela o contrato no momento da geração (ver comentário no topo).
export function congelarContrato(contrato, config, contratos) {
  return {
    ...contrato,
    numero: contrato.numero || proximoNumeroContrato(contratos),
    status: contrato.status === 'rascunho' ? 'gerado' : contrato.status,
    contratadaSnapshot: contrato.contratadaSnapshot || { ...config.contratada },
    clausulasSnapshot: contrato.clausulasSnapshot || (config.modeloContrato?.clausulas || []).map((c) => ({ ...c })),
    versaoModelo: contrato.versaoModelo || config.modeloContrato?.versao || 1,
    cidadeContrato: contrato.cidadeContrato || config.cidadeContrato || config.contratada?.cidade || '',
    geradoEm: contrato.geradoEm || todayISO(),
    atualizadoEm: todayISO(),
  };
}

// Duplicar: mantém a estrutura (parcelas, memorial, modelo) e limpa o que é
// específico do cliente anterior, para virar a base de um contrato novo.
export function duplicarContrato(contrato) {
  return {
    ...contrato,
    id: crypto.randomUUID(),
    numero: null,
    status: 'rascunho',
    cliente: clienteVazio(),
    obraId: null,
    obra: { ...contrato.obra, nome: '', endereco: '' },
    parcelas: (contrato.parcelas || []).map((p) => ({
      ...p,
      id: crypto.randomUUID(),
      vencimento: '',
      status: 'pendente',
      dataPagamento: null,
      observacao: '',
    })),
    // snapshots são zerados de propósito: o contrato novo usa o modelo ATUAL
    contratadaSnapshot: null,
    clausulasSnapshot: null,
    versaoModelo: null,
    criadoEm: todayISO(),
    atualizadoEm: todayISO(),
    geradoEm: null,
  };
}

// ---- parcelas como cronograma financeiro (valores A RECEBER do cliente) ----
// Atenção: parcelas de contrato são RECEITA (dinheiro que entra), enquanto
// lançamentos/contas/boletos são CUSTO (dinheiro que sai). Por isso elas
// nunca são somadas ao custo da obra — aparecem sempre em bloco próprio.
export function resumoParcelas(parcelas, hojeISO = todayISO()) {
  const lista = parcelas || [];
  const recebido = lista.filter((p) => p.status === 'pago').reduce((a, p) => a + (Number(p.valor) || 0), 0);
  const aReceber = lista.filter((p) => p.status !== 'pago').reduce((a, p) => a + (Number(p.valor) || 0), 0);
  const vencidas = lista.filter((p) => p.status !== 'pago' && p.vencimento && p.vencimento < hojeISO);
  return {
    total: recebido + aReceber,
    recebido,
    aReceber,
    vencidas: vencidas.length,
    valorVencido: vencidas.reduce((a, p) => a + (Number(p.valor) || 0), 0),
    quantidade: lista.length,
  };
}

export function resumoParcelasDaObra(contratos, obraId, hojeISO = todayISO()) {
  const doObra = contratos.filter((c) => c.obraId === obraId && c.status !== 'cancelado');
  const todas = doObra.flatMap((c) => c.parcelas || []);
  return { ...resumoParcelas(todas, hojeISO), contratos: doObra.length };
}
