// Funções puras de análise: estatísticas de material, comparação de preços
// entre fornecedores, resumo do mês e busca global.
//
// A fonte de verdade é sempre `lancamentos` (as compras reais já
// registradas) — nada aqui inventa número, tudo é soma/média sobre o que
// foi de fato lançado no sistema.

function normalizar(s) {
  return String(s || '').trim().toLowerCase();
}

function semAcento(s) {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

// ---- materiais ----

// Lista de materiais distintos comprados, com o total gasto em cada um.
export function rankingMateriais(lancamentos, limite) {
  const mapa = {};
  lancamentos.forEach((l) => {
    const chave = normalizar(l.descricao);
    if (!chave) return;
    if (!mapa[chave]) mapa[chave] = { descricao: l.descricao, unidade: l.unidade, total: 0, quantidade: 0, compras: 0 };
    mapa[chave].total += Number(l.total) || 0;
    mapa[chave].quantidade += Number(l.quantidade) || 0;
    mapa[chave].compras += 1;
  });
  const lista = Object.values(mapa).sort((a, b) => b.total - a.total);
  return limite ? lista.slice(0, limite) : lista;
}

// Estatísticas de preço de um material específico.
export function estatisticasMaterial(lancamentos, descricao) {
  const alvo = normalizar(descricao);
  const compras = lancamentos
    .filter((l) => normalizar(l.descricao) === alvo)
    .sort((a, b) => (a.data || '').localeCompare(b.data || ''));

  if (compras.length === 0) {
    return { compras: [], quantidade: 0, totalGasto: 0, precoMedio: 0, maiorPreco: 0, menorPreco: 0, ultimoPreco: 0, unidade: '' };
  }

  const precos = compras.map((l) => Number(l.preco) || 0).filter((p) => p > 0);
  const quantidade = compras.reduce((a, l) => a + (Number(l.quantidade) || 0), 0);
  const totalGasto = compras.reduce((a, l) => a + (Number(l.total) || 0), 0);

  return {
    compras,
    unidade: compras[compras.length - 1].unidade || '',
    quantidade,
    totalGasto,
    // preço médio ponderado pela quantidade — reflete o que foi realmente pago
    precoMedio: quantidade > 0 ? totalGasto / quantidade : 0,
    maiorPreco: precos.length ? Math.max(...precos) : 0,
    menorPreco: precos.length ? Math.min(...precos) : 0,
    ultimoPreco: Number(compras[compras.length - 1].preco) || 0,
  };
}

// Comparação de preço do mesmo material entre fornecedores. Usa o preço
// MAIS RECENTE de cada fornecedor (é o que vale na hora de decidir a
// compra) e marca o mais barato.
export function compararPrecosPorFornecedor(lancamentos, descricao) {
  const alvo = normalizar(descricao);
  const porFornecedor = {};

  lancamentos
    .filter((l) => normalizar(l.descricao) === alvo && (l.fornecedorNome || '').trim())
    .forEach((l) => {
      const nome = l.fornecedorNome.trim();
      const chave = normalizar(nome);
      const preco = Number(l.preco) || 0;
      if (!porFornecedor[chave]) {
        porFornecedor[chave] = { fornecedor: nome, ultimoPreco: preco, ultimaData: l.data, menorPreco: preco, maiorPreco: preco, compras: 0, unidade: l.unidade };
      }
      const f = porFornecedor[chave];
      f.compras += 1;
      if (preco > 0) {
        f.menorPreco = Math.min(f.menorPreco || preco, preco);
        f.maiorPreco = Math.max(f.maiorPreco, preco);
      }
      if (!f.ultimaData || (l.data || '') >= f.ultimaData) {
        f.ultimoPreco = preco;
        f.ultimaData = l.data;
        f.unidade = l.unidade || f.unidade;
      }
    });

  const lista = Object.values(porFornecedor).sort((a, b) => a.ultimoPreco - b.ultimoPreco);
  const validos = lista.filter((f) => f.ultimoPreco > 0);
  const menor = validos.length ? validos[0].ultimoPreco : 0;
  const maior = validos.length ? validos[validos.length - 1].ultimoPreco : 0;

  return {
    fornecedores: lista.map((f) => ({ ...f, ehMaisBarato: f.ultimoPreco > 0 && f.ultimoPreco === menor })),
    menorPreco: menor,
    maiorPreco: maior,
    // quanto dá para economizar comprando do mais barato em vez do mais caro
    economiaPorUnidade: maior > menor ? maior - menor : 0,
    economiaPct: maior > 0 && maior > menor ? ((maior - menor) / maior) * 100 : 0,
  };
}

// ---- resumo do mês ----

function mesAnterior(mesISO) {
  const [ano, mes] = mesISO.split('-').map(Number);
  const d = new Date(ano, mes - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function resumoDoMes(dados, hojeISO) {
  const { lancamentos = [], obras = [], contas = [], CATEGORIAS = {} } = dados;
  const mes = hojeISO.slice(0, 7);
  const anterior = mesAnterior(mes);

  const doMes = lancamentos.filter((l) => (l.data || '').slice(0, 7) === mes);
  const doAnterior = lancamentos.filter((l) => (l.data || '').slice(0, 7) === anterior);

  const total = doMes.reduce((a, l) => a + (Number(l.total) || 0), 0);
  const totalAnterior = doAnterior.reduce((a, l) => a + (Number(l.total) || 0), 0);

  // obra que mais gastou no mês
  const porObra = {};
  doMes.forEach((l) => { porObra[l.obraId] = (porObra[l.obraId] || 0) + (Number(l.total) || 0); });
  const topObraId = Object.keys(porObra).sort((a, b) => porObra[b] - porObra[a])[0];
  const topObra = topObraId
    ? { nome: obras.find((o) => o.id === topObraId)?.nome || 'Obra removida', valor: porObra[topObraId] }
    : null;

  // categoria que mais consumiu
  const porCategoria = {};
  doMes.forEach((l) => { porCategoria[l.categoria] = (porCategoria[l.categoria] || 0) + (Number(l.total) || 0); });
  const topCatKey = Object.keys(porCategoria).sort((a, b) => porCategoria[b] - porCategoria[a])[0];
  const topCategoria = topCatKey
    ? { label: CATEGORIAS[topCatKey]?.label || topCatKey, valor: porCategoria[topCatKey] }
    : null;

  // fornecedor que mais recebeu
  const porFornecedor = {};
  doMes.forEach((l) => {
    const n = (l.fornecedorNome || '').trim();
    if (!n) return;
    porFornecedor[n] = (porFornecedor[n] || 0) + (Number(l.total) || 0);
  });
  const topFornNome = Object.keys(porFornecedor).sort((a, b) => porFornecedor[b] - porFornecedor[a])[0];
  const topFornecedor = topFornNome ? { nome: topFornNome, valor: porFornecedor[topFornNome] } : null;

  // materiais que ficaram mais caros que no mês anterior
  const mediaPorMaterial = (lista) => {
    const m = {};
    lista.forEach((l) => {
      const c = normalizar(l.descricao);
      if (!c || !(Number(l.quantidade) > 0)) return;
      if (!m[c]) m[c] = { descricao: l.descricao, total: 0, qtd: 0 };
      m[c].total += Number(l.total) || 0;
      m[c].qtd += Number(l.quantidade) || 0;
    });
    return Object.fromEntries(Object.entries(m).map(([k, v]) => [k, { descricao: v.descricao, media: v.total / v.qtd }]));
  };
  const mediaMes = mediaPorMaterial(doMes);
  const mediaAnt = mediaPorMaterial(doAnterior);
  const variacoes = Object.entries(mediaMes)
    .filter(([k]) => mediaAnt[k] && mediaAnt[k].media > 0)
    .map(([k, v]) => ({
      descricao: v.descricao,
      pct: ((v.media - mediaAnt[k].media) / mediaAnt[k].media) * 100,
      de: mediaAnt[k].media,
      para: v.media,
    }))
    .filter((v) => Math.abs(v.pct) >= 5)
    .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));

  const contasPendentes = contas.filter((c) => c.status !== 'pago');

  return {
    mes, anterior,
    total, totalAnterior,
    variacaoPct: totalAnterior > 0 ? ((total - totalAnterior) / totalAnterior) * 100 : null,
    lancamentosNoMes: doMes.length,
    topObra, topCategoria, topFornecedor,
    variacoesMateriais: variacoes.slice(0, 5),
    contasPendentes: { quantidade: contasPendentes.length, valor: contasPendentes.reduce((a, c) => a + (Number(c.valor) || 0), 0) },
  };
}

// ---- busca global ----

// Procura o termo em todas as áreas do sistema e devolve os resultados
// agrupados, já com o destino (view) de cada um.
export function buscaGlobal(termo, dados) {
  const t = semAcento(termo).trim();
  if (t.length < 2) return [];
  const {
    obras = [], clientes = [], produtos = [], fornecedores = [],
    contratos = [], lancamentos = [], contas = [],
    montadores = [], crediario = [],
  } = dados;

  const bate = (...campos) => campos.some((c) => semAcento(c).includes(t));
  const grupos = [];
  const push = (titulo, itens) => { if (itens.length) grupos.push({ titulo, itens: itens.slice(0, 6) }); };

  push('Obras', obras.filter((o) => bate(o.nome, o.cliente, o.endereco)).map((o) => ({
    id: o.id, titulo: o.nome, subtitulo: [o.cliente, o.endereco].filter(Boolean).join(' · ') || 'sem cliente',
    destino: { view: 'obra', obraId: o.id },
  })));

  push('Contratos', contratos.filter((c) => bate(c.numero, c.cliente?.nome, c.cliente?.cpfCnpj, c.obra?.nome)).map((c) => ({
    id: c.id, titulo: c.cliente?.nome || 'Sem cliente',
    subtitulo: `${c.numero ? `nº ${c.numero} · ` : 'rascunho · '}${c.obra?.nome || 'sem obra'}`,
    destino: { view: 'contratos' },
  })));

  push('Clientes', clientes.filter((c) => bate(c.nome, c.cpfCnpj, c.telefone, c.email, c.cidade)).map((c) => ({
    id: c.id, titulo: c.nome, subtitulo: [c.cpfCnpj, c.cidade, c.telefone].filter(Boolean).join(' · '),
    destino: { view: 'contratos' },
  })));

  push('Fornecedores', fornecedores.filter((f) => bate(f.nome, f.cnpj, f.telefone, f.email, f.cidade, f.categoria)).map((f) => ({
    id: f.id, titulo: f.nome, subtitulo: [f.cidade, f.telefone].filter(Boolean).join(' · ') || 'fornecedor',
    destino: { view: 'fornecedores' },
  })));

  push('Produtos', produtos.filter((p) => bate(p.nome)).map((p) => ({
    id: p.id, titulo: p.nome, subtitulo: `${p.unidade} · último preço registrado`,
    destino: { view: 'materiais', material: p.nome },
  })));

  // Crediário: o saldo mostrado é o que ainda falta descontar da mão de
  // obra do montador — não é venda nem conta a receber.
  push('Crediário (montadores)', montadores.filter((m) => bate(m.nome, m.apelido, m.telefone)).map((m) => {
    const movimentos = crediario.filter((mov) => mov.montadorId === m.id);
    const saldo = movimentos.reduce(
      (acc, mov) => acc + (mov.tipo === 'acerto' ? -(Number(mov.valor) || 0) : (Number(mov.valor) || 0)),
      0
    );
    return {
      id: m.id,
      titulo: m.apelido ? `${m.nome} (${m.apelido})` : m.nome,
      subtitulo: `saldo a descontar: ${saldo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
      destino: { view: 'crediario' },
    };
  }));

  push('Contas a pagar', contas.filter((c) => bate(c.fornecedorNome, c.descricao)).map((c) => ({
    id: c.id, titulo: c.fornecedorNome || c.descricao || 'Conta',
    subtitulo: `vence ${c.vencimento} · ${c.status}`,
    destino: { view: 'contas' },
  })));

  // materiais lançados que não estão no catálogo de produtos
  const nomesProdutos = new Set(produtos.map((p) => normalizar(p.nome)));
  const materiaisLancados = [...new Map(
    lancamentos
      .filter((l) => bate(l.descricao) && !nomesProdutos.has(normalizar(l.descricao)))
      .map((l) => [normalizar(l.descricao), l])
  ).values()];
  push('Materiais comprados', materiaisLancados.map((l) => ({
    id: l.id, titulo: l.descricao, subtitulo: `${l.unidade} · comprado em lançamentos`,
    destino: { view: 'materiais', material: l.descricao },
  })));

  return grupos;
}
