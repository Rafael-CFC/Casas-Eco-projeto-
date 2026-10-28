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

// A seção das madeiras na obra. Era só um grupo de relatório; hoje é uma
// das quatro seções em que se lança (ver CATEGORIAS em src/domain.js).
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

// `categoria` entra na conta por dois motivos:
//
//   * "DECK" em Mão de obra é o serviço de montar o deck, não a compra da
//     madeira — e serviço não é compra da distribuidora;
//   * o que foi lançado NA SEÇÃO Madeiras é madeira por decisão de quem
//     lançou, tenha o nome que tiver. Compra de madeira que ninguém sabe
//     nomear ("CARGA DE MADEIRA", "RESTO DE TELHADO") entra ali e conta
//     como madeira, sem depender da lista de nomes abaixo.
export function ehMadeira(descricao, categoria) {
  if (categoria === 'mao_de_obra') return false;
  if (categoria === CATEGORIA_MADEIRAS) return true;
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

// ---- a seção de quem já foi lançado antes dela existir ----
//
// Hoje madeira tem seção própria e o lançamento novo já nasce nela. O
// lançamento ANTIGO, de quando madeira era lançada dentro de Produtos da
// Loja, é movido pela migração abaixo — mas enquanto ela não rodou (banco
// que voltou de um backup, aba aberta desde antes, gravação que falhou), é
// esta função que põe cada gasto no grupo certo nos relatórios.
//
// `secaoManual` é a exceção que manda em tudo: quando o dono deliberadamente
// lançou um item de nome amadeirado em OUTRA seção — "FORRO PVC" em Produtos
// da Loja é o caso clássico —, a escolha dele vale, e nem a migração nem o
// relatório o puxam de volta para Madeiras.
export const GRUPO_MADEIRAS = CATEGORIA_MADEIRAS;

export function grupoDeGasto(lancamento) {
  if (!lancamento) return '';
  if (lancamento.categoria === CATEGORIA_MADEIRAS) return CATEGORIA_MADEIRAS;
  if (lancamento.secaoManual) return lancamento.categoria;
  if (ehMadeira(lancamento.descricao, lancamento.categoria)) return CATEGORIA_MADEIRAS;
  return lancamento.categoria;
}

// Quem é madeira e está fora da seção Madeiras — o que a migração move.
export function madeirasForaDaSecao(lancamentos) {
  return (lancamentos || []).filter((l) => (
    l
    && l.categoria !== CATEGORIA_MADEIRAS
    && !l.secaoManual
    && ehMadeira(l.descricao, l.categoria)
  ));
}

// Move a madeira já lançada para a seção Madeiras.
//
// Mexe num campo só (`categoria`) e só nos lançamentos que são madeira:
// valor, data, obra, etapa, fornecedor e observação ficam como estavam, e
// o id continua o mesmo — nada é recriado, então nenhum relatório perde o
// histórico. Roda toda vez que os dados são carregados, de propósito: é
// assim que um backup restaurado de antes da seção existir também entra no
// lugar certo. Quem já está na seção não é tocado, então rodar de novo não
// faz nada.
export function migrarMadeirasParaSecao(lancamentos) {
  const alvos = new Set(madeirasForaDaSecao(lancamentos).map((l) => l.id));
  if (alvos.size === 0) return { lista: lancamentos || [], movidos: 0 };
  return {
    lista: (lancamentos || []).map((l) => (
      alvos.has(l.id) ? { ...l, categoria: CATEGORIA_MADEIRAS } : l
    )),
    movidos: alvos.size,
  };
}
