// Inteligência financeira: o que o gasto já diz sobre o que vem.
//
// Tudo aqui é conta feita em cima dos lançamentos que existem. Nenhuma
// função devolve um número "estimado" sem dizer DE ONDE ele saiu, e
// quando os dados não dão para responder ela devolve o motivo em vez de
// um palpite — é a diferença entre uma previsão e um chute com cara de
// relatório.
//
// Funções puras: sem React, sem rede, sem banco.
import { GRUPOS_GASTO } from '../domain';
import { grupoDeGasto } from '../produtos/madeiras';
import { chaveProduto } from '../produtos/catalogoCentral';
import { obraEstaConcluida, obraFoiIniciada, diasDeObra } from '../obra/obraStatus';

const num = (v) => (Number(v) || 0);

// Pagamento de mão de obra não é preço de material: "JOÃO - DIÁRIA subiu
// 300%" só quer dizer que o João trabalhou mais dias naquele mês. Toda
// análise de PREÇO aqui olha só o que é comprado.
const ehCompraDeMaterial = (l) => l && grupoDeGasto(l) !== 'mao_de_obra';
const soma = (lista, f) => lista.reduce((a, x) => a + num(f ? f(x) : x), 0);

function mediana(valores) {
  const l = valores.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (l.length === 0) return null;
  const meio = Math.floor(l.length / 2);
  return l.length % 2 ? l[meio] : (l[meio - 1] + l[meio]) / 2;
}

function diasAtras(hojeISO, dias) {
  const d = new Date(`${hojeISO}T00:00:00`);
  d.setDate(d.getDate() - dias);
  return d.toISOString().slice(0, 10);
}

function somarISO(iso, dias) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + Math.round(dias));
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------
// 1. Previsto × realizado, etapa por etapa
// ---------------------------------------------------------------
//
// A tela da obra já mostra "gasto / orçamento" de cada etapa. O que
// faltava era o que resta e o que já passou, somado — e o gasto que não
// está em etapa nenhuma, que é justamente o que escapa da conta.
export function previstoVersusRealizado(obra, etapas, lancamentos) {
  const daObra = (lancamentos || []).filter((l) => l && l.obraId === obra.id);
  const minhas = (etapas || []).filter((et) => et && et.obraId === obra.id);

  const linhas = minhas.map((et) => {
    const gasto = soma(daObra.filter((l) => l.etapaId === et.id), (l) => l.total);
    const previsto = et.orcamento != null ? num(et.orcamento) : null;
    return {
      id: et.id,
      nome: et.nome,
      previsto,
      realizado: gasto,
      saldo: previsto != null ? previsto - gasto : null,
      pct: previsto > 0 ? (gasto / previsto) * 100 : null,
      estourou: previsto != null && gasto > previsto,
    };
  });

  const semEtapa = soma(daObra.filter((l) => !l.etapaId), (l) => l.total);
  const previstoEtapas = soma(linhas.filter((l) => l.previsto != null), (l) => l.previsto);
  const realizadoEtapas = soma(linhas, (l) => l.realizado);
  const semOrcamento = linhas.filter((l) => l.previsto == null).length;

  return {
    linhas,
    semEtapa,
    previstoEtapas,
    realizadoEtapas,
    realizadoTotal: realizadoEtapas + semEtapa,
    orcamentoObra: obra.orcamento != null ? num(obra.orcamento) : null,
    etapasSemOrcamento: semOrcamento,
    // as etapas cobrem o orçamento da obra? se não, previsto×realizado por
    // etapa não fecha com o total — e a tela precisa dizer isso
    etapasCobremOrcamento: obra.orcamento != null && previstoEtapas > 0
      ? previstoEtapas / num(obra.orcamento)
      : null,
  };
}

// ---------------------------------------------------------------
// 2. Ritmo de gasto
// ---------------------------------------------------------------
//
// Quanto a obra consome por dia, e — se houver orçamento — em que dia
// esse orçamento termina nesse ritmo. O ritmo é medido na janela de dias
// corridos (padrão 30), não na média de toda a obra: obra que parou por
// um mês e voltou tem ritmo de agora, não o de três meses atrás.
export function ritmoDeGasto(obra, lancamentos, hojeISO, janela = 30) {
  const desde = diasAtras(hojeISO, janela);
  const daObra = (lancamentos || []).filter((l) => l && l.obraId === obra.id);
  const naJanela = daObra.filter((l) => String(l.data || '') >= desde && String(l.data || '') <= hojeISO);

  const gastoNaJanela = soma(naJanela, (l) => l.total);
  const gastoTotal = soma(daObra, (l) => l.total);
  const porDia = gastoNaJanela / janela;

  const orcamento = obra.orcamento != null ? num(obra.orcamento) : null;
  const resta = orcamento != null ? orcamento - gastoTotal : null;

  let acabaEm = null;
  let diasAteAcabar = null;
  if (porDia > 0 && resta != null && resta > 0) {
    diasAteAcabar = Math.floor(resta / porDia);
    acabaEm = somarISO(hojeISO, diasAteAcabar);
  }

  return {
    janela,
    gastoNaJanela,
    lancamentosNaJanela: naJanela.length,
    porDia,
    gastoTotal,
    orcamento,
    resta,
    diasAteAcabar,
    acabaEm,
    // sem gasto na janela não existe ritmo — e não vamos inventar um
    temRitmo: porDia > 0,
    jaEstourou: resta != null && resta < 0,
  };
}

// ---------------------------------------------------------------
// 3. Previsão de custo final
// ---------------------------------------------------------------
//
// Duas bases, nesta ordem, e a resposta sempre diz qual foi usada:
//
//   "etapas"  — a obra tem etapas com orçamento cobrindo ao menos 70% do
//               orçamento total. Previsão = para cada etapa, o maior
//               entre o que ela já gastou e o que ela tem de orçamento
//               (etapa que estourou não volta; etapa que não acabou pelo
//               menos chega no orçamento dela), mais o gasto fora de
//               etapa, mais o pedaço do orçamento que as etapas não
//               cobrem.
//   "ritmo"   — sem etapas que sirvam, mas com data de início e gasto
//               recente: projeta o custo até o dia em que o orçamento
//               termina no ritmo atual.
//
// Sem nenhuma das duas, devolve o motivo. Não existe terceira base.
export function previsaoCustoFinal(obra, etapas, lancamentos, hojeISO) {
  const pvr = previstoVersusRealizado(obra, etapas, lancamentos);
  const orcamento = pvr.orcamentoObra;

  if (obraEstaConcluida(obra)) {
    return { base: 'concluida', previsto: pvr.realizadoTotal, realizado: pvr.realizadoTotal, orcamento,
      explicacao: 'A obra está concluída: o custo final é o que ela gastou.' };
  }

  const cobertura = pvr.etapasCobremOrcamento;
  const comOrcamento = pvr.linhas.filter((l) => l.previsto != null);

  if (comOrcamento.length > 0 && (orcamento == null || cobertura >= 0.7)) {
    const porEtapa = soma(comOrcamento, (l) => Math.max(l.realizado, l.previsto));
    const etapasSemOrc = soma(pvr.linhas.filter((l) => l.previsto == null), (l) => l.realizado);
    const faltaCobrir = orcamento != null && pvr.previstoEtapas < orcamento
      ? orcamento - pvr.previstoEtapas
      : 0;
    const previsto = porEtapa + etapasSemOrc + pvr.semEtapa + faltaCobrir;
    return {
      base: 'etapas',
      previsto,
      realizado: pvr.realizadoTotal,
      orcamento,
      sobra: orcamento != null ? orcamento - previsto : null,
      etapasConsideradas: comOrcamento.length,
      faltaCobrir,
      explicacao: 'Somando, de cada etapa, o maior valor entre o que ela já gastou e o orçamento dela'
        + (pvr.semEtapa > 0 ? ', mais o gasto que não está em etapa nenhuma' : '')
        + (faltaCobrir > 0 ? ', mais a parte do orçamento da obra que as etapas não cobrem' : '')
        + '.',
    };
  }

  const ritmo = ritmoDeGasto(obra, lancamentos, hojeISO);
  if (ritmo.temRitmo && orcamento != null && !ritmo.jaEstourou) {
    return {
      base: 'ritmo',
      previsto: orcamento,
      realizado: ritmo.gastoTotal,
      orcamento,
      porDia: ritmo.porDia,
      acabaEm: ritmo.acabaEm,
      diasAteAcabar: ritmo.diasAteAcabar,
      explicacao: 'Esta obra não tem etapas com orçamento, então a conta é pelo ritmo dos últimos '
        + `${ritmo.janela} dias. No ritmo atual o orçamento termina, não o serviço — se faltar obra depois dessa data, o custo final passa do orçamento.`,
    };
  }
  if (ritmo.jaEstourou) {
    return {
      base: 'estourou',
      previsto: ritmo.gastoTotal,
      realizado: ritmo.gastoTotal,
      orcamento,
      explicacao: 'A obra já passou do orçamento. Daqui para frente, qualquer gasto aumenta o custo final.',
    };
  }

  const motivo = comOrcamento.length === 0 && orcamento == null
    ? 'Esta obra não tem orçamento nem etapas com orçamento — sem isso não existe nada para comparar.'
    : comOrcamento.length === 0
      ? 'Esta obra não tem etapas com orçamento, e não houve gasto nos últimos 30 dias para medir o ritmo.'
      : `As etapas com orçamento cobrem só ${Math.round((cobertura || 0) * 100)}% do orçamento da obra — pouco para prever o custo final por elas.`;
  return { base: null, naoDaParaPrever: motivo, realizado: pvr.realizadoTotal, orcamento };
}

// ---------------------------------------------------------------
// 4. Compra fora do padrão
// ---------------------------------------------------------------
//
// Uma compra em que o valor unitário ficou bem acima do que aquele mesmo
// produto costuma custar. A comparação é com a MEDIANA das compras
// anteriores do produto (mediana, não média: uma compra absurda antiga
// não puxa a referência) e exige um histórico mínimo — com duas compras
// na vida, "fora do padrão" não quer dizer nada.
//
// A ordem é por dinheiro: diferença × quantidade. É isso que dói.
export function comprasForaDoPadrao(lancamentos, { hojeISO, janela = 60, minimoHistorico = 3, acimaDe = 0.25 } = {}) {
  const lista = (lancamentos || []).filter((l) => ehCompraDeMaterial(l) && num(l.quantidade) > 0 && num(l.preco) > 0);
  const desde = hojeISO ? diasAtras(hojeISO, janela) : null;

  const porProduto = new Map();
  lista.forEach((l) => {
    const k = chaveProduto(l.descricao);
    if (!k) return;
    if (!porProduto.has(k)) porProduto.set(k, []);
    porProduto.get(k).push(l);
  });

  const achados = [];
  porProduto.forEach((compras) => {
    if (compras.length <= minimoHistorico) return;
    const ordenadas = [...compras].sort((a, b) => String(a.data || '').localeCompare(String(b.data || '')));
    ordenadas.forEach((l, i) => {
      if (i < minimoHistorico) return; // precisa de histórico ANTES dela
      if (desde && String(l.data || '') < desde) return;
      const anteriores = ordenadas.slice(0, i).map((x) => num(x.preco));
      const referencia = mediana(anteriores);
      if (!referencia || referencia <= 0) return;
      const preco = num(l.preco);
      const excesso = (preco - referencia) / referencia;
      if (excesso < acimaDe) return;
      achados.push({
        id: l.id,
        descricao: l.descricao,
        data: l.data,
        obraId: l.obraId,
        fornecedorNome: l.fornecedorNome || '',
        preco,
        referencia,
        pct: excesso * 100,
        quantidade: num(l.quantidade),
        diferenca: (preco - referencia) * num(l.quantidade),
        comprasNaReferencia: anteriores.length,
      });
    });
  });

  return achados.sort((a, b) => b.diferenca - a.diferenca);
}

// ---------------------------------------------------------------
// 5. Material que subiu de preço
// ---------------------------------------------------------------
//
// Diferente do item acima: aqui não é uma compra fora da curva, é o
// PREÇO DO MATERIAL que mudou de patamar. Compara a média das duas
// últimas compras com a mediana das anteriores.
export function altasDePreco(lancamentos, { minimoHistorico = 3, subiuAcimaDe = 0.1 } = {}) {
  const lista = (lancamentos || []).filter((l) => ehCompraDeMaterial(l) && num(l.quantidade) > 0 && num(l.preco) > 0);
  const porProduto = new Map();
  lista.forEach((l) => {
    const k = chaveProduto(l.descricao);
    if (!k) return;
    if (!porProduto.has(k)) porProduto.set(k, []);
    porProduto.get(k).push(l);
  });

  const altas = [];
  porProduto.forEach((compras) => {
    if (compras.length < minimoHistorico) return;
    const ordenadas = [...compras].sort((a, b) => String(a.data || '').localeCompare(String(b.data || '')));
    const recentes = ordenadas.slice(-2);
    const antigas = ordenadas.slice(0, -2);
    if (antigas.length === 0) return;
    const agora = soma(recentes, (l) => l.preco) / recentes.length;
    const antes = mediana(antigas.map((l) => num(l.preco)));
    if (!antes || antes <= 0) return;
    const pct = ((agora - antes) / antes) * 100;
    if (pct < subiuAcimaDe * 100) return;
    const ultima = ordenadas[ordenadas.length - 1];
    altas.push({
      descricao: ultima.descricao,
      de: antes,
      para: agora,
      pct,
      unidade: ultima.unidade || '',
      ultimaCompra: ultima.data,
      fornecedorNome: ultima.fornecedorNome || '',
      compras: ordenadas.length,
    });
  });

  return altas.sort((a, b) => b.pct - a.pct);
}

// ---------------------------------------------------------------
// 6. Comparar com obras semelhantes
// ---------------------------------------------------------------
//
// "Semelhante" aqui é obra de porte parecido: orçamento dentro de ±35%.
// Sem orçamento nos dois lados não há semelhança que se possa afirmar, e
// a função diz isso em vez de comparar casa com barracão.
export function obrasSemelhantes(obra, obras, { margem = 0.35 } = {}) {
  const meu = obra.orcamento != null ? num(obra.orcamento) : null;
  if (!meu || meu <= 0) return [];
  return (obras || []).filter((o) => {
    if (!o || o.id === obra.id) return false;
    const dele = o.orcamento != null ? num(o.orcamento) : null;
    if (!dele || dele <= 0) return false;
    return Math.abs(dele - meu) / meu <= margem;
  });
}

// A fatia de cada categoria no gasto da obra, mais o gasto por dia.
function perfilDaObra(obra, lancamentos, hojeISO) {
  const daObra = (lancamentos || []).filter((l) => l && l.obraId === obra.id);
  const total = soma(daObra, (l) => l.total);
  const porCategoria = {};
  Object.keys(GRUPOS_GASTO).forEach((k) => { porCategoria[k] = 0; });
  daObra.forEach((l) => {
    const k = grupoDeGasto(l);
    porCategoria[k] = (porCategoria[k] || 0) + num(l.total);
  });
  const fatias = {};
  Object.entries(porCategoria).forEach(([k, v]) => { fatias[k] = total > 0 ? (v / total) * 100 : 0; });

  const dias = obraFoiIniciada(obra) ? Math.max(1, diasDeObra(obra, hojeISO)) : null;
  return {
    obraId: obra.id,
    nome: obra.nome,
    total,
    orcamento: obra.orcamento != null ? num(obra.orcamento) : null,
    pctOrcamento: obra.orcamento ? (total / num(obra.orcamento)) * 100 : null,
    dias,
    porDia: dias ? total / dias : null,
    porCategoria,
    fatias,
    concluida: obraEstaConcluida(obra),
  };
}

export function compararComSemelhantes(obra, obras, lancamentos, hojeISO, { diferencaRelevante = 10 } = {}) {
  const semelhantes = obrasSemelhantes(obra, obras);
  if (semelhantes.length === 0) {
    const motivo = obra.orcamento == null || num(obra.orcamento) <= 0
      ? 'Esta obra não tem orçamento definido — sem isso não dá para dizer que outra obra é de porte parecido.'
      : 'Nenhuma outra obra tem orçamento parecido com o desta (até 35% de diferença). Comparar com obra de outro porte não diz nada.';
    return { naoDaParaComparar: motivo, semelhantes: [] };
  }

  const meu = perfilDaObra(obra, lancamentos, hojeISO);
  const deles = semelhantes.map((o) => perfilDaObra(o, lancamentos, hojeISO));

  const medianaDe = (f) => mediana(deles.map(f).filter((v) => v != null));
  const grupo = {
    total: medianaDe((p) => p.total),
    porDia: medianaDe((p) => p.porDia),
    pctOrcamento: medianaDe((p) => p.pctOrcamento),
    fatias: Object.fromEntries(Object.keys(GRUPOS_GASTO).map((k) => [k, medianaDe((p) => p.fatias[k]) || 0])),
  };

  const diferencas = Object.keys(GRUPOS_GASTO)
    .map((k) => ({
      categoria: k,
      label: GRUPOS_GASTO[k].label,
      minha: meu.fatias[k] || 0,
      doGrupo: grupo.fatias[k] || 0,
      diferenca: (meu.fatias[k] || 0) - (grupo.fatias[k] || 0),
    }))
    .filter((d) => Math.abs(d.diferenca) >= diferencaRelevante)
    .sort((a, b) => Math.abs(b.diferenca) - Math.abs(a.diferenca));

  return { minha: meu, grupo, semelhantes: deles, diferencas };
}

// ---------------------------------------------------------------
// 7. Relatório do mês
// ---------------------------------------------------------------
//
// O mês fechado num lugar só: total, comparação com o mês anterior, onde
// o dinheiro foi, o que subiu de preço, a compra mais fora do padrão e as
// contas. Tudo do banco — nada digitado à parte.
function mesAnterior(mes) {
  const [a, m] = mes.split('-').map(Number);
  const d = new Date(a, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function mesesComLancamento(lancamentos) {
  const meses = new Set();
  (lancamentos || []).forEach((l) => {
    const m = String(l?.data || '').slice(0, 7);
    if (/^\d{4}-\d{2}$/.test(m)) meses.add(m);
  });
  return [...meses].sort().reverse();
}

export function relatorioMensal({ lancamentos = [], obras = [], contas = [] } = {}, mes) {
  const anterior = mesAnterior(mes);
  const doMes = lancamentos.filter((l) => String(l?.data || '').slice(0, 7) === mes);
  const doAnterior = lancamentos.filter((l) => String(l?.data || '').slice(0, 7) === anterior);

  const total = soma(doMes, (l) => l.total);
  const totalAnterior = soma(doAnterior, (l) => l.total);

  const nomeObra = (id) => obras.find((o) => o.id === id)?.nome || 'Obra removida';
  const agrupar = (lista, chave, nome) => {
    const m = new Map();
    lista.forEach((l) => {
      const k = chave(l);
      if (k == null || k === '') return;
      if (!m.has(k)) m.set(k, { chave: k, nome: nome(l, k), valor: 0, quantos: 0 });
      const linha = m.get(k);
      linha.valor += num(l.total);
      linha.quantos += 1;
    });
    return [...m.values()].sort((a, b) => b.valor - a.valor);
  };

  const porObra = agrupar(doMes, (l) => l.obraId, (l) => nomeObra(l.obraId));
  const porCategoria = agrupar(doMes, (l) => grupoDeGasto(l), (l, k) => GRUPOS_GASTO[k]?.label || k);
  const porFornecedor = agrupar(doMes, (l) => String(l.fornecedorNome || '').trim().toUpperCase(), (l) => String(l.fornecedorNome || '').trim());

  // último dia do mês, para o recorte das contas
  const [ano, mm] = mes.split('-').map(Number);
  const ultimoDia = `${mes}-${String(new Date(ano, mm, 0).getDate()).padStart(2, '0')}`;
  const contasDoMes = (contas || []).filter((c) => String(c?.vencimento || '').slice(0, 7) === mes);
  const pagas = contasDoMes.filter((c) => c.status === 'pago');
  const abertas = contasDoMes.filter((c) => c.status !== 'pago');

  // o que subiu de preço e a compra mais fora do padrão, olhando só até o
  // fim do mês do relatório (relatório de março não usa preço de abril)
  const ateOMes = lancamentos.filter((l) => String(l?.data || '') <= ultimoDia);
  const altas = altasDePreco(ateOMes).filter((a) => String(a.ultimaCompra || '').slice(0, 7) === mes);
  const fora = comprasForaDoPadrao(ateOMes, { hojeISO: ultimoDia, janela: 31 });

  return {
    mes,
    anterior,
    total,
    totalAnterior,
    variacaoPct: totalAnterior > 0 ? ((total - totalAnterior) / totalAnterior) * 100 : null,
    lancamentos: doMes.length,
    diasComGasto: new Set(doMes.map((l) => l.data)).size,
    porObra,
    porCategoria,
    porFornecedor: porFornecedor.slice(0, 5),
    altasDePreco: altas.slice(0, 5),
    comprasForaDoPadrao: fora.slice(0, 5),
    contas: {
      total: soma(contasDoMes, (c) => c.valor),
      pagas: { quantidade: pagas.length, valor: soma(pagas, (c) => c.valor) },
      abertas: { quantidade: abertas.length, valor: soma(abertas, (c) => c.valor) },
    },
    vazio: doMes.length === 0 && contasDoMes.length === 0,
  };
}

// O mesmo relatório em texto, para mandar no WhatsApp ou guardar.
export function textoDoRelatorio(r, { formatarMoeda, nomeDoMes }) {
  const m = formatarMoeda;
  const linhas = [];
  linhas.push(`CASAS ECO — ${nomeDoMes(r.mes)}`);
  linhas.push('');
  linhas.push(`Gasto no mês: ${m(r.total)} em ${r.lancamentos} lançamento(s)`);
  if (r.variacaoPct != null) {
    const sobe = r.variacaoPct >= 0;
    linhas.push(`Mês anterior: ${m(r.totalAnterior)} (${sobe ? '+' : ''}${r.variacaoPct.toFixed(0)}%)`);
  }
  if (r.porObra.length > 0) {
    linhas.push('');
    linhas.push('Por obra:');
    r.porObra.forEach((o) => linhas.push(`- ${o.nome}: ${m(o.valor)}`));
  }
  if (r.porCategoria.length > 0) {
    linhas.push('');
    linhas.push('Por categoria:');
    r.porCategoria.forEach((c) => linhas.push(`- ${c.nome}: ${m(c.valor)}`));
  }
  if (r.porFornecedor.length > 0) {
    linhas.push('');
    linhas.push('Quem mais recebeu:');
    r.porFornecedor.forEach((f) => linhas.push(`- ${f.nome}: ${m(f.valor)}`));
  }
  if (r.altasDePreco.length > 0) {
    linhas.push('');
    linhas.push('Subiu de preço:');
    r.altasDePreco.forEach((a) => linhas.push(`- ${a.descricao}: ${m(a.de)} -> ${m(a.para)} (+${a.pct.toFixed(0)}%)`));
  }
  if (r.comprasForaDoPadrao.length > 0) {
    linhas.push('');
    linhas.push('Compras fora do padrão:');
    r.comprasForaDoPadrao.forEach((c) => linhas.push(`- ${c.descricao}: pagou ${m(c.preco)}, costuma ser ${m(c.referencia)} (+${c.pct.toFixed(0)}%)`));
  }
  linhas.push('');
  linhas.push(`Contas do mês: ${m(r.contas.total)} — ${r.contas.pagas.quantidade} paga(s) (${m(r.contas.pagas.valor)}), ${r.contas.abertas.quantidade} em aberto (${m(r.contas.abertas.valor)})`);
  return linhas.join('\n');
}

// ---------------------------------------------------------------
// 8. Os alertas que entram na tela do Financeiro
// ---------------------------------------------------------------
//
// Os alertas que já existiam olham orçamento e concentração de categoria.
// Estes olham o que é novo: previsão de estouro, ritmo, preço de material
// e compra fora do padrão. Cada um traz o número que o sustenta.
export function alertasDePrevisao({ obras = [], etapas = [], lancamentos = [], hojeISO }, { formatarMoeda, formatarData }) {
  const alertas = [];
  const m = formatarMoeda;

  obras.filter((o) => o && !obraEstaConcluida(o)).forEach((obra) => {
    const p = previsaoCustoFinal(obra, etapas, lancamentos, hojeISO);
    const nome = String(obra.nome || '').toUpperCase();

    if (p.base === 'etapas' && p.sobra != null && p.sobra < 0) {
      alertas.push({
        tipo: 'critical',
        texto: `${nome}: pelas etapas, o custo final deve chegar a ${m(p.previsto)} — ${m(-p.sobra)} acima do orçamento.`,
      });
    } else if (p.base === 'estourou') {
      alertas.push({ tipo: 'critical', texto: `${nome} já passou do orçamento: gastou ${m(p.realizado)} de ${m(p.orcamento)}.` });
    } else if (p.base === 'ritmo' && p.acabaEm && p.diasAteAcabar <= 180) {
      // Só vale alertar sobre prazo que dá para enxergar. "O orçamento
      // acaba em 2032" não é aviso, é ruído entre os que importam.
      alertas.push({
        tipo: p.diasAteAcabar <= 30 ? 'warning' : 'good',
        texto: `${nome}: no ritmo de ${m(p.porDia)} por dia, o orçamento termina em ${formatarData(p.acabaEm)}`
          + ` (${p.diasAteAcabar} dia(s)).`,
      });
    }
  });

  altasDePreco(lancamentos).slice(0, 3).forEach((a) => {
    alertas.push({
      tipo: a.pct >= 25 ? 'warning' : 'good',
      texto: `${a.descricao} subiu ${a.pct.toFixed(0)}%: de ${m(a.de)} para ${m(a.para)} (última compra em ${formatarData(a.ultimaCompra)}).`,
    });
  });

  comprasForaDoPadrao(lancamentos, { hojeISO }).slice(0, 3).forEach((c) => {
    alertas.push({
      tipo: 'warning',
      texto: `${c.descricao} em ${formatarData(c.data)}: ${m(c.preco)} contra os ${m(c.referencia)} de costume`
        + `${c.fornecedorNome ? ` (${c.fornecedorNome})` : ''} — ${m(c.diferenca)} a mais nessa compra.`,
    });
  });

  const ordem = { critical: 0, warning: 1, good: 2 };
  return alertas.sort((a, b) => ordem[a.tipo] - ordem[b.tipo]);
}
