// Funções puras que montam o "catálogo" usado pelo ProdutoSeletor.
//
// Para "Produtos da Loja" o catálogo já existe como uma tabela própria
// (`produtos`) — usamos ela diretamente. Para "Mão de obra" e "Material
// Bruto" o sistema nunca teve uma tabela de cadastro separada; o que existe
// de real é o histórico de lançamentos já feitos nessas categorias. Por
// isso o catálogo dessas duas categorias é derivado dos próprios
// lançamentos (nome, última unidade e último preço usados), em vez de
// inventar uma lista de materiais que não está nos dados do sistema.
export function catalogoPorCategoria(categoria, produtos, lancamentos) {
  if (categoria === 'produto_loja') {
    const usoCount = {};
    const ultimaData = {};
    lancamentos.forEach((l) => {
      if (!l.produtoId) return;
      usoCount[l.produtoId] = (usoCount[l.produtoId] || 0) + 1;
      if (!ultimaData[l.produtoId] || l.data > ultimaData[l.produtoId]) ultimaData[l.produtoId] = l.data;
    });
    return produtos.map((p) => ({
      chave: p.id,
      nome: p.nome,
      unidade: p.unidade,
      preco: p.preco,
      produtoId: p.id,
      usoCount: usoCount[p.id] || 0,
      ultimaData: ultimaData[p.id] || null,
    }));
  }

  const porChave = {};
  lancamentos
    .filter((l) => l.categoria === categoria)
    .forEach((l) => {
      const chave = (l.descricao || '').trim().toLowerCase();
      if (!chave) return;
      const atual = porChave[chave];
      if (!atual) {
        porChave[chave] = { chave, nome: l.descricao, unidade: l.unidade, preco: l.preco, produtoId: null, usoCount: 1, ultimaData: l.data };
      } else {
        atual.usoCount += 1;
        if (l.data > atual.ultimaData) {
          atual.unidade = l.unidade;
          atual.preco = l.preco;
          atual.ultimaData = l.data;
        }
      }
    });
  return Object.values(porChave);
}

// Separa o catálogo em "mais utilizados" / "recentes" / lista filtrada pela
// busca. As seções de destaque só aparecem quando há dados reais o
// suficiente para fazer sentido (senão ficam ocultas, como pedido).
export function selecionarSecoes(itens, busca, opcoes = {}) {
  const { minMaisUtilizados = 3, minRecentes = 2, limiteSecao = 5 } = opcoes;
  const termo = busca.trim().toLowerCase();
  const filtrados = termo
    ? itens.filter((it) => it.nome.toLowerCase().includes(termo))
    : itens.slice();
  filtrados.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  if (termo) {
    return { maisUtilizados: [], recentes: [], lista: filtrados };
  }

  const comUso = itens.filter((it) => it.usoCount > 0);
  const maisUtilizados = comUso.length >= minMaisUtilizados
    ? [...comUso].sort((a, b) => b.usoCount - a.usoCount).slice(0, limiteSecao)
    : [];

  const comData = itens.filter((it) => it.ultimaData);
  const recentes = comData.length >= minRecentes
    ? [...comData].sort((a, b) => b.ultimaData.localeCompare(a.ultimaData)).slice(0, limiteSecao)
    : [];

  return { maisUtilizados, recentes, lista: filtrados };
}
