// Extrato do crediário em PDF — mesmo estilo visual dos outros documentos
// do sistema (src/boletos/gerarRelatorioBoletos.js).
//
// O documento é deliberadamente carimbado como ANOTAÇÃO INTERNA, SEM VALOR
// FISCAL: ele serve para o montador conferir o que pegou e para o acerto
// da mão de obra, e não substitui nota fiscal nem comprova venda.
import { jsPDF } from 'jspdf';
import { formatMoney, formatDateBR } from '../domain';
import { descreverMovimento, nomeExibicao, rotuloFormaAcerto } from './crediarioStore';

const MARGEM = 40;
const RODAPE_Y = 800;

const COR = {
  verdeEscuro: [22, 101, 52],
  cinzaTexto: [68, 64, 60],
  cinzaClaro: [120, 113, 108],
  cinzaMuitoClaro: [168, 162, 158],
  linha: [231, 229, 228],
  fundoVerde: [240, 253, 244],
  fundoAviso: [254, 252, 232],
  preto: [28, 25, 23],
  vermelho: [185, 28, 28],
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
    return true;
  }
  return false;
}

function linhaChaveValor(ctx, label, valor, cor) {
  quebrarPaginaSeNecessario(ctx, 16);
  ctx.doc.setFont('helvetica', 'normal');
  ctx.doc.setFontSize(9.5);
  ctx.doc.setTextColor(...COR.cinzaClaro);
  ctx.doc.text(label, ctx.x, ctx.y);
  ctx.doc.setFont('helvetica', 'bold');
  ctx.doc.setTextColor(...(cor || COR.preto));
  ctx.doc.text(String(valor), ctx.x + ctx.largura, ctx.y, { align: 'right' });
  ctx.y += 15;
}

// extrato: lista já montada por extratoDoMontador (mais recente primeiro).
// resumo: { retirado, acertado, saldo }.
export async function gerarPdfExtratoCrediario({ montador, extrato, resumo, obras = [] }) {
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
  doc.text('Extrato de crediário (controle interno)', ctx.x + offsetTexto, ctx.y + 29);
  ctx.y += 50;

  doc.setDrawColor(...COR.linha);
  doc.setLineWidth(1);
  doc.line(ctx.x, ctx.y, ctx.x + largura, ctx.y);
  ctx.y += 20;

  // Aviso: é o ponto central do módulo, então vem em destaque no topo.
  doc.setFillColor(...COR.fundoAviso);
  doc.rect(ctx.x, ctx.y - 12, largura, 34, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...COR.cinzaTexto);
  doc.text('ANOTAÇÃO INTERNA — NÃO É VENDA E NÃO TEM VALOR FISCAL.', ctx.x + 8, ctx.y + 2);
  doc.setFont('helvetica', 'normal');
  doc.text(
    'Documento de controle do que foi retirado da loja, para acerto na mão de obra. Não é nota fiscal nem recibo de venda.',
    ctx.x + 8, ctx.y + 14, { maxWidth: largura - 16 }
  );
  ctx.y += 40;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...COR.preto);
  doc.text(nomeExibicao(montador), ctx.x, ctx.y);
  ctx.y += 16;

  const dadosMontador = [montador.telefone, montador.documento].filter(Boolean).join(' · ');
  if (dadosMontador) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...COR.cinzaClaro);
    doc.text(dadosMontador, ctx.x, ctx.y);
    ctx.y += 14;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COR.cinzaClaro);
  doc.text(`Gerado em ${formatDateBR(new Date().toISOString().slice(0, 10))}`, ctx.x, ctx.y);
  ctx.y += 22;

  linhaChaveValor(ctx, 'Total retirado', formatMoney(resumo.retirado));
  linhaChaveValor(ctx, 'Já descontado / pago', formatMoney(resumo.acertado));
  linhaChaveValor(
    ctx,
    'Saldo a descontar',
    formatMoney(resumo.saldo),
    resumo.saldo >= 0.01 ? COR.vermelho : COR.verdeEscuro
  );
  ctx.y += 12;

  function cabecalhoTabela() {
    doc.setFillColor(...COR.fundoVerde);
    doc.rect(ctx.x, ctx.y, largura, 22, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...COR.verdeEscuro);
    doc.text('DATA', ctx.x + 6, ctx.y + 14);
    doc.text('MOVIMENTO', ctx.x + 70, ctx.y + 14);
    doc.text('VALOR', ctx.x + largura - 90, ctx.y + 14, { align: 'right' });
    doc.text('SALDO', ctx.x + largura, ctx.y + 14, { align: 'right' });
    ctx.y += 30;
  }
  cabecalhoTabela();

  // do mais antigo para o mais novo: é assim que se confere uma conta.
  const emOrdem = extrato.slice().reverse();

  if (emOrdem.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...COR.cinzaMuitoClaro);
    doc.text('Nenhum movimento anotado até agora.', ctx.x + 6, ctx.y);
    ctx.y += 16;
  }

  emOrdem.forEach((m) => {
    const itens = m.tipo === 'retirada' ? (m.itens || []) : [];
    if (quebrarPaginaSeNecessario(ctx, 18 + itens.length * 12)) cabecalhoTabela();

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...COR.cinzaTexto);
    doc.text(formatDateBR(m.data), ctx.x + 6, ctx.y);

    const obra = m.obraId ? obras.find((o) => o.id === m.obraId) : null;
    const titulo = m.tipo === 'acerto'
      ? `ACERTO — ${rotuloFormaAcerto(m.forma)}`
      : descreverMovimento(m);
    doc.text(titulo + (obra ? ` · ${obra.nome}` : ''), ctx.x + 70, ctx.y, { maxWidth: largura - 250 });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...(m.tipo === 'acerto' ? COR.verdeEscuro : COR.preto));
    doc.text(
      `${m.tipo === 'acerto' ? '- ' : '+ '}${formatMoney(m.valor)}`,
      ctx.x + largura - 90, ctx.y, { align: 'right' }
    );
    doc.setTextColor(...COR.cinzaTexto);
    doc.text(formatMoney(m.saldoApos), ctx.x + largura, ctx.y, { align: 'right' });
    ctx.y += 14;

    itens.forEach((it) => {
      quebrarPaginaSeNecessario(ctx, 12);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...COR.cinzaMuitoClaro);
      doc.text(
        `${it.quantidade} ${it.unidade} × ${formatMoney(it.precoUnitario)} — ${it.nome}`,
        ctx.x + 80, ctx.y, { maxWidth: largura - 180 }
      );
      doc.text(formatMoney(it.total), ctx.x + largura - 90, ctx.y, { align: 'right' });
      ctx.y += 11;
    });

    if (m.tipo === 'retirada' && m.observacao) {
      quebrarPaginaSeNecessario(ctx, 12);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(...COR.cinzaMuitoClaro);
      doc.text(m.observacao, ctx.x + 80, ctx.y, { maxWidth: largura - 180 });
      ctx.y += 11;
    }
    ctx.y += 3;
  });

  ctx.y += 10;
  quebrarPaginaSeNecessario(ctx, 60);
  doc.setDrawColor(...COR.linha);
  doc.line(ctx.x, ctx.y, ctx.x + largura, ctx.y);
  ctx.y += 30;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COR.cinzaClaro);
  doc.line(ctx.x, ctx.y, ctx.x + 220, ctx.y);
  doc.text(nomeExibicao(montador), ctx.x, ctx.y + 12, { maxWidth: 220 });
  doc.line(ctx.x + largura - 220, ctx.y, ctx.x + largura, ctx.y);
  doc.text('Casas Eco', ctx.x + largura - 220, ctx.y + 12);

  const totalPaginas = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPaginas; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COR.cinzaMuitoClaro);
    doc.text('Casas Eco · controle interno de crediário (sem valor fiscal)', MARGEM, RODAPE_Y);
    doc.text(`página ${p} de ${totalPaginas}`, larguraPagina - MARGEM, RODAPE_Y, { align: 'right' });
  }

  const nomeArquivo = `Crediario - ${nomeExibicao(montador)} - ${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(nomeArquivo);
}
