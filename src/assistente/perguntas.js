// O Assistente Casas Eco: perguntar em português e receber o número.
//
// COMO ELE RESPONDE, E POR QUE ASSIM
//
// Toda resposta sai de uma CONTA feita em cima dos lançamentos, das obras
// e das contas que estão no banco. Não existe texto inventado: ou a conta
// fecha e ele mostra o número, ou ele diz que não tem esse dado. É o
// pedido mais importante do dono — um assistente que chuta valor de obra
// é pior do que não ter assistente.
//
// Por isso entender a pergunta é separado de calcular a resposta:
//
//   interpretar(texto)  → { intencao, obra, periodo, termo }   (entende)
//   responder(intencao) → { titulo, valor, linhas, ... }       (calcula)
//
// Quem entende hoje é uma lista de palavras. No dia em que houver chave
// de IA configurada, é só a PRIMEIRA metade ser trocada por um modelo: a
// conta continua sendo feita aqui, com os dados reais. O modelo nunca
// inventa o número porque nunca é ele que calcula.
//
// Funções puras: sem React, sem rede, sem banco.
import { formatMoney, formatDateBR, todayISO, GRUPOS_GASTO } from '../domain';
import { semAcento } from '../textUtils';
import { grupoDeGasto } from '../produtos/madeiras';
import { obraEstaConcluida } from '../obra/obraStatus';
import { historicoDePrecos, chaveProduto } from '../produtos/catalogoCentral';

const k = (t) => semAcento(t).replace(/\s+/g, ' ').trim();

// ---- entender a pergunta ----

const INTENCOES = [
  { id: 'acima_previsto', palavras: ['acima do previsto', 'estourou o orcamento', 'ultrapassou o orcamento', 'passou do orcamento', 'acima do orcamento'] },
  { id: 'risco_orcamento', palavras: ['risco de ultrapassar', 'maior risco', 'vai estourar', 'risco do orcamento', 'risco de estourar', 'perto do orcamento'] },
  { id: 'comparar_obras', palavras: ['compare as obras', 'comparar obras', 'obras finalizadas', 'obras concluidas', 'comparativo das obras', 'gastamos em cada obra', 'quanto cada obra'] },
  { id: 'categoria_top', palavras: ['qual categoria', 'categoria que mais', 'onde esta indo o dinheiro', 'maior gasto por categoria', 'categoria consumindo', 'categoria esta consumindo'] },
  { id: 'materiais_top', palavras: ['materiais mais comprados', 'material mais comprado', 'o que mais compramos', 'mais comprados'] },
  { id: 'aumentos', palavras: ['aumentaram', 'subiu de preco', 'aumento de preco', 'ficou mais caro', 'despesas que aumentaram', 'subiram de preco'] },
  { id: 'mao_de_obra', palavras: ['mao de obra', 'gastamos com pedreiro', 'pagamos de mao de obra'] },
  { id: 'preco_medio', palavras: ['preco medio', 'media de preco', 'quanto esta custando o', 'preco do', 'preco da'] },
  { id: 'contas_pagar', palavras: ['a pagar', 'quanto devo', 'boletos', 'vencendo', 'contas em aberto', 'contas do mes'] },
  { id: 'gasto_obra', palavras: ['quanto gastamos na obra', 'quanto gastei na obra', 'quanto ja gastamos na obra', 'gasto da obra', 'total da obra', 'quanto custou a obra', 'quanto foi gasto na obra'] },
  { id: 'gasto_periodo', palavras: ['quanto gastamos', 'quanto gastei', 'gasto no mes', 'gasto neste mes', 'total gasto', 'quanto saiu'] },
];

const MESES = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

// O período que a pergunta pede. Sem período dito, é tudo.
function acharPeriodo(texto, hojeISO) {
  const t = k(texto);
  const hoje = new Date(`${hojeISO}T00:00:00`);
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  if (t.includes('este mes') || t.includes('neste mes') || t.includes('mes atual') || t.includes('do mes')) {
    return { de: `${hojeISO.slice(0, 7)}-01`, ate: hojeISO, rotulo: 'neste mês' };
  }
  if (t.includes('mes passado')) {
    return { de: iso(new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)), ate: iso(new Date(hoje.getFullYear(), hoje.getMonth(), 0)), rotulo: 'no mês passado' };
  }
  if (t.includes('este ano') || t.includes('neste ano') || t.includes('no ano')) {
    return { de: `${hojeISO.slice(0, 4)}-01-01`, ate: hojeISO, rotulo: 'neste ano' };
  }
  const mes = MESES.findIndex((m) => t.includes(m));
  if (mes >= 0) {
    return { de: iso(new Date(hoje.getFullYear(), mes, 1)), ate: iso(new Date(hoje.getFullYear(), mes + 1, 0)), rotulo: `em ${MESES[mes]}` };
  }
  return { de: '', ate: '', rotulo: '' };
}

// Qual obra a pergunta cita (pelo nome, mesmo escrito pela metade).
function acharObra(texto, obras) {
  const t = k(texto);
  const achadas = (obras || []).filter((o) => o && o.nome && t.includes(k(o.nome)));
  if (achadas.length > 0) return achadas.sort((a, b) => b.nome.length - a.nome.length)[0];
  const m = t.match(/obra (?:d[oa]s?\s+)?([a-z0-9\s]{3,})/);
  if (!m) return null;
  const alvo = m[1].trim();
  return (obras || []).find((o) => k(o.nome).includes(alvo) || alvo.includes(k(o.nome))) || null;
}

// Palavras que, depois do nome do produto, são enfeite da pergunta e
// não fazem parte do nome: "preço médio do cimento NAS ÚLTIMAS COMPRAS".
// Sem cortar aqui, o sistema procurava um produto chamado "cimento nas
// ultimas compras" e respondia que não achou.
const FIM_DO_NOME = [
  ' nas ', ' nos ', ' na ', ' no ', ' neste ', ' nesta ', ' ultim', ' hoje', ' agora',
  ' este mes', ' esse mes', ' mes passado', ' em ', ' que ', ' comprad', ' compra',
];

// O produto citado ("preço médio do cimento" → cimento).
function acharTermo(texto) {
  const t = k(texto);
  const m = t.match(/(?:preco medio d[oae]s?|preco d[oae]s?|quanto esta custando [oa]|media d[oae]s?)\s+([a-z0-9\s,.-]{3,})/);
  if (!m) return '';
  let termo = ` ${m[1].replace(/\?+$/, '').trim()} `;
  FIM_DO_NOME.forEach((corte) => {
    const onde = termo.indexOf(corte);
    if (onde > 0) termo = termo.slice(0, onde);
  });
  return termo.trim();
}

export function interpretar(texto, { obras = [], hojeISO = todayISO() } = {}) {
  const t = k(texto);
  const intencao = (INTENCOES.find((i) => i.palavras.some((p) => t.includes(p))) || {}).id || null;
  return {
    intencao,
    obra: acharObra(texto, obras),
    periodo: acharPeriodo(texto, hojeISO),
    termo: acharTermo(texto),
    textoOriginal: texto,
  };
}

// ---- as contas ----

function filtrar(lancamentos, { obraId = '', de = '', ate = '' } = {}) {
  return (lancamentos || []).filter((l) => {
    if (!l) return false;
    if (obraId && l.obraId !== obraId) return false;
    if (de && String(l.data || '') < de) return false;
    if (ate && String(l.data || '') > ate) return false;
    return true;
  });
}

const somar = (lista) => lista.reduce((a, l) => a + (Number(l.total) || 0), 0);

function porGrupo(lancamentos) {
  const somas = {};
  Object.keys(GRUPOS_GASTO).forEach((g) => { somas[g] = 0; });
  lancamentos.forEach((l) => {
    const g = grupoDeGasto(l);
    somas[g] = (somas[g] || 0) + (Number(l.total) || 0);
  });
  return Object.entries(somas)
    .map(([key, valor]) => ({ key, label: (GRUPOS_GASTO[key] || {}).label || key, valor }))
    .sort((a, b) => b.valor - a.valor);
}

// Resposta vazia honesta: diz o que faltou, não inventa.
const semDados = (motivo, sugestao = '') => ({ semDados: true, motivo, sugestao });

export function responder(leitura, dados) {
  const { lancamentos = [], obras = [], contas = [], hojeISO = todayISO() } = dados || {};
  const { intencao, obra, periodo, termo } = leitura;
  const janela = { de: periodo.de, ate: periodo.ate };
  const sufixo = periodo.rotulo ? ` ${periodo.rotulo}` : '';

  if (!intencao) {
    return semDados(
      'Não entendi a pergunta.',
      'Tente algo como "quanto gastamos na obra do João", "qual categoria está consumindo mais" ou "preço médio do cimento".'
    );
  }

  switch (intencao) {
    case 'gasto_obra': {
      if (!obra) return semDados('Não achei essa obra pelo nome.', 'Escreva o nome como ele aparece na lista de obras.');
      const doObra = filtrar(lancamentos, { obraId: obra.id, ...janela });
      if (doObra.length === 0) return semDados(`A obra ${obra.nome} não tem lançamento${sufixo}.`);
      const total = somar(doObra);
      const grupos = porGrupo(doObra).filter((g) => g.valor > 0);
      const orcado = Number(obra.orcamento) || 0;
      return {
        titulo: `${obra.nome}${sufixo}`,
        valor: formatMoney(total),
        detalhe: orcado > 0
          ? `${((total / orcado) * 100).toFixed(0)}% do orçamento de ${formatMoney(orcado)} · restam ${formatMoney(orcado - total)}`
          : `${doObra.length} lançamentos · esta obra não tem orçamento definido`,
        linhas: grupos.map((g) => ({ rotulo: g.label, valor: formatMoney(g.valor), fatia: total > 0 ? g.valor / total : 0 })),
      };
    }

    case 'categoria_top': {
      const base = filtrar(lancamentos, { obraId: obra ? obra.id : '', ...janela });
      if (base.length === 0) return semDados(`Não há lançamentos${obra ? ` na obra ${obra.nome}` : ''}${sufixo}.`);
      const grupos = porGrupo(base).filter((g) => g.valor > 0);
      const total = somar(base);
      const top = grupos[0];
      return {
        titulo: `Onde o dinheiro está indo${obra ? ` — ${obra.nome}` : ''}${sufixo}`,
        valor: `${top.label}: ${formatMoney(top.valor)}`,
        detalhe: `${((top.valor / total) * 100).toFixed(0)}% de tudo que foi gasto (${formatMoney(total)})`,
        linhas: grupos.map((g) => ({ rotulo: g.label, valor: formatMoney(g.valor), fatia: g.valor / total })),
      };
    }

    case 'materiais_top': {
      const base = filtrar(lancamentos, { obraId: obra ? obra.id : '', ...janela })
        .filter((l) => l.categoria !== 'mao_de_obra');
      if (base.length === 0) return semDados(`Não há compras${sufixo}.`);
      const porItem = new Map();
      base.forEach((l) => {
        const key = chaveProduto(l.descricao);
        const atual = porItem.get(key) || { nome: l.descricao, total: 0, vezes: 0 };
        atual.total += Number(l.total) || 0;
        atual.vezes += 1;
        porItem.set(key, atual);
      });
      const top = [...porItem.values()].sort((a, b) => b.total - a.total).slice(0, 8);
      return {
        titulo: `Materiais que mais consumiram dinheiro${obra ? ` — ${obra.nome}` : ''}${sufixo}`,
        valor: top[0].nome,
        detalhe: `${formatMoney(top[0].total)} em ${top[0].vezes} ${top[0].vezes === 1 ? 'compra' : 'compras'}`,
        linhas: top.map((i) => ({ rotulo: i.nome, valor: formatMoney(i.total), fatia: i.total / top[0].total })),
      };
    }

    case 'acima_previsto':
    case 'risco_orcamento': {
      const comOrcamento = (obras || []).filter((o) => Number(o.orcamento) > 0);
      if (comOrcamento.length === 0) {
        return semDados('Nenhuma obra tem orçamento definido.', 'Defina o orçamento na tela da obra para eu poder comparar.');
      }
      const situacao = comOrcamento.map((o) => {
        const gasto = somar(filtrar(lancamentos, { obraId: o.id }));
        const orcado = Number(o.orcamento);
        return { obra: o, gasto, orcado, pct: (gasto / orcado) * 100, concluida: obraEstaConcluida(o) };
      }).sort((a, b) => b.pct - a.pct);

      const estourou = situacao.filter((s) => s.pct > 100);
      const risco = situacao.filter((s) => s.pct > 80 && s.pct <= 100 && !s.concluida);
      const alvo = intencao === 'acima_previsto' ? estourou : risco;

      if (alvo.length === 0) {
        return {
          titulo: intencao === 'acima_previsto' ? 'Nenhuma obra passou do orçamento' : 'Nenhuma obra em risco',
          valor: 'Tudo dentro do previsto',
          detalhe: intencao === 'acima_previsto'
            ? `A mais adiantada é ${situacao[0].obra.nome}, com ${situacao[0].pct.toFixed(0)}% do orçamento usado.`
            : 'Risco aqui é a obra que passou de 80% do orçamento sem estar concluída.',
          linhas: situacao.slice(0, 5).map((s) => ({
            rotulo: s.obra.nome, valor: `${s.pct.toFixed(0)}% · ${formatMoney(s.gasto)}`, fatia: Math.min(s.pct / 100, 1),
          })),
        };
      }
      return {
        titulo: intencao === 'acima_previsto' ? 'Obras acima do orçamento' : 'Obras com risco de estourar',
        valor: alvo[0].obra.nome,
        detalhe: `${alvo[0].pct.toFixed(0)}% do orçamento — gastou ${formatMoney(alvo[0].gasto)} de ${formatMoney(alvo[0].orcado)}`,
        linhas: alvo.map((s) => ({
          rotulo: s.obra.nome,
          valor: `${s.pct.toFixed(0)}% · ${formatMoney(s.gasto)} de ${formatMoney(s.orcado)}`,
          fatia: Math.min(s.pct / 100, 1),
          alerta: s.pct > 100,
        })),
      };
    }

    case 'mao_de_obra': {
      const base = filtrar(lancamentos, { obraId: obra ? obra.id : '', ...janela })
        .filter((l) => l.categoria === 'mao_de_obra');
      if (base.length === 0) return semDados(`Não há pagamento de mão de obra${obra ? ` na obra ${obra.nome}` : ''}${sufixo}.`);
      const total = somar(base);
      const porPessoa = new Map();
      base.forEach((l) => {
        const key = k(l.descricao);
        const atual = porPessoa.get(key) || { nome: l.descricao, total: 0, vezes: 0 };
        atual.total += Number(l.total) || 0;
        atual.vezes += 1;
        porPessoa.set(key, atual);
      });
      const pessoas = [...porPessoa.values()].sort((a, b) => b.total - a.total);
      return {
        titulo: `Mão de obra${obra ? ` — ${obra.nome}` : ''}${sufixo}`,
        valor: formatMoney(total),
        detalhe: `${pessoas.length} ${pessoas.length === 1 ? 'pessoa' : 'pessoas'} · ${base.length} pagamentos`,
        linhas: pessoas.slice(0, 8).map((p) => ({
          rotulo: p.nome, valor: `${formatMoney(p.total)} · ${p.vezes}×`, fatia: p.total / pessoas[0].total,
        })),
      };
    }

    case 'preco_medio': {
      if (!termo) return semDados('Não entendi de qual produto.', 'Pergunte assim: "preço médio do cimento".');
      const casados = (lancamentos || []).filter((l) => l && k(l.descricao).includes(k(termo)));
      if (casados.length === 0) return semDados(`Não achei compra de "${termo}".`);
      const contagem = new Map();
      casados.forEach((l) => {
        const key = chaveProduto(l.descricao);
        contagem.set(key, (contagem.get(key) || 0) + 1);
      });
      const chaveMaisUsada = [...contagem.entries()].sort((a, b) => b[1] - a[1])[0][0];
      const nome = casados.find((l) => chaveProduto(l.descricao) === chaveMaisUsada).descricao;
      const h = historicoDePrecos(nome, lancamentos, obras);
      return {
        titulo: nome,
        valor: formatMoney(h.medio),
        detalhe: `média de ${h.itens.length} ${h.itens.length === 1 ? 'compra' : 'compras'} · última ${formatMoney(h.ultimo.preco)} em ${formatDateBR(h.ultimo.data)}`
          + (h.variacao !== null ? ` · ${h.variacao > 0 ? 'subiu' : 'caiu'} ${Math.abs(h.variacao).toFixed(0)}% desde a primeira` : ''),
        linhas: h.itens.slice(0, 8).map((i) => ({
          rotulo: `${formatDateBR(i.data)}${i.fornecedorNome ? ` · ${i.fornecedorNome}` : ''}`,
          valor: formatMoney(i.preco),
          fatia: h.maior > 0 ? i.preco / h.maior : 0,
        })),
      };
    }

    case 'comparar_obras': {
      const t = k(leitura.textoOriginal);
      const querConcluidas = t.includes('finalizad') || t.includes('concluid');
      const alvo = (obras || []).filter((o) => (querConcluidas ? obraEstaConcluida(o) : true));
      if (alvo.length === 0) return semDados(querConcluidas ? 'Nenhuma obra foi finalizada ainda.' : 'Não há obras cadastradas.');
      const linhas = alvo.map((o) => ({
        obra: o,
        gasto: somar(filtrar(lancamentos, { obraId: o.id })),
        orcado: Number(o.orcamento) || 0,
      })).sort((a, b) => b.gasto - a.gasto);
      const maior = linhas[0].gasto || 1;
      return {
        titulo: querConcluidas ? 'Obras finalizadas' : 'Todas as obras',
        valor: `${linhas.length} ${linhas.length === 1 ? 'obra' : 'obras'} · ${formatMoney(linhas.reduce((a, l) => a + l.gasto, 0))}`,
        detalhe: `a mais cara é ${linhas[0].obra.nome}, com ${formatMoney(linhas[0].gasto)}`,
        linhas: linhas.map((l) => ({
          rotulo: l.obra.nome,
          valor: l.orcado > 0 ? `${formatMoney(l.gasto)} de ${formatMoney(l.orcado)}` : formatMoney(l.gasto),
          fatia: l.gasto / maior,
          alerta: l.orcado > 0 && l.gasto > l.orcado,
        })),
      };
    }

    case 'aumentos': {
      const nomes = new Map();
      (lancamentos || []).forEach((l) => {
        if (!l || l.categoria === 'mao_de_obra') return;
        nomes.set(chaveProduto(l.descricao), l.descricao);
      });
      const subiram = [...nomes.values()]
        .map((nome) => ({ nome, h: historicoDePrecos(nome, lancamentos, obras) }))
        .filter((x) => x.h.itens.length >= 2 && x.h.variacao !== null && x.h.variacao >= 10)
        .sort((a, b) => b.h.variacao - a.h.variacao)
        .slice(0, 8);
      if (subiram.length === 0) {
        return {
          titulo: 'Nada subiu de forma relevante',
          valor: 'Nenhum material com alta acima de 10%',
          detalhe: 'Comparando a primeira com a última compra de cada item comprado mais de uma vez.',
          linhas: [],
        };
      }
      return {
        titulo: 'Materiais que mais subiram de preço',
        valor: `${subiram[0].nome}: +${subiram[0].h.variacao.toFixed(0)}%`,
        detalhe: `de ${formatMoney(subiram[0].h.primeiro.preco)} para ${formatMoney(subiram[0].h.ultimo.preco)}`,
        linhas: subiram.map((x) => ({
          rotulo: x.nome,
          valor: `+${x.h.variacao.toFixed(0)}% · ${formatMoney(x.h.primeiro.preco)} → ${formatMoney(x.h.ultimo.preco)}`,
          fatia: Math.min(x.h.variacao / 100, 1),
          alerta: x.h.variacao >= 30,
        })),
      };
    }

    case 'contas_pagar': {
      const pendentes = (contas || []).filter((c) => c && c.status !== 'pago');
      if (pendentes.length === 0) return semDados('Não há conta em aberto.');
      const total = pendentes.reduce((a, c) => a + (Number(c.valor) || 0), 0);
      const vencidas = pendentes.filter((c) => c.vencimento && c.vencimento < hojeISO);
      const ordenadas = [...pendentes].sort((a, b) => String(a.vencimento).localeCompare(String(b.vencimento)));
      return {
        titulo: 'Contas em aberto',
        valor: formatMoney(total),
        detalhe: `${pendentes.length} ${pendentes.length === 1 ? 'boleto' : 'boletos'}`
          + (vencidas.length > 0 ? ` · ${vencidas.length} já ${vencidas.length === 1 ? 'venceu' : 'venceram'}` : ''),
        linhas: ordenadas.slice(0, 8).map((c) => ({
          rotulo: `${c.fornecedorNome || c.descricao || 'Sem distribuidora'} · ${formatDateBR(c.vencimento)}`,
          valor: formatMoney(c.valor),
          fatia: total > 0 ? (Number(c.valor) || 0) / total : 0,
          alerta: !!c.vencimento && c.vencimento < hojeISO,
        })),
      };
    }

    case 'gasto_periodo':
    default: {
      const base = filtrar(lancamentos, { obraId: obra ? obra.id : '', ...janela });
      if (base.length === 0) return semDados(`Não há lançamentos${sufixo}.`);
      const total = somar(base);
      const grupos = porGrupo(base).filter((g) => g.valor > 0);
      return {
        titulo: `Gasto${obra ? ` — ${obra.nome}` : ' de todas as obras'}${sufixo}`,
        valor: formatMoney(total),
        detalhe: `${base.length} lançamentos`,
        linhas: grupos.map((g) => ({ rotulo: g.label, valor: formatMoney(g.valor), fatia: g.valor / total })),
      };
    }
  }
}

// A porta única: pergunta em texto, resposta pronta.
export function perguntar(texto, dados) {
  const leitura = interpretar(texto, dados);
  return { leitura, resposta: responder(leitura, dados) };
}

// O que o assistente sabe responder — vira os atalhos da tela, para o
// dono não ter que adivinhar o que perguntar.
export const PERGUNTAS_SUGERIDAS = [
  'Quanto gastamos em cada obra?',
  'Qual categoria está consumindo mais dinheiro?',
  'Quais os materiais mais comprados neste mês?',
  'Qual obra está acima do orçamento?',
  'Qual obra tem risco de estourar o orçamento?',
  'Quanto gastamos com mão de obra?',
  'Preço médio do cimento',
  'Quais materiais aumentaram de preço?',
  'Quanto tenho de contas a pagar?',
];
