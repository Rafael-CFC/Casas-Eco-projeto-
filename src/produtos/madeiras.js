// Reconhecimento de MADEIRA e o fornecedor ligado a ela.
//
// A Casas Eco compra a madeira de uma distribuidora só (a Albertina). Para
// o Financeiro mostrar quanto foi gasto com ela, todo lançamento de
// madeira numa obra já entra com esse fornecedor preenchido.
//
// A lista do que é madeira não foi inventada aqui: ela sai da própria
// tabela de madeiras da loja (src/venda/catalogoVenda.js). O que este
// arquivo acrescenta são só as formas de escrever o mesmo item no dia a
// dia — o nome com complemento ("DECK 2,5M ANTIDERRAPANTE"), a bitola
// solta ("5X10X3M") e as variações de grafia ("TÁBUA"/"TABOA").
import { CATALOGO_VENDA } from '../venda/catalogoVenda';
import { semAcento } from '../textUtils';

export const FORNECEDOR_MADEIRAS_PADRAO = 'ALBERTINA';

// A categoria própria da madeira dentro da obra (ver CATEGORIAS em
// src/domain.js). Lançar nela já é dizer "isto é madeira" — o nome do
// item nem entra na conta.
export const CATEGORIA_MADEIRAS = 'madeiras';

function chave(valor) {
  return semAcento(valor).replace(/\s+/g, ' ').trim();
}

// nomes exatos da tabela de madeiras
const NOMES_DO_CATALOGO = new Set(CATALOGO_VENDA.map((m) => chave(m.nome)));

// Começos de nome que sempre indicam madeira. São as famílias que já
// existem na tabela da loja; ficaram de fora de propósito as palavras
// genéricas demais ("VISTA", "CINTA"), que sozinhas podem ser outra coisa
// — essas continuam sendo reconhecidas pelo nome exato do catálogo.
const FAMILIAS = [
  'assoalho', 'deck', 'forro', 'ripa', 'taboa', 'tabua', 'prancha',
  'eucalipto', 'moerao', 'moirao', 'palanque', 'espelho beiral', 'frontal',
  'meia cana', 'mata junta', 'montante', 'roda pe', 'rodape', 'travessa',
  'regua de requadro', 'canaleta', 'caibro', 'sarrafo', 'viga de eucalipto',
];

// bitola solta, do jeito que a tabela escreve: 5X10X3M, 10X20X4M, 6X12X3M…
const PADRAO_BITOLA = /^\d{1,3}(,\d)?x\d{1,3}(,\d)?(x\d{1,3}(,\d)?m?)?$/;

// Duas formas de reconhecer madeira:
//
// 1. a categoria "Madeiras" — a partir dela, lançar já é dizer que é
//    madeira, sem depender de como o item foi escrito;
// 2. o nome do item, nas outras categorias de material. Isso continua
//    valendo porque antes da categoria existir a madeira era lançada em
//    "Produtos da Loja"/"Materiais Brutos", e esses lançamentos antigos
//    precisam ser encontrados.
//
// Mão de obra nunca conta: "DECK" ali é o serviço de montar o deck, não a
// compra da madeira.
export function ehMadeira(descricao, categoria) {
  if (categoria === CATEGORIA_MADEIRAS) return true;
  if (categoria === 'mao_de_obra') return false;
  const nome = chave(descricao);
  if (!nome) return false;
  if (NOMES_DO_CATALOGO.has(nome)) return true;
  if (PADRAO_BITOLA.test(nome.replace(/ /g, ''))) return true;
  return FAMILIAS.some((f) => nome === f || nome.startsWith(`${f} `));
}

// Nome do fornecedor das madeiras conforme as Configurações. Em branco
// significa "não vincular nada automaticamente".
export function fornecedorDasMadeiras(config) {
  const nome = config && config.fornecedorMadeiras !== undefined
    ? config.fornecedorMadeiras
    : FORNECEDOR_MADEIRAS_PADRAO;
  return typeof nome === 'string' ? nome.trim() : '';
}

// Lançamentos de madeira que ainda não estão organizados: ou estão fora
// da categoria "Madeiras", ou estão sem o fornecedor anotado. São os de
// antes dessa organização existir.
export function madeirasParaOrganizar(lancamentos, fornecedor) {
  const nome = String(fornecedor || '').trim();
  return lancamentos.filter((l) => {
    if (!ehMadeira(l.descricao, l.categoria)) return false;
    const foraDaCategoria = l.categoria !== CATEGORIA_MADEIRAS;
    const semFornecedor = !String(l.fornecedorNome || '').trim();
    return foraDaCategoria || (semFornecedor && !!nome);
  });
}

// Move esses lançamentos para a categoria "Madeiras" e preenche o
// fornecedor de quem está sem. Não mexe em mais nada: valor, quantidade,
// obra e data continuam iguais, e quem já tem fornecedor anotado mantém o
// que estava lá.
export function organizarMadeiras(lancamentos, fornecedor) {
  const nome = String(fornecedor || '').trim();
  const alvos = new Set(madeirasParaOrganizar(lancamentos, nome).map((l) => l.id));
  if (alvos.size === 0) return lancamentos;
  return lancamentos.map((l) => {
    if (!alvos.has(l.id)) return l;
    const jaTemFornecedor = !!String(l.fornecedorNome || '').trim();
    return {
      ...l,
      categoria: CATEGORIA_MADEIRAS,
      fornecedorNome: jaTemFornecedor ? l.fornecedorNome : nome,
    };
  });
}
