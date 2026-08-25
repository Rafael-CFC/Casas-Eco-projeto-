// Geração do "Relatório de Boletos" em PDF. Mesmo estilo visual/estrutura
// de src/obra/gerarPdfResumoObra.js (cores, cursor ctx, paginação, logo).
import { jsPDF } from 'jspdf';
import { formatMoney, formatDateBR } from '../domain';

const MARGEM = 40;
const RODAPE_Y = 800;

const COR = {
  verdeEscuro: [22, 101, 52],
  cinzaTexto: [68, 64, 60],
  cinzaClaro: [120, 113, 108],
  cinzaMuitoClaro: [168, 162, 158],
  linha: [231, 229, 228],
  fundoVerde: [240, 253, 244],
  preto: [28, 25, 23],
};

async function carregarLogoBase64() {
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

function quebrarPaginaSeNecessario(ctx, alturaNecessaria) {
  if (ctx.y + alturaNecessaria > RODAPE_Y - 10) {
    ctx.doc.addPage();
    ctx.y = MARGEM;
  }
}

function linhaChaveValor(ctx, label, valor) {
  quebrarPaginaSeNecessario(ctx, 16);
  ctx.doc.setFont('helvetica', 'normal');
  ctx.doc.setFontSize(9.5);
  ctx.doc.setTextColor(...COR.cinzaClaro);
  ctx.doc.text(label, ctx.x, ctx.y);
  ctx.doc.setFont('helvetica', 'bold');
  ctx.doc.setTextColor(...COR.preto);
  ctx.doc.text(String(valor), ctx.x + ctx.largura, ctx.y, { align: 'right' });
  ctx.y += 15;
}

// boletosFiltrados: array já filtrado pela tela. resumoFiltros: string curta
// descrevendo os filtros aplicados (ou null). totais: { aPagar, vencidos,
// pagosNoMes, quantidade }.
export async function gerarRelatorioBoletos({ boletosFiltrados, resumoFiltros, totais }) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const larguraPagina = doc.internal.pageSize.getWidth();
  const largura = larguraPagina - MARGEM * 2;
  const ctx = { doc, x: MARGEM, largura, y: MARGEM };

  const logo = await carregarLogoBase64();

  if (logo) {
    try { doc.addImage(logo, 'JPEG', ctx.x, ctx.y, 34, 34); } catch (e) { /* segue sem logo */ }
  }
  const offsetTexto = logo ? 46 : 0;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...COR.verdeEscuro);
  doc.text('CASAS ECO', ctx.x + offsetTexto, ctx.y + 15);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COR.cinzaClaro);
  doc.text('Relatório de Boletos', ctx.x + offsetTexto, ctx.y + 29);
  ctx.y += 50;

  doc.setDrawColor(...COR.linha);
  doc.setLineWidth(1);
  doc.line(ctx.x, ctx.y, ctx.x + largura, ctx.y);
  ctx.y += 22;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...COR.cinzaClaro);
  doc.text(`Gerado em ${formatDateBR(new Date().toISOString().slice(0, 10))}`, ctx.x, ctx.y);
  ctx.y += 16;
  if (resumoFiltros) {
    doc.text(`Filtros: ${resumoFiltros}`, ctx.x, ctx.y, { maxWidth: largura });
    ctx.y += 16;
  }
  ctx.y += 8;

  linhaChaveValor(ctx, 'Total de boletos', String(totais.quantidade));
  linhaChaveValor(ctx, 'Total a pagar', formatMoney(totais.aPagar));
  linhaChaveValor(ctx, 'Total vencido', formatMoney(totais.vencidos));
  linhaChaveValor(ctx, 'Total pago no mês', formatMoney(totais.pagosNoMes));
  ctx.y += 10;

  function cabecalhoTabela() {
    doc.setFillColor(...COR.fundoVerde);
    doc.rect(ctx.x, ctx.y, largura, 22, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...COR.verdeEscuro);
    doc.text('VENCIMENTO', ctx.x + 6, ctx.y + 14);
    doc.text('BENEFICIÁRIO', ctx.x + 75, ctx.y + 14);
    doc.text('CATEGORIA', ctx.x + largura - 220, ctx.y + 14, { align: 'right' });
    doc.text('STATUS', ctx.x + largura - 120, ctx.y + 14, { align: 'right' });
    doc.text('VALOR', ctx.x + largura, ctx.y + 14, { align: 'right' });
    ctx.y += 30;
  }
  cabecalhoTabela();

  boletosFiltrados.forEach((b) => {
    quebrarPaginaSeNecessario(ctx, 18);
    if (ctx.y === MARGEM) cabecalhoTabela();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...COR.cinzaTexto);
    doc.text(formatDateBR(b.vencimento), ctx.x + 6, ctx.y);
    doc.text(b.beneficiario, ctx.x + 75, ctx.y, { maxWidth: largura - 300 });
    doc.text(b.categoria, ctx.x + largura - 220, ctx.y, { align: 'right' });
    doc.text(b.status.toUpperCase(), ctx.x + largura - 120, ctx.y, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COR.preto);
    doc.text(formatMoney(b.valor), ctx.x + largura, ctx.y, { align: 'right' });
    ctx.y += 16;
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...COR.cinzaMuitoClaro);
  quebrarPaginaSeNecessario(ctx, 20);
  ctx.y += 6;
  doc.text('Relatório gerado a partir dos boletos cadastrados no sistema.', ctx.x, ctx.y);

  const totalPaginas = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPaginas; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COR.cinzaMuitoClaro);
    doc.text('Casas Eco', MARGEM, RODAPE_Y);
    doc.text(`página ${p} de ${totalPaginas}`, larguraPagina - MARGEM, RODAPE_Y, { align: 'right' });
  }

  doc.save(`Relatorio de Boletos - ${new Date().toISOString().slice(0, 10)}.pdf`);
}
