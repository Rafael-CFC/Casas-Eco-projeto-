// Utilitários centralizados de normalização de texto.
// Usados em todo o app para garantir que nome de produto e unidade
// sejam sempre tratados (e salvos) em CAIXA ALTA, preservando acentos,
// números e símbolos.

// Transforma em maiúsculo enquanto o usuário digita, sem cortar espaços
// (evita "brigar" com o cursor/espaço no meio da digitação).
export function upperInput(value) {
  if (value === null || value === undefined) return '';
  return String(value).toUpperCase();
}

// Normalização final de nome de produto/descrição de item: maiúsculo,
// sem espaços duplicados e sem espaços nas pontas. Preserva acentos,
// números, símbolos e vírgulas/pontos decimais.
export function normalizeProductName(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\s+/g, ' ').trim().toUpperCase();
}

// Normalização final de unidade: maiúsculo e sem espaços nas pontas.
export function normalizeUnit(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim().toUpperCase();
}

// Comparação "à prova de digitação": tira acentos e caixa, para que
// "MOERAO" encontre "MOERÃO" e "cimento" encontre "CIMENTO". Usada nas
// buscas do catálogo e do crediário.
export function semAcento(value) {
  return String(value === null || value === undefined ? '' : value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

// Um termo de busca casa quando TODAS as palavras digitadas aparecem em
// algum dos campos — assim "cimento 50" acha "CIMENTO CP-II 50KG" mesmo
// fora de ordem.
export function combinaBusca(termo, ...campos) {
  const palavras = semAcento(termo).trim().split(/\s+/).filter(Boolean);
  if (palavras.length === 0) return true;
  const alvo = campos.map((c) => semAcento(c)).join(' ');
  return palavras.every((p) => alvo.includes(p));
}
