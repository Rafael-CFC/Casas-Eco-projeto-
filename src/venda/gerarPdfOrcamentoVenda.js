// Geração do PDF "Orçamento" que o funcionário monta pro cliente na tela de
// venda de madeira. Mesmo estilo visual (cores/fontes) do Resumo Final da
// Obra (ver src/obra/gerarPdfResumoObra.js), mas layout mais simples: só uma
// tabela de itens + total.
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

export async function gerarPdfOrcamentoVenda({ itens, modoPagamento, clienteNome, observacao }) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const larguraPagina = doc.internal.pageSize.getWidth();
  const largura = larguraPagina - MARGEM * 2;
  const ctx = { doc, x: MARGEM, largura, y: MARGEM };

  const logo = await carregarLogoBase64();

  // ---- cabeçalho ----
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
  doc.text('Orçamento de madeiras', ctx.x + offsetTexto, ctx.y + 29);
  ctx.y += 50;

  doc.setDrawColor(...COR.linha);
  doc.setLineWidth(1);
  doc.line(ctx.x, ctx.y, ctx.x + largura, ctx.y);
  ctx.y += 22;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...COR.cinzaClaro);
  doc.text(`Data: ${formatDateBR(new Date().toISOString().slice(0, 10))}`, ctx.x, ctx.y);
  doc.text(`Forma de pagamento: ${modoPagamento === 'vista' ? 'À vista' : 'A prazo'}`, ctx.x + largura, ctx.y, { align: 'right' });
  ctx.y += 16;
  if (clienteNome && clienteNome.trim()) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COR.preto);
    doc.text(`Cliente: ${clienteNome.trim()}`, ctx.x, ctx.y);
    ctx.y += 16;
  }
  ctx.y += 10;

  // ---- cabeçalho da tabela ----
  function cabecalhoTabela() {
    doc.setFillColor(...COR.fundoVerde);
    doc.rect(ctx.x, ctx.y, largura, 22, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...COR.verdeEscuro);
    doc.text('ITEM', ctx.x + 6, ctx.y + 14);
    doc.text('QTD', ctx.x + largura - 220, ctx.y + 14, { align: 'right' });
    doc.text('UNID.', ctx.x + largura - 160, ctx.y + 14, { align: 'right' });
    doc.text('VALOR UNIT.', ctx.x + largura - 80, ctx.y + 14, { align: 'right' });
    doc.text('SUBTOTAL', ctx.x + largura, ctx.y + 14, { align: 'right' });
    ctx.y += 30;
  }
  cabecalhoTabela();

  let total = 0;
  itens.forEach((item, i) => {
    quebrarPaginaSeNecessario(ctx, 18);
    if (ctx.y === MARGEM) cabecalhoTabela();
    const subtotal = item.quantidade * item.precoUnit;
    total += subtotal;
    doc.setFont('helvetica', i % 2 === 0 ? 'normal' : 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...COR.cinzaTexto);
    doc.text(item.nome, ctx.x + 6, ctx.y, { maxWidth: largura - 280 });
    doc.text(String(item.quantidade).replace('.', ','), ctx.x + largura - 220, ctx.y, { align: 'right' });
    doc.text(item.formato, ctx.x + largura - 160, ctx.y, { align: 'right' });
    doc.text(formatMoney(item.precoUnit), ctx.x + largura - 80, ctx.y, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COR.preto);
    doc.text(formatMoney(subtotal), ctx.x + largura, ctx.y, { align: 'right' });
    ctx.y += 17;
  });

  ctx.y += 6;
  doc.setDrawColor(...COR.linha);
  doc.setLineWidth(1);
  quebrarPaginaSeNecessario(ctx, 40);
  doc.line(ctx.x, ctx.y, ctx.x + largura, ctx.y);
  ctx.y += 20;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...COR.verdeEscuro);
  doc.text('TOTAL', ctx.x, ctx.y);
  doc.text(formatMoney(total), ctx.x + largura, ctx.y, { align: 'right' });
  ctx.y += 28;

  if (observacao && observacao.trim()) {
    quebrarPaginaSeNecessario(ctx, 30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...COR.cinzaClaro);
    doc.text('Observações', ctx.x, ctx.y);
    ctx.y += 14;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COR.cinzaTexto);
    const linhas = doc.splitTextToSize(observacao.trim(), largura);
    quebrarPaginaSeNecessario(ctx, linhas.length * 13);
    doc.text(linhas, ctx.x, ctx.y);
    ctx.y += linhas.length * 13;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...COR.cinzaMuitoClaro);
  quebrarPaginaSeNecessario(ctx, 20);
  doc.text('Orçamento sujeito a alteração sem aviso prévio. Valores válidos na data de emissão.', ctx.x, ctx.y + 14);

  // ---- rodapé em todas as páginas ----
  const totalPaginas = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPaginas; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COR.cinzaMuitoClaro);
    doc.text('Casas Eco', MARGEM, RODAPE_Y);
    doc.text(`página ${p} de ${totalPaginas}`, larguraPagina - MARGEM, RODAPE_Y, { align: 'right' });
  }

  const nomeArquivo = clienteNome && clienteNome.trim()
    ? `Orcamento - ${clienteNome.trim()}.pdf`
    : `Orcamento - ${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(nomeArquivo);
}
