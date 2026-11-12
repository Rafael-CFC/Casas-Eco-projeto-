// O catálogo visto de cima: o mesmo produto, em todas as obras.
//
// Até aqui cada obra era uma ilha. O dono lançava "CIMENTO CP-II 50KG" na
// obra do João e na obra da Maria e nada ligava uma coisa à outra: não
// dava para ver se o preço subiu, em que obras aquilo foi usado, nem que
// "CIMENTO CPII 50 KG" era o mesmo item escrito diferente.
//
// Uma regra manda em tudo que está aqui: NOME PARECIDO NÃO É O MESMO
// PRODUTO. "TUBO PVC 100MM" e "TUBO PVC 50MM" têm quase todas as letras
// em comum e são coisas diferentes — comprar um pelo preço do outro é
// erro caro. Por isso a identidade é o nome inteiro normalizado, e os
// NÚMEROS têm que bater; parecido demais só vira "confira, pode ser
// duplicado", nunca junção automática.
//
// Funções puras: sem React, sem rede, sem banco.
import { semAcento } from '../textUtils';

// A identidade do produto: o nome sem acento, sem caixa, sem espaço
// sobrando e sem pontuação de enfeite. Nada de cortar palavra nem tirar
// número — é o número que separa o 100mm do 50mm.
export function chaveProduto(nome) {
  return semAcento(nome)
    .replace(/[.,;:/\\]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Os números que aparecem no nome (100mm, 50kg, 2,5). Dois produtos só
// podem ser "o mesmo" se os números forem iguais.
function numerosDoNome(nome) {
  return (semAcento(nome).match(/\d+(?:[.,]\d+)?/g) || []).map((n) => n.replace(',', '.'));
}

function palavras(nome) {
  return chaveProduto(nome).split(' ').filter((p) => p.length > 1);
}

// Quanto dois nomes se parecem, de 0 a 1 (palavras em comum sobre o
// total). Serve só para sugerir duplicado.
export function semelhanca(a, b) {
  const pa = new Set(palavras(a));
  const pb = new Set(palavras(b));
  if (pa.size === 0 || pb.size === 0) return 0;
  let comuns = 0;
  pa.forEach((p) => { if (pb.has(p)) comuns += 1; });
  return comuns / (pa.size + pb.size - comuns);
}

// ---- o mesmo produto, em qualquer obra ----

// Todo lançamento com aquele nome, de todas as obras, do mais novo para
// o mais velho.
export function lancamentosDoProduto(nome, lancamentos) {
  const k = chaveProduto(nome);
  if (!k) return [];
  return (lancamentos || [])
    .filter((l) => l && chaveProduto(l.descricao) === k)
    .sort((a, b) => String(b.data || '').localeCompare(String(a.data || '')));
}

// O histórico de preço do produto: o que se pagou, quando, em que obra e
// de quem. É o que responde "o cimento subiu?".
export function historicoDePrecos(nome, lancamentos, obras = []) {
  const nomeObra = (id) => (obras.find((o) => o.id === id) || {}).nome || '';
  const itens = lancamentosDoProduto(nome, lancamentos).map((l) => ({
    data: l.data,
    preco: Number(l.preco) || 0,
    quantidade: Number(l.quantidade) || 0,
    unidade: l.unidade || '',
    obraId: l.obraId,
    obraNome: nomeObra(l.obraId),
    fornecedorNome: l.fornecedorNome || '',
  })).filter((i) => i.preco > 0);

  if (itens.length === 0) {
    return { itens: [], ultimo: null, primeiro: null, menor: null, maior: null, medio: null, variacao: null };
  }
  const precos = itens.map((i) => i.preco);
  const ultimo = itens[0];
  const primeiro = itens[itens.length - 1];
  // Variação do primeiro preço conhecido até o último, em %. Com um
  // lançamento só não existe variação — e dizer 0% seria mentira.
  const variacao = itens.length > 1 && primeiro.preco > 0
    ? ((ultimo.preco - primeiro.preco) / primeiro.preco) * 100
    : null;
  return {
    itens,
    ultimo,
    primeiro,
    menor: Math.min(...precos),
    maior: Math.max(...precos),
    medio: precos.reduce((a, p) => a + p, 0) / precos.length,
    variacao,
  };
}

// Em que obras aquele produto já foi usado, com quanto e quando.
export function ondeFoiUsado(nome, lancamentos, obras = []) {
  const porObra = new Map();
  lancamentosDoProduto(nome, lancamentos).forEach((l) => {
    const atual = porObra.get(l.obraId) || {
      obraId: l.obraId,
      obraNome: (obras.find((o) => o.id === l.obraId) || {}).nome || 'Obra removida',
      quantidade: 0, total: 0, vezes: 0, ultimaData: '',
    };
    atual.quantidade += Number(l.quantidade) || 0;
    atual.total += Number(l.total) || 0;
    atual.vezes += 1;
    if (String(l.data || '') > atual.ultimaData) atual.ultimaData = l.data || '';
    porObra.set(l.obraId, atual);
  });
  return [...porObra.values()].sort((a, b) => b.total - a.total);
}

// ---- todo o catálogo, junto ----
//
// Junta o cadastro de produtos com os nomes que só existem nos
// lançamentos (material bruto, madeira, o que foi digitado na mão). É
// esta lista que responde "o que a loja já comprou alguma vez".
export function catalogoCompleto({ produtos = [], lancamentos = [], obras = [], favoritos = [] } = {}) {
  const porChave = new Map();
  const favorito = new Set((favoritos || []).map(chaveProduto));

  const juntar = (nome, extra) => {
    const k = chaveProduto(nome);
    if (!k) return null;
    if (!porChave.has(k)) {
      porChave.set(k, {
        chave: k, nome, unidade: '', precoAtual: null, produtoId: null,
        vezes: 0, total: 0, ultimaData: '', obras: new Set(), favorito: favorito.has(k),
      });
    }
    const item = porChave.get(k);
    Object.assign(item, extra);
    return item;
  };

  produtos.forEach((p) => {
    juntar(p.nome, { unidade: p.unidade, precoAtual: Number(p.preco) || 0, produtoId: p.id });
  });

  lancamentos.forEach((l) => {
    if (!l || l.categoria === 'mao_de_obra') return; // pagamento de gente não é item de catálogo
    const item = juntar(l.descricao, {});
    if (!item) return;
    item.vezes += 1;
    item.total += Number(l.total) || 0;
    if (l.obraId) item.obras.add(l.obraId);
    if (String(l.data || '') > item.ultimaData) {
      item.ultimaData = l.data || '';
      item.unidade = l.unidade || item.unidade;
      if (item.precoAtual === null) item.precoAtual = Number(l.preco) || 0;
    }
  });

  const nomeObra = (id) => (obras.find((o) => o.id === id) || {}).nome || '';
  return [...porChave.values()]
    .map((i) => ({
      ...i,
      obras: [...i.obras].map(nomeObra).filter(Boolean),
      quantasObras: i.obras.size,
    }))
    .sort((a, b) => b.vezes - a.vezes || a.nome.localeCompare(b.nome, 'pt-BR'));
}

// O nome espremido: só letras e números, sem espaço nem pontuação.
// "CIMENTO CP-II 50KG" e "CIMENTO CPII 50 KG" viram a mesma coisa aqui —
// é o jeito mais seguro de pegar o mesmo produto digitado diferente, sem
// aproximar produtos que são de verdade diferentes.
function espremer(nome) {
  return semAcento(nome).replace(/[^a-z0-9]/g, '');
}

// ---- duplicados: sugerir, nunca juntar sozinho ----
//
// Duas peneiras, e as duas exigem que os NÚMEROS batam — sem isso o
// "TUBO PVC 100MM" viraria parente do "TUBO PVC 50MM", que é o erro mais
// caro que esta função poderia cometer:
//
//   1. mesma escrita espremida: só muda hífen, espaço ou pontuação.
//      É quase certeza de ser o mesmo item;
//   2. palavras em comum acima do mínimo: aí é só uma suspeita.
//
// O sistema nunca junta sozinho: devolve o par para o dono olhar.
export function possiveisDuplicados(itens, { minimo = 0.7 } = {}) {
  const lista = (itens || []).filter((i) => i && i.nome);
  const pares = [];
  for (let i = 0; i < lista.length; i += 1) {
    for (let j = i + 1; j < lista.length; j += 1) {
      const a = lista[i];
      const b = lista[j];
      if (chaveProduto(a.nome) === chaveProduto(b.nome)) continue; // é o mesmo, não duplicado
      const na = numerosDoNome(a.nome).sort().join(',');
      const nb = numerosDoNome(b.nome).sort().join(',');
      if (na !== nb) continue; // número diferente = produto diferente

      if (espremer(a.nome) === espremer(b.nome)) {
        pares.push({ a, b, semelhanca: 1, motivo: 'mesma escrita, só muda espaço ou pontuação' });
        continue;
      }
      const parecido = semelhanca(a.nome, b.nome);
      if (parecido >= minimo) {
        pares.push({ a, b, semelhanca: Math.round(parecido * 100) / 100, motivo: 'nomes parecidos' });
      }
    }
  }
  return pares.sort((x, y) => y.semelhanca - x.semelhanca);
}

// ---- favoritos ----
export function alternarFavorito(favoritos, nome) {
  const k = chaveProduto(nome);
  if (!k) return favoritos || [];
  const atuais = favoritos || [];
  return atuais.some((f) => chaveProduto(f) === k)
    ? atuais.filter((f) => chaveProduto(f) !== k)
    : [...atuais, nome];
}

export function ehFavorito(favoritos, nome) {
  const k = chaveProduto(nome);
  return (favoritos || []).some((f) => chaveProduto(f) === k);
}
