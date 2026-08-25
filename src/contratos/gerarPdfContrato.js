// Gera o PDF do CONTRATO e do MEMORIAL DESCRITIVO reproduzindo o
// documento que a Casas Eco já usa: mesma sequência de parágrafos, mesma
// tabela de parcelas e mesmo bloco de assinaturas.
//
// O conteúdo vem inteiro do modelo salvo (src/contratos/modeloCasasEco.js
// + edições feitas em Configurações). Aqui só cuidamos do desenho.
import { jsPDF } from 'jspdf';
import { formatMoney } from '../domain';
import { blocosContratoResolvidos, blocosMemorialResolvidos, montarValoresMarcadores } from './contratosStore';

const MARGEM = 62;
const RODAPE_Y = 800;
const ALTURA_LINHA = 13.5;
const TAMANHO_TEXTO = 10;

const COR = {
  preto: [0, 0, 0],
  cinza: [90, 90, 90],
  linha: [160, 160, 160],
  fundoTabela: [242, 242, 242],
};

function criar() {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const largura = doc.internal.pageSize.getWidth() - MARGEM * 2;
  return { doc, x: MARGEM, largura, y: MARGEM };
}

// A fonte padrão do PDF (Helvetica) só desenha os caracteres da tabela
// WinAnsi. Qualquer coisa fora dela — bolinhas, aspas curvas, reticências
// de um texto colado do Word — sairia como lixo na página. Aqui trocamos
// esses caracteres por equivalentes que a fonte tem.
const SUBSTITUICOES = {
  '\u25cf': '\u2022', '\u25cb': '\u2022', '\u25aa': '\u2022', '\u25e6': '\u2022',
  '\u2018': "'", '\u2019': "'", '\u201a': "'",
  '\u201c': '"', '\u201d': '"', '\u201e': '"',
  '\u2026': '...', '\u00a0': ' ', '\u200b': '',
  '\u2212': '-', '\u2010': '-', '\u2011': '-', '\u2713': 'v',
};

function limparTexto(texto) {
  return String(texto == null ? '' : texto)
    .replace(/[\u25cf\u25cb\u25aa\u25e6\u2018\u2019\u201a\u201c\u201d\u201e\u2026\u00a0\u200b\u2212\u2010\u2011\u2713]/g,
      (c) => (SUBSTITUICOES[c] !== undefined ? SUBSTITUICOES[c] : c))
    // qualquer outro caractere que a fonte nao tem vira "?" em vez de lixo
    .replace(/[^\n\u0020-\u00ff\u2013\u2014\u2022]/g, '?');
}

function garantirEspaco(ctx, altura) {
  if (ctx.y + altura > RODAPE_Y) {
    ctx.doc.addPage();
    ctx.y = MARGEM;
  }
}

// Rótulo que fica em negrito no começo do parágrafo. É fechado de
// propósito (só o nome da cláusula/parágrafo até os dois pontos) — uma
// regra mais solta engolia a frase inteira até um "agência:" no meio do
// texto e o documento saía errado.
const REGEX_ROTULO = /^((?:CL[ÁA]USULA\s+\w+|Par[áa]grafo\s+\w+(?:\s*[–—-]\s*[^:;]{0,45})?|Obs\.?|Observação)\s*[:;])/i;

// Escreve texto com quebra de linha e de página, destacando em negrito o
// rótulo inicial (ex.: "CLAUSULA PRIMEIRA:"). O texto é desenhado sempre a
// partir da linha original, sem remontar espaços, para o documento sair
// caractere por caractere igual ao modelo.
function escreverParagrafo(ctx, texto, opcoes = {}) {
  const tamanho = opcoes.tamanho || TAMANHO_TEXTO;
  const recuo = opcoes.recuo || 0;
  const larguraUtil = ctx.largura - recuo;
  ctx.doc.setFontSize(tamanho);
  ctx.doc.setTextColor(...(opcoes.cor || COR.preto));

  limparTexto(texto).split('\n').forEach((bloco) => {
    if (bloco.trim() === '') { ctx.y += ALTURA_LINHA * 0.5; return; }

    const m = opcoes.semDestaque ? null : bloco.match(REGEX_ROTULO);
    const prefixo = m ? m[1] : '';

    // O negrito é mais largo que o normal: desconta essa diferença da
    // largura na hora de quebrar as linhas, senão a primeira linha
    // estouraria a margem direita.
    let descontoBold = 0;
    if (prefixo) {
      ctx.doc.setFont('helvetica', 'bold');
      const wBold = ctx.doc.getTextWidth(prefixo);
      ctx.doc.setFont('helvetica', 'normal');
      descontoBold = Math.max(0, wBold - ctx.doc.getTextWidth(prefixo));
    }

    ctx.doc.setFont('helvetica', 'normal');
    const linhas = ctx.doc.splitTextToSize(bloco, larguraUtil - descontoBold);

    // Só destaca se o rótulo couber inteiro na primeira linha — do
    // contrário o texto sairia duplicado.
    const podeDestacar = !!prefixo && linhas.length > 0 && linhas[0].length >= prefixo.length;

    linhas.forEach((linha, i) => {
      garantirEspaco(ctx, ALTURA_LINHA);
      if (i === 0 && podeDestacar) {
        const parteNegrito = linha.slice(0, prefixo.length);
        const parteNormal = linha.slice(prefixo.length);
        ctx.doc.setFont('helvetica', 'bold');
        ctx.doc.text(parteNegrito, ctx.x + recuo, ctx.y);
        const larguraNegrito = ctx.doc.getTextWidth(parteNegrito);
        ctx.doc.setFont('helvetica', 'normal');
        if (parteNormal) ctx.doc.text(parteNormal, ctx.x + recuo + larguraNegrito, ctx.y);
      } else {
        ctx.doc.setFont('helvetica', opcoes.negrito ? 'bold' : 'normal');
        ctx.doc.text(linha, ctx.x + recuo, ctx.y);
      }
      ctx.y += ALTURA_LINHA;
    });
  });
  ctx.y += opcoes.espacoDepois != null ? opcoes.espacoDepois : 9;
}

function escreverLista(ctx, texto) {
  ctx.doc.setFontSize(TAMANHO_TEXTO);
  ctx.doc.setFont('helvetica', 'normal');
  ctx.doc.setTextColor(...COR.preto);
  limparTexto(texto).split('\n').filter((l) => l.trim()).forEach((item) => {
    const linhas = ctx.doc.splitTextToSize(item.trim(), ctx.largura - 22);
    linhas.forEach((linha, i) => {
      garantirEspaco(ctx, ALTURA_LINHA);
      if (i === 0) ctx.doc.text('•', ctx.x + 6, ctx.y);
      ctx.doc.text(linha, ctx.x + 22, ctx.y);
      ctx.y += ALTURA_LINHA;
    });
    ctx.y += 3;
  });
  ctx.y += 6;
}

// Tabela de parcelas: Parcela N | valor | etapa — como no documento atual.
function escreverTabelaParcelas(ctx, parcelas) {
  const alturaLinha = 26;
  garantirEspaco(ctx, alturaLinha * Math.min(parcelas.length, 3) + 10);
  const colValor = ctx.x + ctx.largura * 0.42;
  const colEtapa = ctx.x + ctx.largura * 0.70;

  parcelas.forEach((p, i) => {
    garantirEspaco(ctx, alturaLinha);
    if (i % 2 === 1) {
      ctx.doc.setFillColor(...COR.fundoTabela);
      ctx.doc.rect(ctx.x, ctx.y - 13, ctx.largura, alturaLinha, 'F');
    }
    ctx.doc.setDrawColor(...COR.linha);
    ctx.doc.setLineWidth(0.4);
    ctx.doc.rect(ctx.x, ctx.y - 13, ctx.largura, alturaLinha, 'S');
    ctx.doc.line(colValor, ctx.y - 13, colValor, ctx.y - 13 + alturaLinha);
    ctx.doc.line(colEtapa, ctx.y - 13, colEtapa, ctx.y - 13 + alturaLinha);

    ctx.doc.setFontSize(TAMANHO_TEXTO);
    ctx.doc.setTextColor(...COR.preto);
    ctx.doc.setFont('helvetica', 'normal');
    ctx.doc.text(`Parcela ${p.ordem}`, ctx.x + 14, ctx.y + 4);
    ctx.doc.setFont('helvetica', 'bold');
    ctx.doc.text(
      `R$${(Number(p.valor) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      colValor + 14, ctx.y + 4
    );
    ctx.doc.setFont('helvetica', 'normal');
    ctx.doc.text(limparTexto(p.etapa), colEtapa + 12, ctx.y + 4, { maxWidth: ctx.largura - (colEtapa - ctx.x) - 18 });
    ctx.y += alturaLinha;
  });
  ctx.y += 14;
}

function escreverAssinaturas(ctx, { cidadeData, nomeContratada, nomeContratante }) {
  garantirEspaco(ctx, 120);
  ctx.y += 24;
  ctx.doc.setFont('helvetica', 'normal');
  ctx.doc.setFontSize(TAMANHO_TEXTO);
  ctx.doc.setTextColor(...COR.preto);
  ctx.doc.text(limparTexto(cidadeData), ctx.x, ctx.y);
  ctx.y += 56;

  const larguraLinha = ctx.largura * 0.42;
  const xDireita = ctx.x + ctx.largura - larguraLinha;
  ctx.doc.setDrawColor(...COR.preto);
  ctx.doc.setLineWidth(0.7);
  ctx.doc.line(ctx.x, ctx.y, ctx.x + larguraLinha, ctx.y);
  ctx.doc.line(xDireita, ctx.y, xDireita + larguraLinha, ctx.y);
  ctx.y += 14;
  ctx.doc.text(limparTexto(nomeContratada), ctx.x, ctx.y);
  ctx.doc.text(limparTexto(nomeContratante), xDireita, ctx.y);
  ctx.y += 24;
}

// ---- CONTRATO ----
function escreverContrato(ctx, contrato, config) {
  const blocos = blocosContratoResolvidos(contrato, config);
  const valores = montarValoresMarcadores(contrato, config);
  const contratada = contrato.contratadaSnapshot || config.contratada || {};

  ctx.doc.setFont('helvetica', 'bold');
  ctx.doc.setFontSize(13);
  ctx.doc.setTextColor(...COR.preto);
  ctx.doc.text('CONTRATO PARTICULAR DE COMPRA E VENDA', ctx.x + ctx.largura / 2, ctx.y + 6, { align: 'center' });
  ctx.y += 34;

  blocos.forEach((b) => {
    if (b.tabelaParcelas) { escreverTabelaParcelas(ctx, contrato.parcelas || []); return; }
    if (b.lista) { escreverLista(ctx, b.texto); return; }
    escreverParagrafo(ctx, b.texto);
  });

  escreverAssinaturas(ctx, {
    cidadeData: valores['{{CIDADE_DATA}}'],
    nomeContratada: contratada.representante,
    nomeContratante: contrato.cliente.nome,
  });
}

// ---- MEMORIAL ----
function escreverMemorial(ctx, contrato, config) {
  const blocos = blocosMemorialResolvidos(contrato, config);
  const valores = montarValoresMarcadores(contrato, config);
  const contratada = contrato.contratadaSnapshot || config.contratada || {};

  ctx.doc.setFont('helvetica', 'bold');
  ctx.doc.setFontSize(13);
  ctx.doc.setTextColor(...COR.preto);
  ctx.doc.text('MEMORIAL DESCRITIVO', ctx.x + ctx.largura / 2, ctx.y + 6, { align: 'center' });
  ctx.y += 34;

  blocos.forEach((b) => {
    if (b.titulo) {
      garantirEspaco(ctx, 26);
      ctx.doc.setFont('helvetica', 'bold');
      ctx.doc.setFontSize(TAMANHO_TEXTO);
      ctx.doc.setTextColor(...COR.preto);
      // marcador desenhado como círculo: a fonte padrão do PDF (Helvetica)
      // não tem o caractere "●" e ele sairia como lixo na página
      ctx.doc.setFillColor(...COR.preto);
      ctx.doc.circle(ctx.x + 9, ctx.y - 3, 2.4, 'F');
      ctx.doc.text(limparTexto(b.titulo), ctx.x + 22, ctx.y);
      ctx.y += ALTURA_LINHA + 2;
      escreverParagrafo(ctx, b.texto, { semDestaque: true });
    } else {
      escreverParagrafo(ctx, b.texto, { semDestaque: true });
    }
  });

  escreverAssinaturas(ctx, {
    cidadeData: valores['{{CIDADE_DATA}}'],
    nomeContratada: contratada.representante,
    nomeContratante: contrato.cliente.nome,
  });
}

function nomeArquivo(prefixo, nome) {
  const limpo = String(nome || 'documento')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return `${prefixo}_${limpo}.pdf`;
}

export async function gerarPdfContrato(contrato, config) {
  const ctx = criar();
  escreverContrato(ctx, contrato, config);
  ctx.doc.save(nomeArquivo('contrato', contrato.cliente.nome));
}

export async function gerarPdfMemorial(contrato, config) {
  const ctx = criar();
  escreverMemorial(ctx, contrato, config);
  ctx.doc.save(nomeArquivo('memorial', contrato.cliente.nome));
}

export async function gerarPdfContratoEMemorial(contrato, config) {
  const ctx = criar();
  escreverContrato(ctx, contrato, config);
  ctx.doc.addPage();
  ctx.y = MARGEM;
  escreverMemorial(ctx, contrato, config);
  ctx.doc.save(nomeArquivo('contrato_e_memorial', contrato.cliente.nome));
}
