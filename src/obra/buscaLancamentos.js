// Busca e soma dos lançamentos de uma obra (funções puras, sem React).
//
// A tela da obra já listava os lançamentos e deixava procurar por texto.
// O que faltava era a conta no pé da lista: procurar "prego" e ver, de
// uma vez, quanto de dinheiro foi embora em prego naquela obra.
//
// Duas decisões que valem explicar:
//
// 1. Quantidade NÃO vira um número só. Somar "10 UN + 3 KG = 13" seria
//    inventar uma unidade que não existe. Por isso a soma é por unidade,
//    e a tela mostra cada uma ("10 UN · 3 KG").
//
// 2. O preço médio só aparece quando tudo o que a busca achou está na
//    MESMA unidade. Dividir dinheiro por uma quantidade de unidades
//    misturadas daria um número com cara de verdade e sem significado.
import { combinaBusca } from '../textUtils';

// Os lançamentos de uma obra numa categoria, filtrados pelo que foi
// digitado. A busca ignora acento e aceita as palavras em qualquer ordem
// ("galv prego" acha "PREGO GALV"), igual à do catálogo.
export function filtrarLancamentos(lancamentos, { obraId, categoria, termo = '' } = {}) {
  return (lancamentos || []).filter((l) => (
    l.obraId === obraId
    && l.categoria === categoria
    && combinaBusca(termo, l.descricao, l.fornecedorNome, l.observacao)
  ));
}

// A conta do pé da lista.
export function resumoLancamentos(lista) {
  const itens = lista || [];
  const total = itens.reduce((a, l) => a + (Number(l.total) || 0), 0);

  // quantidade somada por unidade, na ordem em que as unidades aparecem
  const porUnidade = new Map();
  itens.forEach((l) => {
    const unidade = String(l.unidade || '').trim().toUpperCase() || '—';
    porUnidade.set(unidade, (porUnidade.get(unidade) || 0) + (Number(l.quantidade) || 0));
  });
  const quantidades = [...porUnidade.entries()].map(([unidade, quantidade]) => ({ unidade, quantidade }));

  // só faz sentido dividir dinheiro por quantidade quando a unidade é uma só
  const unicaUnidade = quantidades.length === 1 && quantidades[0].quantidade > 0 ? quantidades[0] : null;

  return {
    lancamentos: itens.length,
    total,
    quantidades,
    precoMedio: unicaUnidade ? total / unicaUnidade.quantidade : null,
    unidadeMedia: unicaUnidade ? unicaUnidade.unidade : null,
  };
}

// Escreve a quantidade do jeito que se fala: "10 UN", ou "10 UN · 3 KG"
// quando a busca pegou coisas medidas de formas diferentes.
export function textoQuantidades(quantidades) {
  return (quantidades || [])
    .map(({ unidade, quantidade }) => `${formatarQuantidade(quantidade)} ${unidade}`)
    .join(' · ');
}

function formatarQuantidade(n) {
  const valor = Number(n) || 0;
  return valor.toLocaleString('pt-BR', { maximumFractionDigits: 3 });
}

// O mesmo termo pode ter caído em OUTRAS categorias da obra (prego
// lançado como "produto da loja" numa compra e como "material bruto" na
// outra). Sem esse aviso, o total do rodapé seria lido como "tudo o que
// gastei de prego", e não é: é tudo dentro da categoria aberta.
export function lancamentosEmOutrasCategorias(lancamentos, { obraId, categoria, termo = '' } = {}) {
  if (!String(termo).trim()) return { lancamentos: 0, total: 0 };
  const fora = (lancamentos || []).filter((l) => (
    l.obraId === obraId
    && l.categoria !== categoria
    && combinaBusca(termo, l.descricao, l.fornecedorNome, l.observacao)
  ));
  return { lancamentos: fora.length, total: fora.reduce((a, l) => a + (Number(l.total) || 0), 0) };
}
