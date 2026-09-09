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
  // a própria palavra: muita compra é lançada só como "MADEIRA" ou
  // "MADEIRA PARA O TELHADO", sem dizer a peça
  'madeira', 'madeiras', 'madeiramento', 'kit madeira', 'kit de madeira',
  'assoalho', 'deck', 'forro', 'ripa', 'taboa', 'tabua', 'prancha',
  'eucalipto', 'moerao', 'moirao', 'palanque', 'espelho beiral', 'frontal',
  'meia cana', 'mata junta', 'montante', 'roda pe', 'rodape', 'travessa',
  'regua de requadro', 'canaleta', 'caibro', 'sarrafo', 'viga de eucalipto',
];

// bitola solta, do jeito que a tabela escreve: 5X10X3M, 10X20X4M, 6X12X3M…
const PADRAO_BITOLA = /^\d{1,3}(,\d)?x\d{1,3}(,\d)?(x\d{1,3}(,\d)?m?)?$/;

// `categoria` entra na conta porque "DECK" em Mão de obra é o serviço de
// montar o deck, não a compra da madeira — e serviço não é compra da
// distribuidora.
export function ehMadeira(descricao, categoria) {
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

// Lançamentos de madeira que ficaram sem fornecedor (normalmente os
// anteriores a esse vínculo existir).
export function madeirasSemFornecedor(lancamentos) {
  return lancamentos.filter(
    (l) => !String(l.fornecedorNome || '').trim() && ehMadeira(l.descricao, l.categoria)
  );
}

// Preenche o fornecedor só nesses lançamentos, sem tocar em nenhum outro
// nem em quem já tem fornecedor anotado.
export function vincularMadeirasAoFornecedor(lancamentos, fornecedor) {
  const nome = String(fornecedor || '').trim();
  if (!nome) return lancamentos;
  const alvos = new Set(madeirasSemFornecedor(lancamentos).map((l) => l.id));
  if (alvos.size === 0) return lancamentos;
  return lancamentos.map((l) => (alvos.has(l.id) ? { ...l, fornecedorNome: nome } : l));
}

// ---- relatórios: madeira separada das outras categorias ----
//
// Nos RELATÓRIOS de gasto a madeira sai da categoria em que foi lançada e
// vira um grupo próprio. Motivo prático: quase toda madeira é lançada como
// "Produto da Loja", e como é o item mais caro da obra ela inflava esse
// total e escondia o resto — o dono olhava "Produtos da Loja" e via, na
// verdade, madeira.
//
// Isto NÃO muda o lançamento: madeira continua sendo lançada na categoria
// de sempre, e nada no banco é reescrito. É só como o gasto é agrupado na
// hora de mostrar.
export const GRUPO_MADEIRAS = 'madeiras';

export function grupoDeGasto(lancamento) {
  if (!lancamento) return '';
  if (ehMadeira(lancamento.descricao, lancamento.categoria)) return GRUPO_MADEIRAS;
  return lancamento.categoria;
}
