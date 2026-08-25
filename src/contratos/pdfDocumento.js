// Primitivas compartilhadas para gerar documentos em PDF (contrato e
// memorial descritivo). Segue o mesmo estilo dos PDFs que o sistema já
// gera (ver src/obra/gerarPdfResumoObra.js): tudo desenhado com jsPDF, sem
// captura de tela, para o texto continuar selecionável e não depender de
// fontes externas.
import { jsPDF } from 'jspdf';

export const MARGEM = 56;
export const RODAPE_Y = 792;
export const LARGURA_PAGINA = 595; // A4 em pontos

export const COR = {
  verdeEscuro: [22, 101, 52],
  verde: [22, 163, 74],
  cinzaTexto: [51, 48, 46],
  cinzaClaro: [120, 113, 108],
  cinzaMuitoClaro: [168, 162, 158],
  linha: [214, 211, 209],
  fundoSuave: [246, 245, 244],
  preto: [23, 23, 23],
};

export async function carregarLogoBase64() {
  try {
    const resp = await fetch('/logo-casas-eco.jpeg');
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    return null;
  }
}

export function criarDocumento() {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const largura = doc.internal.pageSize.getWidth() - MARGEM * 2;
  return { doc, x: MARGEM, largura, y: MARGEM };
}

export function novaPagina(ctx) {
  ctx.doc.addPage();
  ctx.y = MARGEM;
}

export function garantirEspaco(ctx, altura) {
  if (ctx.y + altura > RODAPE_Y - 24) novaPagina(ctx);
}

export async function cabecalhoDocumento(ctx, { titulo, subtitulo, numero }) {
  const logo = await carregarLogoBase64();
  if (logo) {
    try { ctx.doc.addImage(logo, 'JPEG', ctx.x, ctx.y, 38, 38); } catch (e) { /* segue sem logo */ }
  }
  const offset = logo ? 50 : 0;
  ctx.doc.setFont('helvetica', 'bold');
  ctx.doc.setFontSize(15);
  ctx.doc.setTextColor(...COR.verdeEscuro);
  ctx.doc.text('CASAS ECO', ctx.x + offset, ctx.y + 16);
  ctx.doc.setFont('helvetica', 'normal');
  ctx.doc.setFontSize(8.5);
  ctx.doc.setTextColor(...COR.cinzaClaro);
  if (subtitulo) ctx.doc.text(subtitulo, ctx.x + offset, ctx.y + 30);
  if (numero) {
    ctx.doc.setFont('helvetica', 'bold');
    ctx.doc.setFontSize(9);
    ctx.doc.setTextColor(...COR.cinzaTexto);
    ctx.doc.text(`Nº ${numero}`, ctx.x + ctx.largura, ctx.y + 16, { align: 'right' });
  }
  ctx.y += 50;

  ctx.doc.setDrawColor(...COR.verde);
  ctx.doc.setLineWidth(1.5);
  ctx.doc.line(ctx.x, ctx.y, ctx.x + ctx.largura, ctx.y);
  ctx.y += 28;

  ctx.doc.setFont('helvetica', 'bold');
  ctx.doc.setFontSize(13.5);
  ctx.doc.setTextColor(...COR.preto);
  const linhasTitulo = ctx.doc.splitTextToSize(titulo.toUpperCase(), ctx.largura);
  ctx.doc.text(linhasTitulo, ctx.x + ctx.largura / 2, ctx.y, { align: 'center' });
  ctx.y += linhasTitulo.length * 17 + 18;
}

export function tituloSecao(ctx, texto) {
  garantirEspaco(ctx, 42);
  ctx.y += 6;
  ctx.doc.setFont('helvetica', 'bold');
  ctx.doc.setFontSize(10.5);
  ctx.doc.setTextColor(...COR.verdeEscuro);
  const linhas = ctx.doc.splitTextToSize(texto, ctx.largura);
  ctx.doc.text(linhas, ctx.x, ctx.y);
  ctx.y += linhas.length * 13 + 4;
  ctx.doc.setDrawColor(...COR.linha);
  ctx.doc.setLineWidth(0.5);
  ctx.doc.line(ctx.x, ctx.y, ctx.x + ctx.largura, ctx.y);
  ctx.y += 14;
}

// Escreve um parágrafo respeitando quebras de página no meio do texto.
export function paragrafo(ctx, texto, opcoes = {}) {
  const tamanho = opcoes.tamanho || 9.5;
  const alturaLinha = opcoes.alturaLinha || 14;
  ctx.doc.setFont('helvetica', opcoes.negrito ? 'bold' : 'normal');
  ctx.doc.setFontSize(tamanho);
  ctx.doc.setTextColor(...(opcoes.cor || COR.cinzaTexto));

  // Quebra manual linha a linha (em vez de deixar o jsPDF paginar sozinho)
  // porque só assim dá para inserir página nova no meio de um parágrafo
  // longo sem o texto passar por cima do rodapé.
  const blocos = String(texto).split(/\n/);
  blocos.forEach((bloco) => {
    if (bloco.trim() === '') { ctx.y += alturaLinha * 0.6; return; }
    const linhas = ctx.doc.splitTextToSize(bloco, ctx.largura);
    linhas.forEach((linha) => {
      garantirEspaco(ctx, alturaLinha);
      ctx.doc.text(linha, ctx.x, ctx.y);
      ctx.y += alturaLinha;
    });
  });
  ctx.y += opcoes.espacoDepois != null ? opcoes.espacoDepois : 8;
}

export function linhaChaveValor(ctx, label, valor) {
  if (valor == null || valor === '') return;
  garantirEspaco(ctx, 15);
  ctx.doc.setFont('helvetica', 'normal');
  ctx.doc.setFontSize(9);
  ctx.doc.setTextColor(...COR.cinzaClaro);
  ctx.doc.text(`${label}:`, ctx.x, ctx.y);
  ctx.doc.setFont('helvetica', 'bold');
  ctx.doc.setTextColor(...COR.preto);
  const linhas = ctx.doc.splitTextToSize(String(valor), ctx.largura - 130);
  ctx.doc.text(linhas, ctx.x + 130, ctx.y);
  ctx.y += Math.max(15, linhas.length * 12);
}

export function caixaDestaque(ctx, titulo, linhas) {
  const altura = 22 + linhas.length * 14 + 10;
  garantirEspaco(ctx, altura);
  ctx.doc.setFillColor(...COR.fundoSuave);
  ctx.doc.setDrawColor(...COR.linha);
  ctx.doc.setLineWidth(0.5);
  ctx.doc.roundedRect(ctx.x, ctx.y, ctx.largura, altura, 4, 4, 'FD');
  let yInterno = ctx.y + 17;
  ctx.doc.setFont('helvetica', 'bold');
  ctx.doc.setFontSize(9);
  ctx.doc.setTextColor(...COR.verdeEscuro);
  ctx.doc.text(titulo, ctx.x + 12, yInterno);
  yInterno += 15;
  ctx.doc.setFont('helvetica', 'normal');
  ctx.doc.setFontSize(9);
  ctx.doc.setTextColor(...COR.cinzaTexto);
  linhas.forEach((l) => {
    ctx.doc.text(l, ctx.x + 12, yInterno);
    yInterno += 14;
  });
  ctx.y += altura + 14;
}

// Tabela simples com cabeçalho verde e linhas alternadas.
export function tabela(ctx, colunas, linhas) {
  function cabecalho() {
    garantirEspaco(ctx, 30);
    ctx.doc.setFillColor(...COR.verdeEscuro);
    ctx.doc.rect(ctx.x, ctx.y, ctx.largura, 20, 'F');
    ctx.doc.setFont('helvetica', 'bold');
    ctx.doc.setFontSize(8.5);
    ctx.doc.setTextColor(255, 255, 255);
    colunas.forEach((col) => {
      const px = col.alinhamento === 'right' ? ctx.x + col.offset : ctx.x + col.offset;
      ctx.doc.text(col.titulo, px, ctx.y + 13.5, col.alinhamento === 'right' ? { align: 'right' } : undefined);
    });
    ctx.y += 20;
  }
  cabecalho();

  linhas.forEach((linha, idx) => {
    if (ctx.y + 18 > RODAPE_Y - 24) { novaPagina(ctx); cabecalho(); }
    if (idx % 2 === 1) {
      ctx.doc.setFillColor(...COR.fundoSuave);
      ctx.doc.rect(ctx.x, ctx.y, ctx.largura, 17, 'F');
    }
    ctx.doc.setFont('helvetica', 'normal');
    ctx.doc.setFontSize(8.5);
    ctx.doc.setTextColor(...COR.cinzaTexto);
    colunas.forEach((col) => {
      const valor = String(linha[col.chave] == null ? '' : linha[col.chave]);
      const px = ctx.x + col.offset;
      if (col.negrito) {
        ctx.doc.setFont('helvetica', 'bold');
        ctx.doc.setTextColor(...COR.preto);
      }
      ctx.doc.text(valor, px, ctx.y + 12, {
        ...(col.alinhamento === 'right' ? { align: 'right' } : {}),
        maxWidth: col.largura || undefined,
      });
      if (col.negrito) {
        ctx.doc.setFont('helvetica', 'normal');
        ctx.doc.setTextColor(...COR.cinzaTexto);
      }
    });
    ctx.y += 17;
  });
  ctx.doc.setDrawColor(...COR.linha);
  ctx.doc.setLineWidth(0.5);
  ctx.doc.line(ctx.x, ctx.y, ctx.x + ctx.largura, ctx.y);
  ctx.y += 14;
}

export function blocoAssinaturas(ctx, { cidade, data, contratada, contratante, comTestemunhas }) {
  const alturaNecessaria = comTestemunhas ? 250 : 170;
  garantirEspaco(ctx, alturaNecessaria);
  ctx.y += 20;

  ctx.doc.setFont('helvetica', 'normal');
  ctx.doc.setFontSize(9.5);
  ctx.doc.setTextColor(...COR.cinzaTexto);
  ctx.doc.text(`${cidade || '_______________________'}, ${data}.`, ctx.x, ctx.y);
  ctx.y += 48;

  function assinatura(rotulo, nome, documento) {
    ctx.doc.setDrawColor(...COR.cinzaTexto);
    ctx.doc.setLineWidth(0.7);
    ctx.doc.line(ctx.x, ctx.y, ctx.x + ctx.largura * 0.62, ctx.y);
    ctx.y += 13;
    ctx.doc.setFont('helvetica', 'bold');
    ctx.doc.setFontSize(9);
    ctx.doc.setTextColor(...COR.preto);
    ctx.doc.text(nome || '', ctx.x, ctx.y);
    ctx.y += 12;
    ctx.doc.setFont('helvetica', 'normal');
    ctx.doc.setFontSize(8);
    ctx.doc.setTextColor(...COR.cinzaClaro);
    ctx.doc.text(rotulo + (documento ? ` — ${documento}` : ''), ctx.x, ctx.y);
    ctx.y += 34;
  }

  assinatura('CONTRATADA', contratada.nome, contratada.documento);
  assinatura('CONTRATANTE', contratante.nome, contratante.documento);

  if (comTestemunhas) {
    garantirEspaco(ctx, 110);
    ctx.doc.setFont('helvetica', 'bold');
    ctx.doc.setFontSize(9);
    ctx.doc.setTextColor(...COR.cinzaTexto);
    ctx.doc.text('TESTEMUNHAS', ctx.x, ctx.y);
    ctx.y += 26;
    assinatura('Testemunha 1 — CPF:', '', '');
    assinatura('Testemunha 2 — CPF:', '', '');
  }
}

export function rodapeTodasPaginas(doc, textoEsquerda) {
  const total = doc.internal.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setDrawColor(...COR.linha);
    doc.setLineWidth(0.5);
    doc.line(MARGEM, RODAPE_Y - 12, doc.internal.pageSize.getWidth() - MARGEM, RODAPE_Y - 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...COR.cinzaMuitoClaro);
    doc.text(textoEsquerda, MARGEM, RODAPE_Y);
    doc.text(`página ${p} de ${total}`, doc.internal.pageSize.getWidth() - MARGEM, RODAPE_Y, { align: 'right' });
  }
}

// Nome de arquivo seguro (sem acento/caractere especial).
export function nomeArquivo(prefixo, nome) {
  const limpo = String(nome || 'documento')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
  return `${prefixo}_${limpo}.pdf`;
}
