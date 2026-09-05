// Geração do PDF da obra, em duas versões: o RESUMO FINAL (obra
// finalizada, documento de encerramento) e o RELATÓRIO PARCIAL (a
// qualquer momento, com o que foi gasto até a data de emissão).
//
// É o mesmo documento e as mesmas contas — muda só o que está escrito,
// porque o que muda de verdade é o tempo verbal. No final a conta está
// fechada: sobrou tanto, "economia". No meio da obra não sobrou nada
// ainda, o dinheiro só não foi gasto: "ainda disponível". Chamar isso de
// economia no meio do caminho seria dar por encerrado o que não acabou.
//
// Desenhado inteiramente com primitivas vetoriais do jsPDF (retângulos,
// linhas, texto) — sem depender de captura de tela (html2canvas) — para não
// ter problemas de fonte/CORS e para o texto do PDF continuar selecionável.
// Todos os números vêm do objeto `resumo` calculado por obraResumoCalc.js a
// partir dos lançamentos reais da obra; nada aqui é inventado.
import { jsPDF } from 'jspdf';
import { formatMoney, formatDateBR, formatPct, CORES_CATEGORIA, todayISO } from '../domain';
import { SITUACAO_OBRA, situacaoObra } from './obraStatus';

const MARGEM = 40;
const RODAPE_Y = 800;

const COR = {
  verdeEscuro: [22, 101, 52],
  verde: [22, 163, 74],
  vermelho: [220, 38, 38],
  cinzaTexto: [68, 64, 60],
  cinzaClaro: [120, 113, 108],
  cinzaMuitoClaro: [168, 162, 158],
  linha: [231, 229, 228],
  fundoVerde: [240, 253, 244],
  fundoVermelho: [254, 242, 242],
  preto: [28, 25, 23],
  cinzaRef: [214, 211, 209],
};

function hexParaRgb(hex) {
  const limpo = (hex || '#a8a29e').replace('#', '');
  const n = parseInt(limpo, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

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

function tituloSecao(ctx, texto) {
  quebrarPaginaSeNecessario(ctx, 28);
  ctx.doc.setFont('helvetica', 'bold');
  ctx.doc.setFontSize(11);
  ctx.doc.setTextColor(...COR.verdeEscuro);
  ctx.doc.text(texto, ctx.x, ctx.y);
  ctx.y += 6;
  ctx.doc.setDrawColor(...COR.linha);
  ctx.doc.setLineWidth(0.75);
  ctx.doc.line(ctx.x, ctx.y, ctx.x + ctx.largura, ctx.y);
  ctx.y += 16;
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

function iconeAlerta(ctx, cx, cy, acima) {
  // Ícone desenhado com formas vetoriais (círculo + triângulo) em vez de
  // caractere unicode (⚠/✓) — as fontes padrão do jsPDF (Helvetica) não têm
  // esses glifos e acabavam quebrando o espaçamento do texto ao lado.
  const cor = acima ? COR.vermelho : COR.verdeEscuro;
  ctx.doc.setDrawColor(...cor);
  ctx.doc.setFillColor(...cor);
  if (acima) {
    ctx.doc.setLineWidth(1.1);
    ctx.doc.lines([[3.5, -6], [3.5, 6], [-7, 0]], cx - 3.5, cy + 3, [1, 1], 'S', true);
    ctx.doc.setFontSize(7.5);
    ctx.doc.setFont('helvetica', 'bold');
    ctx.doc.text('!', cx, cy + 3.2, { align: 'center' });
  } else {
    ctx.doc.circle(cx, cy, 6, 'S');
    ctx.doc.setLineWidth(1.1);
    ctx.doc.lines([[2, 2.5], [4.5, -5.5]], cx - 3.5, cy + 1, [1, 1], 'S');
  }
}

function bannerConclusao(ctx, resumo, parcial) {
  const acima = resumo.statusOrcamentario === 'acima';
  const altura = 44;
  quebrarPaginaSeNecessario(ctx, altura + 12);
  ctx.doc.setFillColor(...(acima ? COR.fundoVermelho : COR.fundoVerde));
  ctx.doc.roundedRect(ctx.x, ctx.y, ctx.largura, altura, 4, 4, 'F');
  iconeAlerta(ctx, ctx.x + 16, ctx.y + 16, acima);
  ctx.doc.setFont('helvetica', 'bold');
  ctx.doc.setFontSize(10.5);
  ctx.doc.setTextColor(...(acima ? COR.vermelho : COR.verdeEscuro));
  const titulo = parcial
    ? (acima ? 'ACIMA DO ORÇAMENTO ATÉ AQUI' : 'DENTRO DO ORÇAMENTO ATÉ AQUI')
    : (acima ? 'OBRA FINALIZADA ACIMA DO ORÇAMENTO' : 'OBRA FINALIZADA DENTRO DO ORÇAMENTO');
  ctx.doc.text(titulo, ctx.x + 28, ctx.y + 18);
  ctx.doc.setFont('helvetica', 'normal');
  ctx.doc.setFontSize(9);
  ctx.doc.setTextColor(...COR.cinzaTexto);
  // "economia" só existe com a obra fechada; no meio do caminho o que
  // há é orçamento ainda não gasto
  const sobra = parcial ? 'Ainda disponível' : 'Economia de';
  const detalhe = acima
    ? `Excedente de ${formatMoney(Math.abs(resumo.saldo))} · ${formatPct(resumo.pctUtilizado)} do orçamento utilizado`
    : `${sobra} ${formatMoney(resumo.saldo)} · ${formatPct(resumo.pctUtilizado)} do orçamento utilizado`;
  ctx.doc.text(detalhe, ctx.x + 28, ctx.y + 32);
  ctx.y += altura + 18;
}

function graficoBarrasCategorias(ctx, porCategoria) {
  if (porCategoria.length === 0) {
    ctx.doc.setFont('helvetica', 'normal');
    ctx.doc.setFontSize(9);
    ctx.doc.setTextColor(...COR.cinzaMuitoClaro);
    ctx.doc.text('Nenhum lançamento registrado.', ctx.x, ctx.y);
    ctx.y += 18;
    return;
  }
  const alturaLinha = 22;
  const alturaTotal = porCategoria.length * alturaLinha + 6;
  quebrarPaginaSeNecessario(ctx, alturaTotal);
  const maxValor = Math.max(...porCategoria.map((c) => c.valor));
  const larguraBarraMax = ctx.largura - 170;
  porCategoria.forEach((c) => {
    const cor = hexParaRgb(CORES_CATEGORIA[c.key]);
    ctx.doc.setFont('helvetica', 'normal');
    ctx.doc.setFontSize(9);
    ctx.doc.setTextColor(...COR.cinzaTexto);
    ctx.doc.text(c.label, ctx.x, ctx.y + 5);
    const larguraBarra = maxValor > 0 ? Math.max(2, (c.valor / maxValor) * larguraBarraMax) : 2;
    ctx.doc.setFillColor(...cor);
    ctx.doc.roundedRect(ctx.x + 95, ctx.y - 6, larguraBarra, 10, 2, 2, 'F');
    ctx.doc.setFont('helvetica', 'bold');
    ctx.doc.setTextColor(...COR.preto);
    ctx.doc.text(`${formatMoney(c.valor)} — ${formatPct(c.pct)}`, ctx.x + 95 + larguraBarraMax + 6, ctx.y + 5, { align: 'left' });
    ctx.y += alturaLinha;
  });
  ctx.y += 4;
}

function graficoEvolucao(ctx, evolucaoMensal) {
  if (evolucaoMensal.length < 2) return;
  const alturaGrafico = 110;
  quebrarPaginaSeNecessario(ctx, alturaGrafico + 20);
  const baseY = ctx.y + alturaGrafico;
  const maxValor = Math.max(...evolucaoMensal.map((m) => m.total), 1);
  const larguraUtil = ctx.largura;
  const espacamento = larguraUtil / evolucaoMensal.length;
  const larguraBarra = Math.min(28, espacamento * 0.5);

  ctx.doc.setDrawColor(...COR.linha);
  ctx.doc.setLineWidth(0.5);
  ctx.doc.line(ctx.x, baseY, ctx.x + larguraUtil, baseY);

  evolucaoMensal.forEach((m, i) => {
    const alturaBarra = (m.total / maxValor) * (alturaGrafico - 20);
    const cx = ctx.x + espacamento * i + espacamento / 2;
    ctx.doc.setFillColor(...COR.verde);
    ctx.doc.roundedRect(cx - larguraBarra / 2, baseY - alturaBarra, larguraBarra, alturaBarra, 1.5, 1.5, 'F');
    ctx.doc.setFont('helvetica', 'normal');
    ctx.doc.setFontSize(7.5);
    ctx.doc.setTextColor(...COR.cinzaClaro);
    ctx.doc.text(m.label, cx, baseY + 12, { align: 'center' });
  });
  ctx.y = baseY + 22;
}

function graficoComparacao(ctx, orcamento, totalGasto) {
  if (orcamento == null) return;
  const alturaBarra = 16;
  quebrarPaginaSeNecessario(ctx, alturaBarra * 2 + 40);
  const maxValor = Math.max(orcamento, totalGasto) * 1.05;
  const larguraMax = ctx.largura - 100;

  ctx.doc.setFont('helvetica', 'normal');
  ctx.doc.setFontSize(9);
  ctx.doc.setTextColor(...COR.cinzaTexto);
  ctx.doc.text('Orçamento', ctx.x, ctx.y + 5);
  ctx.doc.setFillColor(...COR.cinzaRef);
  ctx.doc.roundedRect(ctx.x + 70, ctx.y - 8, (orcamento / maxValor) * larguraMax, alturaBarra, 2, 2, 'F');
  ctx.doc.setFont('helvetica', 'bold');
  ctx.doc.setTextColor(...COR.preto);
  ctx.doc.text(formatMoney(orcamento), ctx.x + 70 + (orcamento / maxValor) * larguraMax + 6, ctx.y + 5);
  ctx.y += alturaBarra + 12;

  ctx.doc.setFont('helvetica', 'normal');
  ctx.doc.setTextColor(...COR.cinzaTexto);
  ctx.doc.text('Custo real', ctx.x, ctx.y + 5);
  const corBarra = totalGasto > orcamento ? COR.vermelho : COR.verde;
  ctx.doc.setFillColor(...corBarra);
  ctx.doc.roundedRect(ctx.x + 70, ctx.y - 8, (totalGasto / maxValor) * larguraMax, alturaBarra, 2, 2, 'F');
  ctx.doc.setFont('helvetica', 'bold');
  ctx.doc.setTextColor(...COR.preto);
  ctx.doc.text(formatMoney(totalGasto), ctx.x + 70 + (totalGasto / maxValor) * larguraMax + 6, ctx.y + 5);
  ctx.y += alturaBarra + 16;
}

function tabelaDespesas(ctx, itens) {
  if (itens.length === 0) {
    ctx.doc.setFontSize(9);
    ctx.doc.setTextColor(...COR.cinzaMuitoClaro);
    ctx.doc.text('Nenhum lançamento registrado.', ctx.x, ctx.y);
    ctx.y += 18;
    return;
  }
  itens.forEach((item, i) => {
    quebrarPaginaSeNecessario(ctx, 16);
    ctx.doc.setFont('helvetica', 'normal');
    ctx.doc.setFontSize(9);
    ctx.doc.setTextColor(...COR.cinzaClaro);
    ctx.doc.text(`${i + 1}.`, ctx.x, ctx.y);
    ctx.doc.setTextColor(...COR.cinzaTexto);
    const descricao = item.fornecedorNome ? `${item.descricao} (${item.fornecedorNome})` : item.descricao;
    ctx.doc.text(descricao, ctx.x + 16, ctx.y, { maxWidth: ctx.largura - 140 });
    ctx.doc.setFont('helvetica', 'bold');
    ctx.doc.setTextColor(...COR.preto);
    ctx.doc.text(formatMoney(item.total), ctx.x + ctx.largura, ctx.y, { align: 'right' });
    ctx.y += 15;
  });
  ctx.y += 3;
}

function tabelaFornecedores(ctx, itens) {
  if (itens.length === 0) return;
  itens.forEach((f) => {
    quebrarPaginaSeNecessario(ctx, 16);
    ctx.doc.setFont('helvetica', 'normal');
    ctx.doc.setFontSize(9);
    ctx.doc.setTextColor(...COR.cinzaTexto);
    ctx.doc.text(f.nome, ctx.x, ctx.y);
    ctx.doc.setFont('helvetica', 'bold');
    ctx.doc.setTextColor(...COR.preto);
    ctx.doc.text(formatMoney(f.total), ctx.x + ctx.largura, ctx.y, { align: 'right' });
    ctx.y += 15;
  });
  ctx.y += 3;
}

export async function gerarPdfResumoObra(obra, resumo, { parcial = false } = {}) {
  const hoje = todayISO();
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
  doc.text(`Custo de Obra — ${parcial ? 'Relatório Parcial' : 'Resumo Final'}`, ctx.x + offsetTexto, ctx.y + 29);
  ctx.y += 50;

  doc.setDrawColor(...COR.linha);
  doc.setLineWidth(1);
  doc.line(ctx.x, ctx.y, ctx.x + largura, ctx.y);
  ctx.y += 26;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(...COR.preto);
  doc.text(
    `${parcial ? 'RELATÓRIO PARCIAL' : 'RESUMO FINAL'} — ${obra.nome.toUpperCase()}`,
    ctx.x, ctx.y, { maxWidth: largura }
  );
  ctx.y += 18;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COR.cinzaClaro);
  // No parcial a data não é enfeite: ela diz até quando a conta vale.
  // Emitido de novo semana que vem, os números serão outros.
  doc.text(
    `Documento gerado em ${formatDateBR(hoje)}${parcial ? ' · com os lançamentos registrados até esta data' : ''}`,
    ctx.x, ctx.y
  );
  ctx.y += 26;

  // ---- informações da obra ----
  tituloSecao(ctx, 'INFORMAÇÕES DA OBRA');
  linhaChaveValor(ctx, 'Nome', obra.nome);
  if (obra.cliente) linhaChaveValor(ctx, 'Cliente', obra.cliente);
  if (obra.endereco) linhaChaveValor(ctx, 'Endereço', obra.endereco);
  linhaChaveValor(ctx, 'Data de início', `${formatDateBR(resumo.dataInicio)}${resumo.inicioRegistrado ? '' : ' (data de cadastro)'}`);
  if (obra.finalizadaEm) {
    linhaChaveValor(ctx, 'Data de finalização', formatDateBR(obra.finalizadaEm.slice(0, 10)));
  }
  if (resumo.duracaoDias) {
    linhaChaveValor(ctx, parcial ? 'Dias de obra até aqui' : 'Duração da obra', `${resumo.duracaoDias} dias`);
  }
  // No parcial o status é o de verdade (aguardando início, em andamento,
  // programada); no final é sempre CONCLUÍDA, que é o que o encerramento
  // atesta.
  linhaChaveValor(ctx, 'Status', parcial ? SITUACAO_OBRA[situacaoObra(obra, hoje)].label : 'CONCLUÍDA');
  ctx.y += 8;

  // ---- resumo financeiro ----
  tituloSecao(ctx, 'RESUMO FINANCEIRO');
  if (resumo.orcamento != null) linhaChaveValor(ctx, 'Orçamento total', formatMoney(resumo.orcamento));
  linhaChaveValor(ctx, parcial ? 'Custo até aqui' : 'Custo total', formatMoney(resumo.totalGasto));
  if (resumo.saldo != null) {
    const rotuloSaldo = resumo.saldo < 0 ? 'Excedente' : (parcial ? 'Ainda disponível' : 'Economia');
    linhaChaveValor(ctx, rotuloSaldo, formatMoney(Math.abs(resumo.saldo)));
  }
  if (resumo.pctUtilizado != null) linhaChaveValor(ctx, 'Percentual do orçamento utilizado', formatPct(resumo.pctUtilizado));
  linhaChaveValor(ctx, 'Quantidade de lançamentos', String(resumo.qtdLancamentos));
  if (resumo.mediaGastoPorMes != null) linhaChaveValor(ctx, 'Média de gasto por mês', formatMoney(resumo.mediaGastoPorMes));
  ctx.y += 6;

  if (resumo.orcamento != null) bannerConclusao(ctx, resumo, parcial);

  // ---- gráfico 1: gastos por categoria ----
  tituloSecao(ctx, 'GASTOS POR CATEGORIA');
  graficoBarrasCategorias(ctx, resumo.porCategoria);
  ctx.y += 6;

  // ---- gráfico 2: evolução dos gastos ----
  if (resumo.evolucaoMensal.length > 1) {
    tituloSecao(ctx, 'EVOLUÇÃO DOS GASTOS');
    graficoEvolucao(ctx, resumo.evolucaoMensal);
    ctx.y += 6;
  }

  // ---- gráfico 3: orçamento x custo real ----
  if (resumo.orcamento != null) {
    tituloSecao(ctx, 'ORÇAMENTO x CUSTO REAL');
    graficoComparacao(ctx, resumo.orcamento, resumo.totalGasto);
    ctx.y += 6;
  }

  // ---- maiores despesas ----
  tituloSecao(ctx, parcial ? 'MAIORES DESPESAS ATÉ AQUI' : 'MAIORES DESPESAS DA OBRA');
  tabelaDespesas(ctx, resumo.maioresDespesas);
  ctx.y += 6;

  // ---- fornecedores ----
  if (resumo.porFornecedor.length > 0) {
    tituloSecao(ctx, 'PRINCIPAIS FORNECEDORES');
    tabelaFornecedores(ctx, resumo.porFornecedor);
    ctx.y += 6;
  }

  // ---- observações ----
  if (obra.observacoesFinais) {
    tituloSecao(ctx, 'OBSERVAÇÕES DA OBRA');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...COR.cinzaTexto);
    const linhas = doc.splitTextToSize(obra.observacoesFinais, largura);
    quebrarPaginaSeNecessario(ctx, linhas.length * 13);
    doc.text(linhas, ctx.x, ctx.y);
    ctx.y += linhas.length * 13 + 8;
  }

  // ---- rodapé em todas as páginas ----
  const totalPaginas = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPaginas; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COR.cinzaMuitoClaro);
    doc.text(
      parcial
        ? `Casas Eco · Custo de Obra · relatório parcial de ${formatDateBR(hoje)}`
        : 'Casas Eco · Custo de Obra',
      MARGEM, RODAPE_Y
    );
    doc.text(`página ${p} de ${totalPaginas}`, larguraPagina - MARGEM, RODAPE_Y, { align: 'right' });
  }

  // a data entra no nome do arquivo do parcial: dois relatórios da mesma
  // obra são documentos diferentes, e sem a data um sobrescreveria o outro
  doc.save(parcial
    ? `Relatorio Parcial - ${obra.nome} - ${hoje}.pdf`
    : `Resumo Final - ${obra.nome}.pdf`);
}
