// Configurações da empresa e modelos de documento (contrato e memorial).
// Fica salvo no mesmo banco dos outros dados, na chave "configuracao" —
// um único registro (objeto), não uma lista.
//
// O texto do contrato e do memorial já vem preenchido com o modelo REAL da
// Casas Eco (ver src/contratos/modeloCasasEco.js). Aqui só ficam guardadas
// as edições que a empresa fizer no modelo daqui pra frente.
import { todayISO } from '../domain';
import { BLOCOS_CONTRATO, BLOCOS_MEMORIAL, CONTRATADA_PADRAO } from '../contratos/modeloCasasEco';

export function configuracaoVazia() {
  return {
    contratada: { ...CONTRATADA_PADRAO },
    cidadeContrato: CONTRATADA_PADRAO.cidade,
    modeloContrato: {
      versao: 1,
      blocos: BLOCOS_CONTRATO.map((b) => ({ chave: b.chave, texto: b.texto })),
      atualizadoEm: todayISO(),
    },
    modeloMemorial: {
      versao: 1,
      blocos: BLOCOS_MEMORIAL.map((b) => ({ chave: b.chave, texto: b.texto })),
      atualizadoEm: todayISO(),
    },
    atualizadoEm: todayISO(),
  };
}

// Junta a estrutura fixa (rótulos, títulos, ordem) com o texto salvo.
// Se um bloco nunca foi editado, usa o texto original do modelo.
function mesclarBlocos(estrutura, salvos) {
  const porChave = Object.fromEntries((salvos || []).map((b) => [b.chave, b.texto]));
  return estrutura.map((b) => ({
    ...b,
    texto: porChave[b.chave] !== undefined ? porChave[b.chave] : b.texto,
  }));
}

export function blocosContratoDaConfig(config) {
  return mesclarBlocos(BLOCOS_CONTRATO, config?.modeloContrato?.blocos);
}

export function blocosMemorialDaConfig(config) {
  return mesclarBlocos(BLOCOS_MEMORIAL, config?.modeloMemorial?.blocos);
}

// Garante que uma configuração carregada do banco tenha todos os campos
// esperados, mesmo que tenha sido salva por uma versão anterior do sistema.
export function normalizarConfiguracao(bruta) {
  const base = configuracaoVazia();
  if (!bruta) return base;
  return {
    ...base,
    ...bruta,
    contratada: { ...base.contratada, ...(bruta.contratada || {}) },
    cidadeContrato: bruta.cidadeContrato || base.cidadeContrato,
    modeloContrato: {
      versao: bruta.modeloContrato?.versao || 1,
      atualizadoEm: bruta.modeloContrato?.atualizadoEm || base.modeloContrato.atualizadoEm,
      blocos: mesclarBlocos(BLOCOS_CONTRATO, bruta.modeloContrato?.blocos).map((b) => ({ chave: b.chave, texto: b.texto })),
    },
    modeloMemorial: {
      versao: bruta.modeloMemorial?.versao || 1,
      atualizadoEm: bruta.modeloMemorial?.atualizadoEm || base.modeloMemorial.atualizadoEm,
      blocos: mesclarBlocos(BLOCOS_MEMORIAL, bruta.modeloMemorial?.blocos).map((b) => ({ chave: b.chave, texto: b.texto })),
    },
  };
}

export function contratadaEstaPreenchida(config) {
  const c = config?.contratada;
  return !!(c && c.razaoSocial?.trim() && c.cnpj?.trim());
}

// ---- substituição de marcadores ----
export const MARCADORES_DISPONIVEIS = [
  { chave: '{{CLIENTE_NOME}}', descricao: 'Nome do cliente' },
  { chave: '{{CLIENTE_CPF}}', descricao: 'CPF/CNPJ do cliente' },
  { chave: '{{CLIENTE_ENDERECO}}', descricao: 'Endereço do cliente' },
  { chave: '{{DESCRICAO_OBRA}}', descricao: 'Descrição da casa (áreas, varanda, deck…)' },
  { chave: '{{INICIO_OBRA}}', descricao: 'Quando a obra começa' },
  { chave: '{{PRAZO_ENTREGA}}', descricao: 'Prazo de entrega em dias' },
  { chave: '{{VALOR_TOTAL}}', descricao: 'Valor total (R$ 126.039,00)' },
  { chave: '{{VALOR_TOTAL_EXTENSO}}', descricao: 'Valor por extenso' },
  { chave: '{{TABELA_PARCELAS}}', descricao: 'Tabela das parcelas' },
  { chave: '{{DATA_CONTRATO_EXTENSO}}', descricao: 'Data do contrato por extenso' },
  { chave: '{{CIDADE_DATA}}', descricao: 'Cidade e data de assinatura' },
  { chave: '{{CONTRATADA_RAZAO_SOCIAL}}', descricao: 'Razão social da Casas Eco' },
  { chave: '{{CONTRATADA_CNPJ}}', descricao: 'CNPJ da Casas Eco' },
  { chave: '{{CONTRATADA_ENDERECO}}', descricao: 'Endereço da Casas Eco' },
  { chave: '{{CONTRATADA_REPRESENTANTE}}', descricao: 'Nome do representante' },
  { chave: '{{CONTRATADA_CPF}}', descricao: 'CPF do representante' },
];

export function aplicarMarcadores(texto, valores) {
  if (!texto) return '';
  return Object.entries(valores).reduce(
    (acc, [marcador, valor]) => acc.split(marcador).join(valor == null || valor === '' ? '' : String(valor)),
    texto
  );
}
