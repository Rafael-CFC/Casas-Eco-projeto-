// Contas do crediário: saldo de cada montador, extrato e totais.
//
// Tudo é soma sobre os movimentos realmente anotados — nada é estimado.
// Saldo em aberto = tudo que foi retirado menos tudo que já foi
// descontado/pago. Positivo significa "ainda falta descontar".
import { combinaBusca } from '../textUtils';
import { nomeExibicao } from './crediarioStore';

export function movimentosDoMontador(movimentos, montadorId) {
  return movimentos.filter((m) => m.montadorId === montadorId);
}

export function saldoDoMontador(movimentos, montadorId) {
  return resumoDeMovimentos(movimentosDoMontador(movimentos, montadorId)).saldo;
}

export function resumoDeMovimentos(movimentos) {
  let retirado = 0;
  let acertado = 0;
  movimentos.forEach((m) => {
    const valor = Number(m.valor) || 0;
    if (m.tipo === 'acerto') acertado += valor;
    else retirado += valor;
  });
  return {
    retirado: Math.round(retirado * 100) / 100,
    acertado: Math.round(acertado * 100) / 100,
    saldo: Math.round((retirado - acertado) * 100) / 100,
    quantidade: movimentos.length,
  };
}

// Extrato em ordem cronológica (mais recente primeiro), já com o saldo
// acumulado depois de cada movimento — é o que o montador confere.
export function extratoDoMontador(movimentos, montadorId) {
  const doMontador = movimentosDoMontador(movimentos, montadorId)
    .slice()
    .sort((a, b) => (a.data === b.data
      ? String(a.criadoEm || '').localeCompare(String(b.criadoEm || ''))
      : String(a.data).localeCompare(String(b.data))));

  let acumulado = 0;
  const comSaldo = doMontador.map((m) => {
    const valor = Number(m.valor) || 0;
    acumulado = Math.round((acumulado + (m.tipo === 'acerto' ? -valor : valor)) * 100) / 100;
    return { ...m, saldoApos: acumulado };
  });
  return comSaldo.reverse();
}

// Uma linha por montador para a tela inicial do crediário.
export function montadoresComSaldo(montadores, movimentos, { busca = '', apenasComSaldo = false } = {}) {
  const linhas = montadores.map((montador) => {
    const doMontador = movimentosDoMontador(movimentos, montador.id);
    const resumo = resumoDeMovimentos(doMontador);
    const ultima = doMontador.reduce(
      (maisRecente, m) => (!maisRecente || String(m.data) > maisRecente ? m.data : maisRecente),
      null
    );
    return { montador, ...resumo, ultimoMovimento: ultima };
  });

  return linhas
    .filter((l) => combinaBusca(busca, l.montador.nome, l.montador.apelido, l.montador.telefone))
    .filter((l) => (apenasComSaldo ? Math.abs(l.saldo) >= 0.01 : true))
    .sort((a, b) => {
      if (Math.abs(b.saldo - a.saldo) >= 0.01) return b.saldo - a.saldo;
      return nomeExibicao(a.montador).localeCompare(nomeExibicao(b.montador), 'pt-BR');
    });
}

function mesDe(iso) {
  return String(iso || '').slice(0, 7);
}

// Números do topo da tela: quanto está em aberto no total e o movimento
// do mês corrente.
export function totaisCrediario(montadores, movimentos, hojeISO) {
  const mesAtual = mesDe(hojeISO);
  let emAberto = 0;
  let montadoresEmAberto = 0;
  montadores.forEach((m) => {
    const saldo = saldoDoMontador(movimentos, m.id);
    if (saldo >= 0.01) {
      emAberto += saldo;
      montadoresEmAberto += 1;
    }
  });

  const doMes = movimentos.filter((m) => mesDe(m.data) === mesAtual);
  const resumoMes = resumoDeMovimentos(doMes);

  return {
    emAberto: Math.round(emAberto * 100) / 100,
    montadoresEmAberto,
    retiradoNoMes: resumoMes.retirado,
    acertadoNoMes: resumoMes.acertado,
  };
}

// Filtro do extrato: tipo do movimento, período e texto livre (procura no
// nome dos itens e na observação).
export function filtrarMovimentos(movimentos, { tipo = 'todos', de = null, ate = null, busca = '' } = {}) {
  return movimentos.filter((m) => {
    if (tipo !== 'todos' && m.tipo !== tipo) return false;
    if (de && String(m.data) < de) return false;
    if (ate && String(m.data) > ate) return false;
    if (busca.trim()) {
      const textoItens = (m.itens || []).map((i) => i.nome).join(' ');
      if (!combinaBusca(busca, textoItens, m.observacao)) return false;
    }
    return true;
  });
}

// Catálogo oferecido no formulário de retirada: os produtos cadastrados
// no sistema, mais a tabela de madeiras, sem repetir o que já existe no
// cadastro. Nenhum item é inventado — as duas listas já existem no app.
export function catalogoParaRetirada(produtos, catalogoMadeira) {
  const itens = produtos.map((p) => ({
    chave: `produto-${p.id}`,
    nome: p.nome,
    unidade: p.unidade,
    preco: p.preco,
    produtoId: p.id,
    usoCount: 0,
    ultimaData: p.atualizadoEm || null,
  }));

  const jaTem = new Set(produtos.map((p) => String(p.nome || '').trim().toLowerCase()));
  (catalogoMadeira || []).forEach((m) => {
    if (jaTem.has(String(m.nome || '').trim().toLowerCase())) return;
    itens.push({
      chave: `madeira-${m.nome}`,
      nome: m.nome,
      unidade: m.formato,
      preco: m.precoAVista,
      produtoId: null,
      usoCount: 0,
      ultimaData: null,
    });
  });

  return itens;
}
