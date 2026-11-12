// Ler uma NOTA inteira a partir de texto: fornecedor, data, número,
// itens e total — e dizer se essa nota já foi lançada.
//
// De onde vem o texto: do e-mail da distribuidora, do PDF da nota, do
// WhatsApp do vendedor, ou de uma foto lida por um modelo de visão
// (quando houver chave configurada — ver src/ia/cliente.js). O leitor
// aqui não se importa com a origem: ele recebe texto e devolve a nota
// montada para o dono conferir.
//
// A leitura dos ITENS é a mesma da lista colada (src/obra/colarLista.js),
// com as mesmas travas: a multiplicação de cada linha é conferida, e a
// soma dos itens é comparada com o total que a nota declara. Linha que
// não fecha vem marcada em vez de entrar calada — é o que protege o
// gasto da obra de um número lido errado.
//
// Funções puras: sem React, sem rede, sem banco.
import { lerListaColada } from '../obra/colarLista';
import { semAcento } from '../textUtils';

const k = (t) => semAcento(t).replace(/\s+/g, ' ').trim();

// ---- fornecedor ----
//
// O nome costuma estar nas primeiras linhas, em caixa alta e com a forma
// jurídica junto. Também aceitamos a linha escrita "Fornecedor: X".
const FORMAS = /\b(ltda|me\b|epp|eireli|s\/?a\b|comercio|comércio|distribuidora|madeireira|deposito|depósito|materiais)\b/i;

export function acharFornecedor(texto) {
  const linhas = String(texto || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const rotulado = linhas.find((l) => /^(fornecedor|emitente|razao social|razão social)\s*:/i.test(l));
  if (rotulado) return rotulado.split(':').slice(1).join(':').trim();
  // primeira linha com cara de nome de empresa
  const candidata = linhas.slice(0, 8).find((l) => FORMAS.test(l) && l.length >= 6 && !/^cnpj/i.test(l));
  return candidata ? candidata.replace(/\s{2,}/g, ' ').trim() : '';
}

// A nota traz a razão social inteira ("MADEIREIRA IRMAOS CARGNIN LTDA");
// no sistema a distribuidora já existe com o nome curto ("MADEIREIRA
// CARGNIN"). Se deixar o nome da nota entrar, viram duas distribuidoras
// para a mesma empresa e o histórico racha em dois.
//
// A regra é estreita de propósito: só casa quando as palavras que
// importam de um nome estão TODAS dentro do outro. Assim
// "MADEIREIRA CARGNIN" casa com "MADEIREIRA IRMAOS CARGNIN LTDA", e
// "DEPOSITO SAO JOSE" NÃO casa com "DEPOSITO SAO PEDRO" — que é o erro
// que dobraria o gasto no lugar errado.
const FORMA_JURIDICA = new Set(['ltda', 'me', 'epp', 'eireli', 'sa', 's/a', 'cia', 'mei']);

function palavrasQueImportam(nome) {
  return k(nome).toLowerCase().split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3 && !FORMA_JURIDICA.has(w));
}

export function casarFornecedor(nomeLido, nomesConhecidos) {
  const lido = palavrasQueImportam(nomeLido);
  if (lido.length === 0) return '';
  for (const conhecido of nomesConhecidos || []) {
    const dele = palavrasQueImportam(conhecido);
    if (dele.length === 0) continue;
    const dentroDoLido = dele.every((w) => lido.includes(w));
    const dentroDoConhecido = lido.every((w) => dele.includes(w));
    if (dentroDoLido || dentroDoConhecido) return conhecido;
  }
  return '';
}

// ---- CNPJ ----
export function acharCNPJ(texto) {
  const m = String(texto || '').match(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/);
  return m ? m[0].replace(/\D/g, '') : '';
}

// ---- data ----
//
// Prefere a data de EMISSÃO quando ela está rotulada; senão, a primeira
// data que aparecer. Converte para o formato que o sistema usa.
function paraISO(dia, mes, ano) {
  const a = ano.length === 2 ? `20${ano}` : ano;
  return `${a}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
}

export function acharData(texto) {
  const t = String(texto || '');
  const rotulada = t.match(/(?:emiss[aã]o|emitid[ao] em|data da venda)\D{0,12}(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/i);
  if (rotulada) return paraISO(rotulada[1], rotulada[2], rotulada[3]);
  const qualquer = t.match(/\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})\b/);
  return qualquer ? paraISO(qualquer[1], qualquer[2], qualquer[3]) : '';
}

// ---- número da nota / venda ----
export function acharNumero(texto) {
  // "Nº venda 15592", "NF 000123", "Nota fiscal 998", "Pedido 4421".
  // O \b antes de nfe? é o que faz "NF 000123" casar: sem ele, o "n"
  // era comido pela primeira alternativa e sobrava só o "F".
  const m = String(texto || '').match(
    /(?:\bn[ºo°]?\s*(?:da\s*)?(?:venda|nota|nf|nfe|pedido|documento)|\bnfe?\b|\bvenda\b|\bnota fiscal\b|\bpedido\b)\D{0,8}(\d{3,12})/i
  );
  return m ? m[1] : '';
}

// ---- a nota inteira ----
export function lerNotaDeTexto(texto) {
  const lista = lerListaColada(texto);
  const fornecedor = acharFornecedor(texto);
  return {
    fornecedor,
    cnpj: acharCNPJ(texto),
    data: acharData(texto),
    numero: acharNumero(texto),
    itens: lista.itens,
    ignoradas: lista.ignoradas,
    totalDeclarado: lista.totalDeclarado,
    descontoDeclarado: lista.descontoDeclarado,
    somaItens: lista.somaItens,
    fecha: lista.fecha,
  };
}

// ---- nota repetida ----
//
// Evitar lançar a mesma compra duas vezes. Três sinais, do mais forte
// para o mais fraco:
//
//   1. o NÚMERO da nota já aparece na observação de algum lançamento
//      (é assim que o sistema registra de onde veio a compra);
//   2. mesmo fornecedor, mesma data e mesmo total;
//   3. mesmo fornecedor e mesmo total em datas próximas (até 3 dias) —
//      este só AVISA, porque comprar duas vezes o mesmo valor acontece.
export function notaJaLancada(lancamentos, nota) {
  const lista = lancamentos || [];
  const numero = String(nota.numero || '').trim();

  if (numero) {
    const marca = new RegExp(`\\b${numero}\\b`);
    const achou = lista.filter((l) => l && marca.test(String(l.observacao || '')));
    if (achou.length > 0) {
      return { repetida: true, certeza: 'alta', motivo: `a nota ${numero} já aparece em ${achou.length} lançamento(s)`, lancamentos: achou };
    }
  }

  const forn = k(nota.fornecedor || '');
  const total = Number(nota.somaItens) || 0;
  if (!forn || total <= 0) return { repetida: false };

  const mesmoFornecedor = lista.filter((l) => l && k(l.fornecedorNome || '') === forn);
  if (mesmoFornecedor.length === 0) return { repetida: false };

  // soma por data, para comparar compra com compra
  const porData = new Map();
  mesmoFornecedor.forEach((l) => {
    const d = String(l.data || '');
    porData.set(d, (porData.get(d) || 0) + (Number(l.total) || 0));
  });

  const perto = (a, b) => Math.abs(a - b) < 0.01;
  for (const [data, soma] of porData) {
    if (!perto(soma, total)) continue;
    if (data === nota.data) {
      return { repetida: true, certeza: 'alta', motivo: `já existe uma compra de ${forn} nesse dia com o mesmo total`, data };
    }
    const dias = nota.data && data
      ? Math.abs((new Date(`${data}T00:00:00`) - new Date(`${nota.data}T00:00:00`)) / 86400000)
      : 99;
    if (dias <= 3) {
      return { repetida: true, certeza: 'baixa', motivo: `há uma compra de ${forn} com o mesmo total em ${data}`, data };
    }
  }
  return { repetida: false };
}
