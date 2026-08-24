// Geração do PDF "Orçamento" que o funcionário monta pro cliente na tela de
// venda de madeira. Mesmo estilo visual (cores/fontes) do Resumo Final da
// Obra (ver src/obra/gerarPdfResumoObra.js).
//
// Importante: gera SEMPRE um único arquivo/download por chamada. Quando o
// cliente pede as duas formas de pagamento, o modo 'ambos' mostra as duas
// colunas de preço no mesmo PDF em vez de acionar dois downloads — no Safari
// do iPhone, um segundo download disparado depois de um `await` (fora do
// gesto de toque original) é bloqueado silenciosamente pelo navegador, então
// "baixar dois arquivos de uma vez" não é confiável no celular.
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

// desconto: { tipo: 'percentual' | 'valor', valor: number } | null
function calcularValorDesconto(bruto, desconto) {
  if (!desconto || !desconto.valor || desconto.valor <= 0) return 0;
  if (desconto.tipo === 'percentual') return bruto * (Math.min(desconto.valor, 100) / 100);
  return Math.min(desconto.valor, bruto);
}

function rotuloDesconto(desconto) {
  return desconto.tipo === 'percentual' ? `Desconto (${String(desconto.valor).replace('.', ',')}%)` : 'Desconto';
}

// itens: [{ nome, formato, quantidade, precoAVista, precoAPrazo }]
// modo: 'vista' | 'prazo' | 'ambos'
export async function gerarPdfOrcamentoVenda({ itens, modo, clienteNome, observacao, desconto }) {
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

  const rotuloModo = modo === 'ambos' ? 'À vista e a prazo' : modo === 'vista' ? 'À vista' : 'A prazo';
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...COR.cinzaClaro);
  doc.text(`Data: ${formatDateBR(new Date().toISOString().slice(0, 10))}`, ctx.x, ctx.y);
  doc.text(`Forma de pagamento: ${rotuloModo}`, ctx.x + largura, ctx.y, { align: 'right' });
  ctx.y += 16;
  if (clienteNome && clienteNome.trim()) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COR.preto);
    doc.text(`Cliente: ${clienteNome.trim()}`, ctx.x, ctx.y);
    ctx.y += 16;
  }
  ctx.y += 10;

  // ---- colunas: offsets medidos a partir da borda direita da tabela ----
  const col = modo === 'ambos'
    ? { subPrazo: 0, valPrazo: 85, subVista: 165, valVista: 250, unid: 310, qtd: 345 }
    : { subUnica: 0, valUnica: 80, unid: 160, qtd: 220 };
  const larguraItem = largura - col.qtd - 12;

  function cabecalhoTabela() {
    doc.setFillColor(...COR.fundoVerde);
    doc.rect(ctx.x, ctx.y, largura, 22, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...COR.verdeEscuro);
    doc.text('ITEM', ctx.x + 6, ctx.y + 14);
    doc.text('QTD', ctx.x + largura - col.qtd, ctx.y + 14, { align: 'right' });
    doc.text('UNID.', ctx.x + largura - col.unid, ctx.y + 14, { align: 'right' });
    if (modo === 'ambos') {
      doc.text('VALOR', ctx.x + largura - col.valVista, ctx.y + 9, { align: 'right' });
      doc.text('À VISTA', ctx.x + largura - col.valVista, ctx.y + 18, { align: 'right' });
      doc.text('SUBTOT.', ctx.x + largura - col.subVista, ctx.y + 9, { align: 'right' });
      doc.text('À VISTA', ctx.x + largura - col.subVista, ctx.y + 18, { align: 'right' });
      doc.text('VALOR', ctx.x + largura - col.valPrazo, ctx.y + 9, { align: 'right' });
      doc.text('A PRAZO', ctx.x + largura - col.valPrazo, ctx.y + 18, { align: 'right' });
      doc.text('SUBTOT.', ctx.x + largura - col.subPrazo, ctx.y + 9, { align: 'right' });
      doc.text('A PRAZO', ctx.x + largura - col.subPrazo, ctx.y + 18, { align: 'right' });
    } else {
      doc.setFontSize(9);
      doc.text('VALOR UNIT.', ctx.x + largura - col.valUnica, ctx.y + 14, { align: 'right' });
      doc.text('SUBTOTAL', ctx.x + largura - col.subUnica, ctx.y + 14, { align: 'right' });
    }
    ctx.y += 30;
  }
  cabecalhoTabela();

  let totalVista = 0;
  let totalPrazo = 0;
  itens.forEach((item) => {
    quebrarPaginaSeNecessario(ctx, 18);
    if (ctx.y === MARGEM) cabecalhoTabela();
    const subVista = item.quantidade * item.precoAVista;
    const subPrazo = item.quantidade * item.precoAPrazo;
    totalVista += subVista;
    totalPrazo += subPrazo;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...COR.cinzaTexto);
    doc.text(item.nome, ctx.x + 6, ctx.y, { maxWidth: larguraItem });
    doc.text(String(item.quantidade).replace('.', ','), ctx.x + largura - col.qtd, ctx.y, { align: 'right' });
    doc.text(item.formato, ctx.x + largura - col.unid, ctx.y, { align: 'right' });

    if (modo === 'ambos') {
      doc.text(formatMoney(item.precoAVista), ctx.x + largura - col.valVista, ctx.y, { align: 'right' });
      doc.text(formatMoney(item.precoAPrazo), ctx.x + largura - col.valPrazo, ctx.y, { align: 'right' });
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COR.preto);
      doc.text(formatMoney(subVista), ctx.x + largura - col.subVista, ctx.y, { align: 'right' });
      doc.text(formatMoney(subPrazo), ctx.x + largura - col.subPrazo, ctx.y, { align: 'right' });
    } else {
      const precoUnit = modo === 'vista' ? item.precoAVista : item.precoAPrazo;
      const subtotal = modo === 'vista' ? subVista : subPrazo;
      doc.text(formatMoney(precoUnit), ctx.x + largura - col.valUnica, ctx.y, { align: 'right' });
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COR.preto);
      doc.text(formatMoney(subtotal), ctx.x + largura - col.subUnica, ctx.y, { align: 'right' });
    }
    ctx.y += 17;
  });

  ctx.y += 6;
  doc.setDrawColor(...COR.linha);
  doc.setLineWidth(1);
  quebrarPaginaSeNecessario(ctx, 90);
  doc.line(ctx.x, ctx.y, ctx.x + largura, ctx.y);
  ctx.y += 20;

  function linhaSubtotalEDesconto(bruto) {
    const valorDesc = calcularValorDesconto(bruto, desconto);
    if (valorDesc <= 0) return bruto;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...COR.cinzaClaro);
    doc.text('Subtotal', ctx.x, ctx.y);
    doc.text(formatMoney(bruto), ctx.x + largura, ctx.y, { align: 'right' });
    ctx.y += 15;
    doc.text(rotuloDesconto(desconto), ctx.x, ctx.y);
    doc.text(`-${formatMoney(valorDesc)}`, ctx.x + largura, ctx.y, { align: 'right' });
    ctx.y += 17;
    return bruto - valorDesc;
  }

  if (modo === 'ambos') {
    const liquidoVista = linhaSubtotalEDesconto(totalVista);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...COR.verdeEscuro);
    doc.text('TOTAL À VISTA', ctx.x, ctx.y);
    doc.text(formatMoney(liquidoVista), ctx.x + largura, ctx.y, { align: 'right' });
    ctx.y += 22;
    const liquidoPrazo = linhaSubtotalEDesconto(totalPrazo);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...COR.verdeEscuro);
    doc.text('TOTAL A PRAZO', ctx.x, ctx.y);
    doc.text(formatMoney(liquidoPrazo), ctx.x + largura, ctx.y, { align: 'right' });
    ctx.y += 28;
  } else {
    const totalBruto = modo === 'vista' ? totalVista : totalPrazo;
    const totalLiquido = linhaSubtotalEDesconto(totalBruto);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...COR.verdeEscuro);
    doc.text('TOTAL', ctx.x, ctx.y);
    doc.text(formatMoney(totalLiquido), ctx.x + largura, ctx.y, { align: 'right' });
    ctx.y += 28;
  }

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

  const sufixoModo = modo === 'ambos' ? 'a vista e a prazo' : modo === 'vista' ? 'a vista' : 'a prazo';
  const nomeArquivo = clienteNome && clienteNome.trim()
    ? `Orcamento (${sufixoModo}) - ${clienteNome.trim()}.pdf`
    : `Orcamento (${sufixoModo}) - ${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(nomeArquivo);
}
