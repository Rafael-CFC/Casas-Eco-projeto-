// Gera o PDF do CONTRATO e do MEMORIAL DESCRITIVO.
//
// Todo o conteúdo vem do modelo salvo em Configurações + dos dados do
// contrato. Nenhum texto jurídico é inventado aqui: as cláusulas são
// exatamente o que estiver cadastrado no modelo da empresa, com os
// marcadores {{...}} trocados pelos dados reais do cliente/obra.
import { formatMoney, formatDateBR, todayISO } from '../domain';
import { valorPorExtenso } from './numeroPorExtenso';
import { clausulasResolvidas, memorialResolvido } from './contratosStore';
import { MODELOS_OBRA } from '../config/configStore';
import {
  criarDocumento, cabecalhoDocumento, tituloSecao, paragrafo, linhaChaveValor,
  caixaDestaque, tabela, blocoAssinaturas, rodapeTodasPaginas, nomeArquivo,
  garantirEspaco, novaPagina, COR,
} from './pdfDocumento';

const NUMERO_CLAUSULA = ['PRIMEIRA', 'SEGUNDA', 'TERCEIRA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÉTIMA', 'OITAVA', 'NONA', 'DÉCIMA', 'DÉCIMA PRIMEIRA', 'DÉCIMA SEGUNDA', 'DÉCIMA TERCEIRA', 'DÉCIMA QUARTA', 'DÉCIMA QUINTA'];

function labelModelo(chave) {
  return MODELOS_OBRA.find((m) => m.key === chave)?.label || '';
}

// ---- corpo do contrato (reaproveitado no PDF combinado) ----
async function escreverContrato(ctx, contrato, config) {
  const contratada = contrato.contratadaSnapshot || config.contratada || {};

  await cabecalhoDocumento(ctx, {
    titulo: 'Contrato de Prestação de Serviços de Construção',
    subtitulo: 'Contrato de empreitada',
    numero: contrato.numero,
  });

  // ---- qualificação das partes ----
  tituloSecao(ctx, 'DAS PARTES');
  paragrafo(ctx, 'CONTRATADA', { negrito: true, tamanho: 9.5, espacoDepois: 4, cor: COR.preto });
  linhaChaveValor(ctx, 'Razão social', contratada.razaoSocial);
  linhaChaveValor(ctx, 'CNPJ', contratada.cnpj);
  linhaChaveValor(ctx, 'Endereço', contratada.endereco);
  linhaChaveValor(ctx, 'Representante', contratada.representante);
  linhaChaveValor(ctx, 'CPF', contratada.cpfRepresentante);
  linhaChaveValor(ctx, 'Telefone', contratada.telefone);
  linhaChaveValor(ctx, 'E-mail', contratada.email);
  ctx.y += 10;

  paragrafo(ctx, 'CONTRATANTE', { negrito: true, tamanho: 9.5, espacoDepois: 4, cor: COR.preto });
  linhaChaveValor(ctx, 'Nome', contrato.cliente.nome);
  linhaChaveValor(ctx, 'CPF/CNPJ', contrato.cliente.cpfCnpj);
  linhaChaveValor(ctx, 'Endereço', contrato.cliente.endereco);
  linhaChaveValor(ctx, 'Cidade/UF', [contrato.cliente.cidade, contrato.cliente.estado].filter(Boolean).join(' / '));
  linhaChaveValor(ctx, 'Telefone', contrato.cliente.telefone);
  linhaChaveValor(ctx, 'E-mail', contrato.cliente.email);
  ctx.y += 12;

  // ---- dados da obra ----
  tituloSecao(ctx, 'DA OBRA');
  linhaChaveValor(ctx, 'Identificação', contrato.obra.nome);
  linhaChaveValor(ctx, 'Endereço', contrato.obra.endereco);
  linhaChaveValor(ctx, 'Cidade/UF', [contrato.obra.cidade, contrato.obra.estado].filter(Boolean).join(' / '));
  linhaChaveValor(ctx, 'Modelo', labelModelo(contrato.modeloObra));
  linhaChaveValor(ctx, 'Área construída', contrato.obra.area ? `${contrato.obra.area} m²` : '');
  linhaChaveValor(ctx, 'Varanda', contrato.obra.varanda ? `${contrato.obra.varanda} m²` : '');
  linhaChaveValor(ctx, 'Deck', contrato.obra.deck ? `${contrato.obra.deck} m²` : '');
  linhaChaveValor(ctx, 'Pavimentos', contrato.obra.pavimentos);
  linhaChaveValor(ctx, 'Início previsto', contrato.obra.dataInicio ? formatDateBR(contrato.obra.dataInicio) : '');
  linhaChaveValor(ctx, 'Prazo de execução', contrato.obra.prazo);
  if (contrato.obra.observacoes) {
    ctx.y += 4;
    paragrafo(ctx, contrato.obra.observacoes, { tamanho: 9 });
  }
  ctx.y += 6;

  // ---- valor ----
  caixaDestaque(ctx, 'VALOR TOTAL DA OBRA', [
    formatMoney(contrato.valorTotal),
    `(${valorPorExtenso(contrato.valorTotal)})`,
  ]);

  // ---- parcelas ----
  if ((contrato.parcelas || []).length > 0) {
    tituloSecao(ctx, 'DAS PARCELAS E ETAPAS DE PAGAMENTO');
    tabela(
      ctx,
      [
        { titulo: 'Nº', chave: 'ordem', offset: 4 },
        { titulo: 'ETAPA', chave: 'etapa', offset: 34, largura: ctx.largura - 200 },
        { titulo: 'VENCIMENTO', chave: 'venc', offset: ctx.largura - 90, alinhamento: 'right' },
        { titulo: 'VALOR', chave: 'valorFmt', offset: ctx.largura - 4, alinhamento: 'right', negrito: true },
      ],
      contrato.parcelas.map((p) => ({
        ordem: p.ordem,
        etapa: p.etapa || 'Parcela',
        venc: p.vencimento ? formatDateBR(p.vencimento) : '—',
        valorFmt: formatMoney(p.valor),
      }))
    );
    garantirEspaco(ctx, 22);
    ctx.doc.setFont('helvetica', 'bold');
    ctx.doc.setFontSize(10);
    ctx.doc.setTextColor(...COR.verdeEscuro);
    ctx.doc.text('TOTAL', ctx.x, ctx.y);
    ctx.doc.text(
      formatMoney(contrato.parcelas.reduce((a, p) => a + (Number(p.valor) || 0), 0)),
      ctx.x + ctx.largura, ctx.y, { align: 'right' }
    );
    ctx.y += 22;
  }

  // ---- cláusulas do modelo da empresa ----
  const clausulas = clausulasResolvidas(contrato, config);
  if (clausulas.length > 0) {
    clausulas.forEach((c, i) => {
      const numero = NUMERO_CLAUSULA[i] || `${i + 1}ª`;
      tituloSecao(ctx, `CLÁUSULA ${numero} — ${c.titulo}`);
      paragrafo(ctx, c.texto);
    });
  } else {
    // Não inventa texto jurídico: avisa no próprio documento que o modelo
    // ainda não foi cadastrado, para ninguém assinar um contrato incompleto.
    tituloSecao(ctx, 'CLÁUSULAS');
    paragrafo(
      ctx,
      'ATENÇÃO: o texto das cláusulas ainda não foi cadastrado no sistema. Acesse Configurações → Modelo de contrato e cole o texto do contrato padrão da Casas Eco. Enquanto isso não for feito, este documento NÃO deve ser utilizado para assinatura.',
      { cor: [180, 30, 30], negrito: true }
    );
  }

  blocoAssinaturas(ctx, {
    cidade: contrato.cidadeContrato || contratada.cidade,
    data: formatDateBR(contrato.geradoEm || todayISO()),
    contratada: { nome: contratada.razaoSocial, documento: contratada.cnpj ? `CNPJ ${contratada.cnpj}` : '' },
    contratante: { nome: contrato.cliente.nome, documento: contrato.cliente.cpfCnpj ? `CPF/CNPJ ${contrato.cliente.cpfCnpj}` : '' },
    comTestemunhas: true,
  });
}

// ---- corpo do memorial ----
async function escreverMemorial(ctx, contrato, config) {
  await cabecalhoDocumento(ctx, {
    titulo: 'Memorial Descritivo',
    subtitulo: 'Especificação técnica da obra',
    numero: contrato.numero,
  });

  tituloSecao(ctx, 'IDENTIFICAÇÃO');
  linhaChaveValor(ctx, 'Cliente', contrato.cliente.nome);
  linhaChaveValor(ctx, 'Obra', contrato.obra.nome);
  linhaChaveValor(ctx, 'Endereço', contrato.obra.endereco);
  linhaChaveValor(ctx, 'Cidade/UF', [contrato.obra.cidade, contrato.obra.estado].filter(Boolean).join(' / '));
  linhaChaveValor(ctx, 'Modelo', labelModelo(contrato.modeloObra));
  linhaChaveValor(ctx, 'Área construída', contrato.obra.area ? `${contrato.obra.area} m²` : '');
  ctx.y += 10;

  const itens = memorialResolvido(contrato, config);
  if (itens.length === 0) {
    paragrafo(
      ctx,
      'ATENÇÃO: o memorial descritivo ainda não foi preenchido. Acesse Configurações → Memorial padrão e cadastre o texto de cada categoria — a partir daí todo contrato novo já virá com o memorial preenchido.',
      { cor: [180, 30, 30], negrito: true }
    );
  } else {
    itens.forEach((item) => {
      tituloSecao(ctx, item.titulo);
      paragrafo(ctx, item.texto);
    });
  }

  const contratada = contrato.contratadaSnapshot || config.contratada || {};
  blocoAssinaturas(ctx, {
    cidade: contrato.cidadeContrato || contratada.cidade,
    data: formatDateBR(contrato.geradoEm || todayISO()),
    contratada: { nome: contratada.razaoSocial, documento: contratada.cnpj ? `CNPJ ${contratada.cnpj}` : '' },
    contratante: { nome: contrato.cliente.nome, documento: contrato.cliente.cpfCnpj ? `CPF/CNPJ ${contrato.cliente.cpfCnpj}` : '' },
    comTestemunhas: false,
  });
}

export async function gerarPdfContrato(contrato, config) {
  const ctx = criarDocumento();
  await escreverContrato(ctx, contrato, config);
  rodapeTodasPaginas(ctx.doc, `Contrato ${contrato.numero || ''} · Casas Eco`.trim());
  ctx.doc.save(nomeArquivo('CONTRATO', contrato.cliente.nome));
}

export async function gerarPdfMemorial(contrato, config) {
  const ctx = criarDocumento();
  await escreverMemorial(ctx, contrato, config);
  rodapeTodasPaginas(ctx.doc, `Memorial descritivo ${contrato.numero || ''} · Casas Eco`.trim());
  ctx.doc.save(nomeArquivo('MEMORIAL', contrato.cliente.nome));
}

// Documento único com contrato + memorial, para enviar tudo de uma vez.
export async function gerarPdfContratoEMemorial(contrato, config) {
  const ctx = criarDocumento();
  await escreverContrato(ctx, contrato, config);
  novaPagina(ctx);
  await escreverMemorial(ctx, contrato, config);
  rodapeTodasPaginas(ctx.doc, `Contrato e memorial ${contrato.numero || ''} · Casas Eco`.trim());
  ctx.doc.save(nomeArquivo('CONTRATO_E_MEMORIAL', contrato.cliente.nome));
}
