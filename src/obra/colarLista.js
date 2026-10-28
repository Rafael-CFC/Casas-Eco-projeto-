// Ler uma lista de compra colada de qualquer jeito.
//
// A listagem da madeireira chega em papel, em PDF ou no WhatsApp. Digitar
// item por item na tela da obra é onde o tempo se perde e onde o número
// sai errado. Aqui o dono cola o texto inteiro, do jeito que veio, e o
// sistema separa descrição, quantidade e preço de cada linha para ele só
// conferir.
//
// Funções puras: recebem TEXTO e devolvem objetos. Não gravam nada e não
// decidem nada sozinhas — quem lança é o dono, na tela, depois de olhar.
//
// Duas garantias que o leitor dá:
//
//   1. nada some calado. Linha que não vira item (cabeçalho, rodapé,
//      total, lixo) volta na lista de ignoradas, com o motivo, para a
//      tela mostrar;
//   2. quando a lista traz o total dela ("Valor dos produtos: 5.914,00"),
//      ele é devolvido à parte, para a tela comparar com a soma do que
//      foi lido. Lista que não fecha é lista que foi lida errado.
import { parsePrecoBR } from '../domain';

// Unidades que aparecem numa compra de material. Entram como COLUNA
// solta ("... UN 5,00 90,00"), não como parte do nome — "3,00 MT" no meio
// da descrição é o tamanho da peça e continua no nome.
const UNIDADES = new Set([
  'un', 'und', 'unid', 'unidade', 'pc', 'pç', 'pcs', 'pçs', 'peca', 'peça', 'pecas', 'peças',
  'm', 'm2', 'm²', 'm3', 'm³', 'mt', 'ml', 'cm', 'kg', 'g', 'ton', 't',
  'sc', 'saco', 'sacos', 'cx', 'caixa', 'lt', 'l', 'litro', 'litros',
  'br', 'barra', 'barras', 'rl', 'rolo', 'rolos', 'fd', 'fardo', 'par', 'jg', 'kit',
]);

// Linhas que são papelada, não compra. Conferidas no COMEÇO da linha, sem
// acento e sem caixa.
const COMECOS_IGNORADOS = [
  'cod', 'codigo', 'descricao', 'discriminacao', 'dados do cliente', 'cliente', 'cidade',
  'cpf', 'cnpj', 'ie:', 'cep', 'fone', 'telefone', 'e-mail', 'email', 'endereco', 'rodovia',
  'data', 'vendedor', 'observacao', 'observacoes', 'forma de pagamento', 'valor pago',
  'limite de compra', 'saldo devedor', 'nº venda', 'n venda', 'no venda', 'numero da venda',
  'qtde total', 'quantidade total', 'total de itens', 'subtotal', 'sub-total',
  'valor dos produtos', 'valor descontos', 'valor desconto', 'valor acrescimos',
  'valor total', 'total geral', 'total:', 'total ', 'desconto', 'acrescimo', 'frete:',
  'madeireira', 'imbituba', 'un.', 'qtde', 'valor unitario', 'valor unitário',
];

// Linha cuja DESCRIÇÃO inteira é só isto não é compra: é a forma de
// pagamento do rodapé ("PIX   5.620,00"), que de outro jeito viraria um
// item de R$ 5.620,00 — o erro mais caro que o leitor podia cometer.
// Confere a descrição inteira, não o começo: item chamado "PIX CARGNIN"
// (se existisse) continua valendo.
const DESCRICOES_IGNORADAS = new Set([
  'pix', 'dinheiro', 'especie', 'em especie', 'cartao', 'cartao de credito',
  'cartao de debito', 'credito', 'debito', 'boleto', 'boletos', 'cheque', 'cheques',
  'transferencia', 'ted', 'doc', 'deposito', 'a vista', 'avista', 'a prazo', 'prazo',
  'parcelado', 'troco', 'total', 'subtotal', 'soma',
]);

// Linhas de onde se tira o total declarado da lista (para conferência).
// "Valor dos produtos" vem primeiro de propósito: é a soma dos itens, que
// é o que dá para comparar. "Valor total" já pode estar com desconto
// aplicado, e aí nunca bateria com a soma das linhas.
const ROTULOS_DE_TOTAL = [
  'valor dos produtos', 'valor dos itens', 'total dos produtos',
  'valor total', 'total geral', 'total da nota', 'total:',
];

// O desconto da compra inteira. O lançamento da obra não tem onde guardar
// isso (é quantidade × preço), então o leitor não o espalha nos itens: ele
// devolve o número para a tela avisar, e o dono decide o que fazer.
const ROTULOS_DE_DESCONTO = ['valor descontos', 'valor desconto', 'descontos', 'desconto'];

function semAcentoBaixo(v) {
  return String(v == null ? '' : v)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().trim();
}

// Um token é número quando é SÓ número, no jeito brasileiro ou no inglês:
// 5 · 5,00 · 4.104,00 · 108.50 · 1,5. "18A22" e "3m" não são — são parte
// do nome da peça.
function ehNumero(token) {
  return /^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(token)   // 4.104,00
    || /^-?\d+(,\d+)?$/.test(token)                    // 5  ·  5,00
    || /^-?\d+(\.\d+)?$/.test(token);                  // 5  ·  90.50
}

function numeroDe(token) {
  const n = parsePrecoBR(token);
  return Number.isFinite(n) ? n : 0;
}

function ehUnidade(token) {
  return UNIDADES.has(semAcentoBaixo(token).replace(/\.$/, ''));
}

// Código de produto da madeireira: só dígitos e comprido (000350). O
// número curto do começo da linha é quantidade ("5 TÁBUA..."), não código.
function ehCodigoDeProduto(token) {
  return /^\d{4,}$/.test(token);
}

// O número que vem logo depois do rótulo. Numa nota impressa o rodapé
// inteiro costuma colar numa linha só ("Valor dos produtos: 5.914,00
// Valor descontos: 294,00 ... Valor total: 5.620,00"), então pegar o
// primeiro número DEPOIS do rótulo é o que separa um do outro.
function numeroDepoisDoRotulo(linha, rotulos) {
  const chave = semAcentoBaixo(linha);
  let melhor = null;
  rotulos.forEach((rotulo, posicao) => {
    const onde = chave.indexOf(rotulo);
    if (onde < 0) return;
    const depois = linha.slice(onde + rotulo.length);
    const numero = depois.split(/[\s\t;|]+/).filter(ehNumero)[0];
    if (numero === undefined) return;
    // o rótulo mais específico (mais acima na lista) ganha
    if (melhor === null || posicao < melhor.posicao) {
      melhor = { posicao, valor: numeroDe(numero) };
    }
  });
  return melhor ? melhor.valor : null;
}

// ---- uma linha ----
//
// O formato não é fixo de propósito. Os dois que aparecem na prática:
//
//   nota impressa:  000350  EUCALIPTO ... 3,00 MT  UN  5,00  90,00  0,00  450,00
//   escrito à mão:  5 eucalipto 18a22 3m 90,00
//
// A regra que cobre os dois: os números do FIM da linha são as colunas
// (quantidade, valor unitário, desconto, total) e o que sobra na frente é
// o nome da peça. Número solto no começo é quantidade.
export function lerLinha(linha) {
  const bruto = String(linha == null ? '' : linha).replace(/\s+/g, ' ').trim();
  if (!bruto) return { ignorada: true, motivo: 'linha vazia', bruto };

  const chave = semAcentoBaixo(bruto);
  if (COMECOS_IGNORADOS.some((c) => chave.startsWith(c))) {
    return { ignorada: true, motivo: 'cabeçalho ou rodapé da lista', bruto };
  }

  let tokens = bruto.split(/[\s\t;|]+/).filter(Boolean);
  if (tokens.length === 0) return { ignorada: true, motivo: 'linha vazia', bruto };

  // código de produto na frente é informação da madeireira, não do gasto
  if (ehCodigoDeProduto(tokens[0]) && tokens.length > 1) tokens = tokens.slice(1);

  // quantidade escrita na frente do nome
  let qtdNaFrente = null;
  if (tokens.length > 1 && ehNumero(tokens[0]) && !ehCodigoDeProduto(tokens[0])) {
    qtdNaFrente = numeroDe(tokens[0]);
    tokens = tokens.slice(1);
    // "5 UN TÁBUA..." — a unidade pode vir logo depois da quantidade
    if (tokens.length > 1 && ehUnidade(tokens[0])) {
      var unidadeDaFrente = tokens[0];
      tokens = tokens.slice(1);
    }
  }

  // os números do fim
  const numerosFim = [];
  while (tokens.length > 0 && ehNumero(tokens[tokens.length - 1])) {
    numerosFim.unshift(numeroDe(tokens.pop()));
  }

  // a unidade como coluna, logo antes dos números
  let unidade = unidadeDaFrente || '';
  if (!unidade && tokens.length > 1 && ehUnidade(tokens[tokens.length - 1])) {
    unidade = tokens.pop();
  }

  const descricao = tokens.join(' ').replace(/[\s,;:-]+$/, '').trim();
  if (!descricao) {
    return { ignorada: true, motivo: 'linha só com números, sem nome do item', bruto };
  }
  if (DESCRICOES_IGNORADAS.has(semAcentoBaixo(descricao))) {
    return { ignorada: true, motivo: 'forma de pagamento ou total, não é item', bruto };
  }
  if (numerosFim.length === 0 && qtdNaFrente === null) {
    return { ignorada: true, motivo: 'linha sem número nenhum', bruto };
  }

  // ---- quem é quantidade e quem é preço ----
  let quantidade = qtdNaFrente;
  let preco = null;
  let aviso = '';

  if (quantidade === null) {
    if (numerosFim.length >= 3) {
      // nota impressa: qtd, unitário, (desconto), total. O total confere a
      // leitura: 5 × 90 = 450. Sem isso seria chute.
      const [a, b] = numerosFim;
      const ultimo = numerosFim[numerosFim.length - 1];
      quantidade = a;
      preco = b;
      if (Math.abs(a * b - ultimo) > 0.01) {
        aviso = 'as colunas não fecham com o total da linha — confira';
      }
    } else if (numerosFim.length === 2) {
      [quantidade, preco] = numerosFim;
    } else {
      quantidade = 1;
      preco = numerosFim[0];
      aviso = 'sem quantidade na linha — lancei 1';
    }
  } else if (numerosFim.length >= 2) {
    // "5 TÁBUA 90,00 450,00" — o último confere
    preco = numerosFim[0];
    const ultimo = numerosFim[numerosFim.length - 1];
    if (Math.abs(quantidade * preco - ultimo) > 0.01) {
      aviso = 'as colunas não fecham com o total da linha — confira';
    }
  } else if (numerosFim.length === 1) {
    preco = numerosFim[0];
  } else {
    preco = 0;
    aviso = 'sem valor na linha';
  }

  if (!(quantidade > 0)) { quantidade = 1; aviso = aviso || 'quantidade inválida — lancei 1'; }
  if (!(preco > 0)) { preco = 0; aviso = aviso || 'sem valor na linha'; }

  return {
    ignorada: false,
    bruto,
    descricao,
    unidade: unidade ? unidade.toUpperCase().replace(/\.$/, '') : 'UN',
    quantidade,
    preco,
    total: quantidade * preco,
    aviso,
  };
}

// ---- a lista inteira ----
export function lerListaColada(texto) {
  const linhas = String(texto == null ? '' : texto).split(/\r?\n/);
  const itens = [];
  const ignoradas = [];
  let totalDeclarado = null;
  let descontoDeclarado = null;

  linhas.forEach((linha, i) => {
    const total = numeroDepoisDoRotulo(linha, ROTULOS_DE_TOTAL);
    if (total !== null && totalDeclarado === null) totalDeclarado = total;
    const desconto = numeroDepoisDoRotulo(linha, ROTULOS_DE_DESCONTO);
    if (desconto !== null && desconto > 0 && descontoDeclarado === null) descontoDeclarado = desconto;

    const lido = lerLinha(linha);
    if (lido.ignorada) {
      if (lido.motivo !== 'linha vazia') ignoradas.push({ linha: i + 1, ...lido });
      return;
    }
    itens.push({ id: `linha-${i + 1}`, ...lido });
  });

  const somaItens = itens.reduce((a, it) => a + it.total, 0);
  return {
    itens,
    ignoradas,
    totalDeclarado,
    descontoDeclarado,
    somaItens,
    // Só compara quando a própria lista disse o total dela.
    fecha: totalDeclarado === null ? null : Math.abs(somaItens - totalDeclarado) < 0.01,
  };
}
