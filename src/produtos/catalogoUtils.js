// Funções puras que montam o "catálogo" usado pelo ProdutoSeletor.
//
// Para "Produtos da Loja" o catálogo já existe como uma tabela própria
// (`produtos`) — usamos ela diretamente. Para "Mão de obra" e "Material
// Bruto" o sistema nunca teve uma tabela de cadastro separada; o que existe
// de real é o histórico de lançamentos já feitos nessas categorias. Por
// isso o catálogo dessas duas categorias é derivado dos próprios
// lançamentos (nome, última unidade e último preço usados), em vez de
// inventar uma lista de materiais que não está nos dados do sistema.
import { combinaBusca } from '../textUtils';
import { CATALOGO_VENDA } from '../venda/catalogoVenda';

// Ordenações oferecidas na tela do Catálogo. `nome` continua sendo o
// padrão (é como a lista sempre apareceu); as outras existem porque o
// catálogo importado do PDV é grande demais para procurar no olho.
export const ORDENS_CATALOGO = [
  { key: 'nome', label: 'Nome (A-Z)' },
  { key: 'atualizado', label: 'Atualizado recentemente' },
  { key: 'preco_maior', label: 'Preço: maior primeiro' },
  { key: 'preco_menor', label: 'Preço: menor primeiro' },
];

// Filtra o catálogo pelo texto digitado (sem acento, palavras em qualquer
// ordem, procurando no nome e na unidade) e ordena do jeito escolhido.
// Não altera a lista original.
export function filtrarOrdenarProdutos(produtos, busca = '', ordem = 'nome') {
  const filtrados = produtos.filter((p) => combinaBusca(busca, p.nome, p.unidade));
  const ordenados = filtrados.slice();
  if (ordem === 'preco_maior') {
    ordenados.sort((a, b) => (Number(b.preco) || 0) - (Number(a.preco) || 0));
  } else if (ordem === 'preco_menor') {
    ordenados.sort((a, b) => (Number(a.preco) || 0) - (Number(b.preco) || 0));
  } else if (ordem === 'atualizado') {
    ordenados.sort((a, b) => String(b.atualizadoEm || '').localeCompare(String(a.atualizadoEm || '')));
  } else {
    ordenados.sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'));
  }
  return ordenados;
}

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

  // "Madeiras": além do histórico, a lista já vem com os nomes da tabela
  // de madeiras da loja — assim não precisa digitar o nome inteiro nem
  // arriscar escrever diferente a cada vez. Esses nomes entram SEM preço
  // de propósito: o preço da tabela é o de VENDA ao cliente, e aqui o que
  // vale é quanto a obra pagou. Assim que o item é lançado uma vez, o
  // preço real passa a vir do próprio histórico (abaixo).
  if (categoria === 'madeiras') {
    CATALOGO_VENDA.forEach((m) => {
      const chave = m.nome.trim().toLowerCase();
      porChave[chave] = {
        chave, nome: m.nome, unidade: m.formato, preco: null,
        produtoId: null, usoCount: 0, ultimaData: null,
      };
    });
  }

  lancamentos
    .filter((l) => l.categoria === categoria)
    .forEach((l) => {
      const chave = (l.descricao || '').trim().toLowerCase();
      if (!chave) return;
      const atual = porChave[chave];
      if (!atual || atual.ultimaData === null) {
        // `ultimaData === null` é um nome que veio da tabela de madeiras e
        // ainda não tinha compra: agora passa a valer o que foi pago.
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
  const termo = busca.trim();
  const filtrados = termo
    ? itens.filter((it) => combinaBusca(termo, it.nome, it.unidade))
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
