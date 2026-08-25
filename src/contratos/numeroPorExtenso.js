// Converte um valor em reais para texto por extenso (português do Brasil).
// Usado nos contratos, onde o valor precisa aparecer escrito por extenso.
// Ex.: 200000 -> "duzentos mil reais"
//      1234.56 -> "mil, duzentos e trinta e quatro reais e cinquenta e seis centavos"

const UNIDADES = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
const DEZ_A_DEZENOVE = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
const DEZENAS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const CENTENAS = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

// Escalas: [singular, plural] a cada 3 dígitos
const ESCALAS = [
  ['', ''],
  ['mil', 'mil'],
  ['milhão', 'milhões'],
  ['bilhão', 'bilhões'],
];

// Converte um grupo de 1 a 3 dígitos (1..999) em extenso.
function grupoPorExtenso(n) {
  if (n === 100) return 'cem';
  const c = Math.floor(n / 100);
  const resto = n % 100;
  const partes = [];
  if (c > 0) partes.push(CENTENAS[c]);
  if (resto > 0) {
    if (resto < 10) partes.push(UNIDADES[resto]);
    else if (resto < 20) partes.push(DEZ_A_DEZENOVE[resto - 10]);
    else {
      const d = Math.floor(resto / 10);
      const u = resto % 10;
      partes.push(u > 0 ? `${DEZENAS[d]} e ${UNIDADES[u]}` : DEZENAS[d]);
    }
  }
  return partes.join(' e ');
}

// Converte um número inteiro (0..999.999.999.999) em extenso.
export function inteiroPorExtenso(numero) {
  const n = Math.floor(Math.abs(Number(numero) || 0));
  if (n === 0) return 'zero';

  // quebra em grupos de 3 dígitos, do menos significativo para o mais
  const grupos = [];
  let resto = n;
  while (resto > 0) {
    grupos.push(resto % 1000);
    resto = Math.floor(resto / 1000);
  }

  const partes = [];
  for (let i = grupos.length - 1; i >= 0; i--) {
    const g = grupos[i];
    if (g === 0) continue;
    const [singular, plural] = ESCALAS[i] || ['', ''];
    if (i === 1 && g === 1) {
      partes.push('mil'); // "mil", nunca "um mil"
    } else {
      const escala = i === 0 ? '' : ` ${g === 1 ? singular : plural}`;
      partes.push(`${grupoPorExtenso(g)}${escala}`);
    }
  }

  // Regra de ligação: o último grupo entra com " e " quando é menor que 100
  // ou múltiplo exato de 100 (ex.: "mil e duzentos", "dois mil e cinquenta");
  // caso contrário separa por vírgula ("mil, duzentos e trinta e quatro").
  if (partes.length === 1) return partes[0];
  const ultimoGrupo = grupos[0];
  const ultimo = partes[partes.length - 1];
  const anteriores = partes.slice(0, -1);
  const ligaComE = ultimoGrupo > 0 && (ultimoGrupo < 100 || ultimoGrupo % 100 === 0);
  return ligaComE ? `${anteriores.join(', ')} e ${ultimo}` : `${anteriores.join(', ')}, ${ultimo}`;
}

// Valor monetário completo: "duzentos mil reais", "um real e cinquenta centavos".
export function valorPorExtenso(valor) {
  const v = Math.abs(Number(valor) || 0);
  const inteiros = Math.floor(v);
  const centavos = Math.round((v - inteiros) * 100);

  const partes = [];
  if (inteiros > 0) {
    const extenso = inteiroPorExtenso(inteiros);
    // "um milhão DE reais" — a preposição só aparece quando o valor termina
    // exatamente em milhão/milhões/bilhão/bilhões (não em "um milhão e quinhentos mil reais").
    const terminaEmEscalaGrande = /(milhão|milhões|bilhão|bilhões)$/.test(extenso);
    const moeda = inteiros === 1 ? 'real' : 'reais';
    partes.push(`${extenso}${terminaEmEscalaGrande ? ' de' : ''} ${moeda}`);
  }
  if (centavos > 0) {
    partes.push(`${inteiroPorExtenso(centavos)} ${centavos === 1 ? 'centavo' : 'centavos'}`);
  }
  if (partes.length === 0) return 'zero reais';
  return partes.join(' e ');
}
