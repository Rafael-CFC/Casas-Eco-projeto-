// Funções puras (sem React, sem chamadas de rede) que definem as regras do
// módulo de Boletos: como um boleto é criado, como o status dele é
// calculado a partir da data de hoje, como detectar duplicidade e como
// mapear a categoria de um boleto pra uma categoria de lançamento, quando o
// usuário opta por lançar o pagamento como despesa da obra.
import { todayISO } from '../domain';

export function novoBoleto(campos) {
  const agora = todayISO();
  return {
    id: campos.id || crypto.randomUUID(),
    beneficiario: (campos.beneficiario || '').trim(),
    cnpjCpfBeneficiario: (campos.cnpjCpfBeneficiario || '').trim(),
    bancoEmissor: (campos.bancoEmissor || '').trim(),
    numeroDocumento: (campos.numeroDocumento || '').trim(),
    nossoNumero: (campos.nossoNumero || '').trim(),
    linhaDigitavel: (campos.linhaDigitavel || '').trim(),
    codigoBarras: (campos.codigoBarras || '').trim(),
    valor: Number(campos.valor) || 0,
    emissao: campos.emissao || null,
    vencimento: campos.vencimento,
    categoria: campos.categoria || 'OUTROS',
    descricao: (campos.descricao || '').trim(),
    obraId: campos.obraId || null,
    fornecedorNome: (campos.fornecedorNome || '').trim(),
    status: 'pendente',
    dataPagamento: null,
    valorPago: null,
    observacaoPagamento: '',
    lancamentoGeradoId: null,
    fotoPath: campos.fotoPath || null,
    fotoNome: campos.fotoNome || null,
    dadosOcr: campos.dadosOcr || null,
    criadoEm: agora,
    atualizadoEm: agora,
  };
}

export function atualizarCamposBoleto(boleto, campos) {
  return {
    ...boleto,
    ...campos,
    beneficiario: (campos.beneficiario ?? boleto.beneficiario).trim(),
    valor: campos.valor !== undefined ? Number(campos.valor) || 0 : boleto.valor,
    atualizadoEm: todayISO(),
  };
}

export function registrarPagamento(boleto, { dataPagamento, valorPago, observacaoPagamento }) {
  return {
    ...boleto,
    status: 'pago',
    dataPagamento: dataPagamento || todayISO(),
    valorPago: valorPago !== undefined && valorPago !== null && valorPago !== '' ? Number(valorPago) : boleto.valor,
    observacaoPagamento: (observacaoPagamento || '').trim(),
    atualizadoEm: todayISO(),
  };
}

export function reabrirBoleto(boleto) {
  return {
    ...boleto,
    status: 'pendente',
    dataPagamento: null,
    valorPago: null,
    observacaoPagamento: '',
    atualizadoEm: todayISO(),
  };
}

export function cancelarBoletoObj(boleto, motivo) {
  return {
    ...boleto,
    status: 'cancelado',
    observacaoPagamento: motivo ? `Cancelado: ${motivo}` : boleto.observacaoPagamento,
    atualizadoEm: todayISO(),
  };
}

function addDiasISO(iso, dias) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

// Classificação usada tanto pro agrupamento da listagem quanto pelas cores
// de alerta de vencimento. Espelha `classificarConta` (src/App.jsx).
export function classificarBoleto(boleto, hojeISO = todayISO()) {
  if (boleto.status === 'cancelado') return 'cancelado';
  if (boleto.status === 'pago') return 'pago';
  const em1 = addDiasISO(hojeISO, 1);
  const em7 = addDiasISO(hojeISO, 7);
  if (boleto.vencimento < hojeISO) return 'vencido';
  if (boleto.vencimento === hojeISO) return 'venceHoje';
  if (boleto.vencimento <= em1) return 'venceEm1Dia';
  if (boleto.vencimento <= em7) return 'venceEm7Dias';
  return 'futuro';
}

function normalizarDigitos(s) {
  return String(s || '').replace(/\D/g, '');
}

// Procura um boleto já cadastrado que pareça ser o mesmo documento.
// 'forte': mesma linha digitável ou código de barras — praticamente certeza.
// 'provavel': mesmo valor+beneficiário+vencimento, ou mesmo número do
// documento+beneficiário — pode ser coincidência, então só avisa.
export function encontrarPossivelDuplicata(novoBoletoObj, boletosExistentes, idIgnorar) {
  const ativos = boletosExistentes.filter((b) => b.status !== 'cancelado' && b.id !== idIgnorar);

  const forte = ativos.find((b) =>
    (novoBoletoObj.linhaDigitavel && b.linhaDigitavel && normalizarDigitos(b.linhaDigitavel) === normalizarDigitos(novoBoletoObj.linhaDigitavel)) ||
    (novoBoletoObj.codigoBarras && b.codigoBarras && normalizarDigitos(b.codigoBarras) === normalizarDigitos(novoBoletoObj.codigoBarras))
  );
  if (forte) return { tipo: 'forte', boleto: forte };

  const provavel = ativos.find((b) =>
    Number(b.valor) === Number(novoBoletoObj.valor) &&
    b.beneficiario.trim().toLowerCase() === novoBoletoObj.beneficiario.trim().toLowerCase() &&
    b.vencimento === novoBoletoObj.vencimento
  );
  if (provavel) return { tipo: 'provavel', boleto: provavel };

  const porDocumento = ativos.find((b) =>
    novoBoletoObj.numeroDocumento && b.numeroDocumento &&
    b.numeroDocumento.trim() === novoBoletoObj.numeroDocumento.trim() &&
    b.beneficiario.trim().toLowerCase() === novoBoletoObj.beneficiario.trim().toLowerCase()
  );
  if (porDocumento) return { tipo: 'provavel', boleto: porDocumento };

  return null;
}

// As categorias de custo da obra estão em CATEGORIAS (src/domain.js).
// "MÃO DE OBRA" e "MADEIRA" têm correspondência direta; as demais caem em
// "material_bruto" como categoria genérica de custo, preservando a
// categoria original do boleto na observação do lançamento gerado.
export function mapearCategoriaBoletoParaLancamento(categoriaBoleto) {
  if (categoriaBoleto === 'MÃO DE OBRA') return 'mao_de_obra';
  if (categoriaBoleto === 'MADEIRA') return 'madeiras';
  return 'material_bruto';
}
