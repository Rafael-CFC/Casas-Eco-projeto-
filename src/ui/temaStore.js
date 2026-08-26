// Tema claro/escuro do site.
//
// A escolha fica guardada no próprio navegador (localStorage), não no
// banco: é preferência de quem está usando aquele aparelho, e assim o
// celular pode ficar escuro e o computador claro, se a pessoa quiser.
//
// Quem pinta a tela é o CSS: este arquivo só põe (ou tira) a classe
// `dark` no <html>, e o src/index.css tem as duas paletas.
export const CHAVE_TEMA = 'casaseco-tema';

export const TEMAS = [
  { key: 'escuro', label: 'Escuro' },
  { key: 'claro', label: 'Claro' },
  { key: 'sistema', label: 'Automático' },
];

// Escuro é o padrão de quem nunca escolheu nada.
export const TEMA_PADRAO = 'escuro';

export function temaValido(valor) {
  return TEMAS.some((t) => t.key === valor);
}

export function lerTema() {
  try {
    const salvo = localStorage.getItem(CHAVE_TEMA);
    return temaValido(salvo) ? salvo : TEMA_PADRAO;
  } catch (e) {
    return TEMA_PADRAO;
  }
}

export function sistemaPrefereEscuro() {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch (e) {
    return false;
  }
}

export function ehEscuro(tema) {
  if (tema === 'sistema') return sistemaPrefereEscuro();
  return tema !== 'claro';
}

// Aplica o tema no documento. `animar` faz a troca acontecer com um
// fade curtinho em vez de piscar de uma cor para a outra.
export function aplicarTema(tema, { animar = false } = {}) {
  const raiz = document.documentElement;
  const escuro = ehEscuro(tema);

  if (animar) {
    raiz.classList.add('tema-trocando');
    window.setTimeout(() => raiz.classList.remove('tema-trocando'), 280);
  }

  raiz.classList.toggle('dark', escuro);
  raiz.style.colorScheme = escuro ? 'dark' : 'light';

  // pinta também a barra do navegador no celular, para a tela não ficar
  // escura com uma faixa branca em cima
  const marca = document.querySelector('meta[name="theme-color"]');
  if (marca) marca.setAttribute('content', escuro ? '#12100f' : '#fafaf9');
}

export function salvarTema(tema) {
  try {
    localStorage.setItem(CHAVE_TEMA, tema);
  } catch (e) {
    /* navegador sem armazenamento: o tema vale só enquanto a aba estiver aberta */
  }
}

// ---------------------------------------------------------------------
// Um tema só para o site inteiro
//
// Existe mais de um botão de tema na tela ao mesmo tempo (barra lateral e
// menu "Mais" do celular), e os gráficos também precisam saber se está
// escuro. Todos escutam este mesmo lugar, então clicar em um deles
// atualiza todo mundo na hora.
// ---------------------------------------------------------------------
const ouvintes = new Set();
let temaAtual = null; // preenchido na primeira leitura

function avisarOuvintes() {
  ouvintes.forEach((fn) => fn());
}

export function temaAtivo() {
  if (temaAtual === null) temaAtual = lerTema();
  return temaAtual;
}

export function assinarTema(fn) {
  ouvintes.add(fn);
  return () => ouvintes.delete(fn);
}

export function definirTema(tema) {
  temaAtual = temaValido(tema) ? tema : TEMA_PADRAO;
  salvarTema(temaAtual);
  aplicarTema(temaAtual, { animar: true });
  avisarOuvintes();
}

// Quando o tema é "Automático" e o aparelho troca para o modo noturno,
// o site acompanha sozinho.
try {
  const consulta = window.matchMedia('(prefers-color-scheme: dark)');
  consulta.addEventListener('change', () => {
    if (temaAtivo() !== 'sistema') return;
    aplicarTema('sistema', { animar: true });
    avisarOuvintes();
  });
} catch (e) {
  /* navegador antigo sem matchMedia: fica no tema escolhido, sem seguir o sistema */
}
