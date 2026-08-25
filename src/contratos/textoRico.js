// Negrito dentro do texto dos documentos.
//
// O contrato original da Casas Eco deixa em negrito a razão social, o CNPJ,
// o nome e o CPF das partes. Para conseguir o mesmo no PDF (e na tela) sem
// inventar um editor de texto rico, o trecho a destacar vai entre ** ** —
// a mesma convenção do WhatsApp, que o pessoal já conhece.
//
//   "de um lado como **CONTRATADA**: a empresa **Casas Eco ... LTDA.**"

const MARCA = /\*\*([\s\S]*?)\*\*/g;

// Quebra o texto em pedaços { texto, negrito }, preservando a ordem e os
// espaços exatamente como estão escritos.
export function partesNegrito(texto) {
  const s = String(texto == null ? '' : texto);
  const partes = [];
  let fim = 0;
  let m;
  MARCA.lastIndex = 0;
  while ((m = MARCA.exec(s)) !== null) {
    if (m.index > fim) partes.push({ texto: s.slice(fim, m.index), negrito: false });
    if (m[1] !== '') partes.push({ texto: m[1], negrito: true });
    fim = MARCA.lastIndex;
  }
  if (fim < s.length) partes.push({ texto: s.slice(fim), negrito: false });
  return partes.length > 0 ? partes : [{ texto: '', negrito: false }];
}

// Texto sem as marcações — para onde o negrito não se aplica (títulos do
// memorial, itens da lista, células da tabela de parcelas).
export function semMarcacao(texto) {
  return String(texto == null ? '' : texto).split('**').join('');
}

// Rótulo que fica em negrito no começo do parágrafo, como no documento
// original: "CLÁUSULA QUARTA:", "Parágrafo Primeiro:", "Obs.:".
//
// É fechado de propósito — uma regra mais solta engolia a frase inteira
// até um "agência:" no meio do texto e o documento saía errado. Os
// parágrafos escritos como "Paragrafo segundo - Suspensao ... :" ficam
// de fora porque no documento original eles também não são destacados.
const REGEX_ROTULO = /^((?:CL[\u00c1A]USULA\s+[A-Za-z\u00c0-\u00ff]+|Par[\u00e1a]grafo\s+[A-Za-z\u00c0-\u00ff]+|Obs\.|Observa\u00e7\u00e3o)\s*[:;])/i;

// O nome da cláusula vira um trecho em negrito como qualquer outro, desde
// que o parágrafo já não comece com um destaque escrito à mão (** **).
export function destacarRotulo(partes) {
  const primeira = partes[0];
  if (!primeira || primeira.negrito) return partes;
  const m = primeira.texto.match(REGEX_ROTULO);
  if (!m) return partes;
  const resto = primeira.texto.slice(m[1].length);
  return [
    { texto: m[1], negrito: true },
    ...(resto ? [{ texto: resto, negrito: false }] : []),
    ...partes.slice(1),
  ];
}

// Pedaços prontos para desenhar: destaques escritos com ** ** mais o
// rótulo da cláusula no começo do parágrafo.
export function partesDoParagrafo(texto) {
  return destacarRotulo(partesNegrito(texto).filter((p) => p.texto !== ''));
}
