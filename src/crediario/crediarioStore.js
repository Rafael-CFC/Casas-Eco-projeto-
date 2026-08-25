// Regras do CREDIÁRIO (funções puras: sem React e sem rede).
//
// O crediário NÃO é venda. É a anotação do que cada montador levou da
// loja, para que na hora de pagar a mão de obra dele o valor seja
// descontado. Por isso nada aqui vira lançamento de obra, receita ou
// faturamento: os dados vivem numa lista própria (`crediario`) e não
// entram em nenhum cálculo fiscal ou de custo de obra.
//
// Dois tipos de movimento:
//   'retirada' — o montador levou produto(s). Aumenta o que ele deve.
//   'acerto'   — o valor foi descontado (normalmente da mão de obra) ou
//                pago. Diminui o que ele deve.
import { todayISO } from '../domain';
import { normalizeProductName, normalizeUnit } from '../textUtils';

export const FORMAS_ACERTO = [
  { key: 'desconto_mao_de_obra', label: 'Descontado da mão de obra' },
  { key: 'dinheiro', label: 'Pago em dinheiro' },
  { key: 'pix', label: 'Pago em PIX/transferência' },
  { key: 'outro', label: 'Outro' },
];

export function rotuloFormaAcerto(forma) {
  const achado = FORMAS_ACERTO.find((f) => f.key === forma);
  return achado ? achado.label : FORMAS_ACERTO[0].label;
}

// ---------------- montadores ----------------

export function novoMontador(campos) {
  const agora = todayISO();
  return {
    id: campos.id || crypto.randomUUID(),
    nome: (campos.nome || '').trim(),
    apelido: (campos.apelido || '').trim(),
    telefone: (campos.telefone || '').trim(),
    documento: (campos.documento || '').trim(),
    observacao: (campos.observacao || '').trim(),
    ativo: campos.ativo !== false,
    criadoEm: campos.criadoEm || agora,
    atualizadoEm: agora,
  };
}

export function atualizarMontador(montador, campos) {
  return {
    ...montador,
    ...campos,
    nome: (campos.nome ?? montador.nome).trim(),
    apelido: (campos.apelido ?? montador.apelido ?? '').trim(),
    telefone: (campos.telefone ?? montador.telefone ?? '').trim(),
    documento: (campos.documento ?? montador.documento ?? '').trim(),
    observacao: (campos.observacao ?? montador.observacao ?? '').trim(),
    atualizadoEm: todayISO(),
  };
}

// Nome que aparece nas listas: "MESSIAS" ou "MESSIAS (BIGODE)".
export function nomeExibicao(montador) {
  if (!montador) return 'Montador removido';
  return montador.apelido ? `${montador.nome} (${montador.apelido})` : montador.nome;
}

export function encontrarMontadorPorNome(montadores, nome) {
  const alvo = (nome || '').trim().toLowerCase();
  if (!alvo) return null;
  return montadores.find((m) => m.nome.trim().toLowerCase() === alvo) || null;
}

// ---------------- itens de uma retirada ----------------

export function itemVazio() {
  return {
    id: crypto.randomUUID(),
    nome: '',
    unidade: 'UN',
    produtoId: null,
    quantidadeTexto: '1',
    precoTexto: '',
  };
}

// Total de uma linha da retirada, a partir do que está digitado nela.
export function totalItem(item) {
  const q = Number(item.quantidade);
  const p = Number(item.precoUnitario);
  if (!isFinite(q) || !isFinite(p)) return 0;
  return Math.round(q * p * 100) / 100;
}

export function totalItens(itens) {
  return Math.round(itens.reduce((soma, it) => soma + totalItem(it), 0) * 100) / 100;
}

// ---------------- movimentos ----------------

export function novaRetirada(campos) {
  const agora = todayISO();
  const itens = (campos.itens || []).map((it) => {
    const quantidade = Number(it.quantidade) || 0;
    const precoUnitario = Number(it.precoUnitario) || 0;
    return {
      id: it.id || crypto.randomUUID(),
      nome: normalizeProductName(it.nome),
      unidade: normalizeUnit(it.unidade) || 'UN',
      produtoId: it.produtoId || null,
      quantidade,
      precoUnitario,
      total: Math.round(quantidade * precoUnitario * 100) / 100,
    };
  });
  return {
    id: campos.id || crypto.randomUUID(),
    montadorId: campos.montadorId,
    tipo: 'retirada',
    data: campos.data || agora,
    itens,
    valor: totalItens(itens),
    obraId: campos.obraId || null,
    forma: null,
    observacao: (campos.observacao || '').trim(),
    criadoEm: campos.criadoEm || agora,
    atualizadoEm: agora,
  };
}

export function novoAcerto(campos) {
  const agora = todayISO();
  return {
    id: campos.id || crypto.randomUUID(),
    montadorId: campos.montadorId,
    tipo: 'acerto',
    data: campos.data || agora,
    itens: [],
    valor: Math.round((Number(campos.valor) || 0) * 100) / 100,
    obraId: campos.obraId || null,
    forma: campos.forma || 'desconto_mao_de_obra',
    observacao: (campos.observacao || '').trim(),
    criadoEm: campos.criadoEm || agora,
    atualizadoEm: agora,
  };
}

// Recria o movimento pelo mesmo caminho da criação (mantendo id e criadoEm),
// para que um movimento editado siga exatamente as mesmas regras de um novo.
export function atualizarMovimento(movimento, campos) {
  const base = { ...movimento, ...campos, id: movimento.id, criadoEm: movimento.criadoEm };
  return movimento.tipo === 'acerto' ? novoAcerto(base) : novaRetirada(base);
}

// Descrição curta de um movimento, usada na listagem e no PDF.
export function descreverMovimento(movimento) {
  if (movimento.tipo === 'acerto') {
    return movimento.observacao || rotuloFormaAcerto(movimento.forma);
  }
  const itens = movimento.itens || [];
  if (itens.length === 0) return movimento.observacao || 'Retirada';
  if (itens.length === 1) return itens[0].nome;
  return `${itens[0].nome} + ${itens.length - 1} item(ns)`;
}
