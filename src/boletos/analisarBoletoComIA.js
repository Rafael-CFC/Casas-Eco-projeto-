// Fase 2 (adiada até termos uma chave de API de um provedor de IA com
// visão): esta função hoje não faz nada de verdade — sempre devolve "não
// identificado" para todos os campos, e o formulário abre vazio com a foto
// já anexada, pra o usuário preencher na mão. Quando a Fase 2 for
// implementada, só o CORPO desta função muda (chamando uma function de
// servidor que envia a imagem pro provedor de IA e devolve os campos
// lidos) — nada no formulário ou no fluxo de upload precisa mudar.
export async function analisarBoletoComIA(imagemBlob) {
  return {
    identificado: false,
    campos: {
      beneficiario: null,
      cnpjCpfBeneficiario: null,
      valor: null,
      vencimento: null,
      emissao: null,
      numeroDocumento: null,
      nossoNumero: null,
      linhaDigitavel: null,
      codigoBarras: null,
      bancoEmissor: null,
    },
    confiancas: {},
  };
}
