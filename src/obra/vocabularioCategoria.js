// Como cada categoria de gasto se chama na tela.
//
// O formulário de lançamento é um só para as três categorias, e por isso
// falava de tudo como se fosse produto: "Produto", "UN", "Fornecedor",
// "Pesquisar produto…". Para Produtos da Loja está certo. Para MÃO DE
// OBRA não: quem faz um serviço não é fornecedor, o que se compra não é
// produto, e a unidade não é UN — é diária, hora, metro quadrado ou
// empreitada.
//
// Aqui ficam as palavras de cada categoria, num lugar só. Os NÚMEROS e o
// jeito de guardar continuam idênticos: só muda o que está escrito.

export const VOCABULARIO = {
  produto_loja: {
    item: 'Produto',
    itemPlaceholder: 'Digite ou escolha — se já existir, o preço vem sozinho',
    seletorBusca: 'Pesquisar produto…',
    seletorAbrir: 'Abrir catálogo de produtos',
    unidadePadrao: 'UN',
    unidadePlaceholder: 'UN, M³...',
    unidadesSugeridas: ['UN', 'M', 'M²', 'M³', 'KG', 'SC', 'CX', 'PC', 'L'],
    valor: 'Valor (R$)',
    quem: 'Fornecedor (opcional)',
    quemPlaceholder: 'Ex: Depósito São José',
    observacaoPlaceholder: 'Ex: comprado em outra loja',
    busca: 'Buscar por produto, fornecedor ou observação...',
    quemIcone: '🏪',
    vazio: 'Nenhum produto lançado nesta obra ainda.',
  },
  material_bruto: {
    item: 'Material',
    itemPlaceholder: 'Ex: Areia lavada',
    seletorBusca: 'Pesquisar material…',
    seletorAbrir: 'Abrir lista de materiais',
    unidadePadrao: 'UN',
    unidadePlaceholder: 'M³, KG, UN...',
    unidadesSugeridas: ['M³', 'M²', 'M', 'KG', 'T', 'UN', 'SC', 'CARGA'],
    valor: 'Valor (R$)',
    quem: 'Fornecedor (opcional)',
    quemPlaceholder: 'Ex: Depósito São José',
    observacaoPlaceholder: 'Ex: comprado em outra loja',
    busca: 'Buscar por material, fornecedor ou observação...',
    quemIcone: '🏪',
    vazio: 'Nenhum material lançado nesta obra ainda.',
  },
  mao_de_obra: {
    item: 'Serviço',
    itemPlaceholder: 'Ex: Pedreiro — diária',
    seletorBusca: 'Pesquisar serviço…',
    seletorAbrir: 'Abrir lista de serviços',
    // A diária é como a mão de obra é contratada aqui na prática. Fica
    // preenchida à vista, no campo, e não escondida como padrão — quem
    // fechou por empreitada troca antes de lançar.
    unidadePadrao: 'DIÁRIA',
    unidadePlaceholder: 'DIÁRIA, H, M²...',
    unidadesSugeridas: ['DIÁRIA', 'H', 'SEMANA', 'MÊS', 'M²', 'M', 'EMPREITADA'],
    valor: 'Valor por unidade (R$)',
    quem: 'Quem fez (opcional)',
    quemPlaceholder: 'Ex: Messias (pedreiro)',
    observacaoPlaceholder: 'Ex: serviço da semana',
    busca: 'Buscar por serviço, quem fez ou observação...',
    quemIcone: '👷',
    vazio: 'Nenhum serviço lançado nesta obra ainda.',
  },
};

// Nunca devolve indefinido: categoria desconhecida (dado antigo) cai no
// vocabulário de produto, que é como a tela falava antes.
export function vocabularioDe(categoria) {
  return VOCABULARIO[categoria] || VOCABULARIO.produto_loja;
}
