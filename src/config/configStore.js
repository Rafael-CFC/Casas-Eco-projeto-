// Configurações da empresa e modelos de documento (contrato e memorial).
// Fica salvo no mesmo banco dos outros dados, na chave "configuracao" —
// um único registro (objeto), não uma lista.
//
// IMPORTANTE sobre o texto do contrato e do memorial: o sistema NÃO traz
// texto jurídico pronto. Ele traz a ESTRUTURA (as cláusulas numeradas e as
// categorias do memorial) e você cola, uma única vez, o texto do modelo que
// a Casas Eco já usa. A partir daí todo contrato novo já nasce com esse
// texto preenchido — só o que é específico daquele cliente/obra muda.
import { todayISO } from '../domain';

export const MODELOS_OBRA = [
  { key: 'mista', label: 'Casa mista (madeira + alvenaria)' },
  { key: 'madeira', label: 'Casa 100% madeira' },
  { key: 'personalizada', label: 'Casa personalizada' },
  { key: 'outro', label: 'Outro' },
];

// Estrutura padrão de um contrato de empreitada de construção. Só os
// TÍTULOS vêm preenchidos — o texto de cada cláusula é do modelo da própria
// empresa e é colado uma vez em Configurações.
export const CLAUSULAS_PADRAO = [
  { chave: 'objeto', titulo: 'DO OBJETO' },
  { chave: 'descricao', titulo: 'DA DESCRIÇÃO DA CONSTRUÇÃO' },
  { chave: 'valor', titulo: 'DO VALOR E DA FORMA DE PAGAMENTO' },
  { chave: 'prazo', titulo: 'DO PRAZO DE EXECUÇÃO' },
  { chave: 'obrigacoes_contratada', titulo: 'DAS OBRIGAÇÕES DA CONTRATADA' },
  { chave: 'obrigacoes_contratante', titulo: 'DAS OBRIGAÇÕES DO CONTRATANTE' },
  { chave: 'rescisao', titulo: 'DA RESCISÃO' },
  { chave: 'disposicoes', titulo: 'DAS DISPOSIÇÕES GERAIS' },
  { chave: 'foro', titulo: 'DO FORO' },
];

// Categorias do memorial descritivo (conforme o memorial da Casas Eco).
export const CATEGORIAS_MEMORIAL = [
  { chave: 'fundacao', titulo: 'FUNDAÇÃO' },
  { chave: 'paredes_alvenaria', titulo: 'PAREDES DE ALVENARIA' },
  { chave: 'paredes_madeira', titulo: 'PAREDES DE MADEIRA' },
  { chave: 'cobertura', titulo: 'COBERTURA' },
  { chave: 'forracao', titulo: 'FORRAÇÃO DO TETO E BEIRAL' },
  { chave: 'aberturas', titulo: 'ABERTURAS' },
  { chave: 'ferragens', titulo: 'FERRAGENS' },
  { chave: 'hidraulica', titulo: 'INSTALAÇÕES HIDRÁULICAS' },
  { chave: 'eletrica', titulo: 'INSTALAÇÕES ELÉTRICAS' },
  { chave: 'loucas', titulo: 'LOUÇAS DE BANHEIRO' },
  { chave: 'pisos', titulo: 'PISOS E AZULEJOS' },
  { chave: 'observacoes', titulo: 'OBSERVAÇÕES' },
];

// Etapas de pagamento usadas com mais frequência — servem só como atalho
// para montar as parcelas mais rápido, e podem ser editadas/removidas.
export const ETAPAS_SUGERIDAS = [
  'CONTRATO',
  'INÍCIO DA OBRA',
  'FUNDAÇÃO',
  'DESCARGA DA MADEIRA',
  'COBERTURA',
  'ABERTURAS',
  'CHAVES',
];

export function configuracaoVazia() {
  return {
    contratada: {
      razaoSocial: '',
      cnpj: '',
      endereco: '',
      cidade: '',
      estado: '',
      representante: '',
      cpfRepresentante: '',
      telefone: '',
      email: '',
      dadosBancarios: '',
    },
    cidadeContrato: '',
    modeloContrato: {
      versao: 1,
      clausulas: CLAUSULAS_PADRAO.map((c) => ({ ...c, texto: '' })),
      atualizadoEm: todayISO(),
    },
    modelosMemorial: {},
    atualizadoEm: todayISO(),
  };
}

// Garante que uma configuração carregada do banco tenha todos os campos
// esperados, mesmo que tenha sido salva por uma versão anterior do sistema.
export function normalizarConfiguracao(bruta) {
  const base = configuracaoVazia();
  if (!bruta) return base;
  const clausulasSalvas = bruta.modeloContrato?.clausulas || [];
  return {
    ...base,
    ...bruta,
    contratada: { ...base.contratada, ...(bruta.contratada || {}) },
    modeloContrato: {
      versao: bruta.modeloContrato?.versao || 1,
      atualizadoEm: bruta.modeloContrato?.atualizadoEm || base.modeloContrato.atualizadoEm,
      // mantém a ordem/estrutura padrão, aproveitando o texto já salvo
      clausulas: CLAUSULAS_PADRAO.map((padrao) => {
        const salva = clausulasSalvas.find((c) => c.chave === padrao.chave);
        return { ...padrao, titulo: salva?.titulo || padrao.titulo, texto: salva?.texto || '' };
      }),
    },
    modelosMemorial: bruta.modelosMemorial || {},
  };
}

export function memorialPadraoDoModelo(config, modeloObra) {
  const salvo = config.modelosMemorial?.[modeloObra];
  const textosSalvos = salvo?.categorias || [];
  return CATEGORIAS_MEMORIAL.map((padrao) => {
    const s = textosSalvos.find((c) => c.chave === padrao.chave);
    return { ...padrao, texto: s?.texto || '' };
  });
}

export function contratadaEstaPreenchida(config) {
  const c = config?.contratada;
  return !!(c && c.razaoSocial.trim() && c.cnpj.trim());
}

export function modeloContratoEstaPreenchido(config) {
  return (config?.modeloContrato?.clausulas || []).some((c) => c.texto.trim());
}

// ---- substituição de marcadores ----
// Os textos do modelo podem conter marcadores como {{CLIENTE_NOME}} que são
// trocados pelos dados reais na hora de gerar o documento.
export const MARCADORES_DISPONIVEIS = [
  { chave: '{{CONTRATADA_RAZAO_SOCIAL}}', descricao: 'Razão social da Casas Eco' },
  { chave: '{{CONTRATADA_CNPJ}}', descricao: 'CNPJ da Casas Eco' },
  { chave: '{{CONTRATADA_ENDERECO}}', descricao: 'Endereço da Casas Eco' },
  { chave: '{{CONTRATADA_REPRESENTANTE}}', descricao: 'Nome do representante' },
  { chave: '{{CONTRATADA_CPF}}', descricao: 'CPF do representante' },
  { chave: '{{CONTRATADA_TELEFONE}}', descricao: 'Telefone da Casas Eco' },
  { chave: '{{CONTRATADA_EMAIL}}', descricao: 'E-mail da Casas Eco' },
  { chave: '{{CONTRATADA_DADOS_BANCARIOS}}', descricao: 'Dados bancários' },
  { chave: '{{CLIENTE_NOME}}', descricao: 'Nome do cliente' },
  { chave: '{{CLIENTE_CPF_CNPJ}}', descricao: 'CPF/CNPJ do cliente' },
  { chave: '{{CLIENTE_ENDERECO}}', descricao: 'Endereço do cliente' },
  { chave: '{{CLIENTE_CIDADE}}', descricao: 'Cidade do cliente' },
  { chave: '{{CLIENTE_ESTADO}}', descricao: 'Estado do cliente' },
  { chave: '{{CLIENTE_TELEFONE}}', descricao: 'Telefone do cliente' },
  { chave: '{{OBRA_NOME}}', descricao: 'Nome da obra' },
  { chave: '{{OBRA_ENDERECO}}', descricao: 'Endereço da obra' },
  { chave: '{{OBRA_CIDADE}}', descricao: 'Cidade da obra' },
  { chave: '{{OBRA_ESTADO}}', descricao: 'Estado da obra' },
  { chave: '{{OBRA_AREA}}', descricao: 'Área construída (m²)' },
  { chave: '{{OBRA_VARANDA}}', descricao: 'Área de varanda' },
  { chave: '{{OBRA_DECK}}', descricao: 'Área de deck' },
  { chave: '{{OBRA_PAVIMENTOS}}', descricao: 'Número de pavimentos' },
  { chave: '{{OBRA_DATA_INICIO}}', descricao: 'Data de início da obra' },
  { chave: '{{OBRA_PRAZO}}', descricao: 'Prazo de execução' },
  { chave: '{{VALOR_TOTAL}}', descricao: 'Valor total (R$ 200.000,00)' },
  { chave: '{{VALOR_TOTAL_EXTENSO}}', descricao: 'Valor por extenso' },
  { chave: '{{NUMERO_PARCELAS}}', descricao: 'Quantidade de parcelas' },
  { chave: '{{TABELA_PARCELAS}}', descricao: 'Lista das parcelas (etapa e valor)' },
  { chave: '{{DATA_HOJE}}', descricao: 'Data de hoje' },
  { chave: '{{CIDADE_CONTRATO}}', descricao: 'Cidade de assinatura' },
];

export function aplicarMarcadores(texto, valores) {
  if (!texto) return '';
  return Object.entries(valores).reduce(
    (acc, [marcador, valor]) => acc.split(marcador).join(valor == null || valor === '' ? '—' : String(valor)),
    texto
  );
}
