// A porta de entrada para um modelo de IA — preparada, e desligada até
// alguém configurar.
//
// REGRA QUE NÃO SE QUEBRA: a chave da IA NUNCA fica no site. Qualquer
// chave colocada aqui no front-end estaria à mão de quem abrisse o
// endereço, e a conta viria para o dono. Por isso o site não fala com a
// OpenAI (nem com ninguém) direto: ele fala com um endereço NOSSO, que
// guarda a chave do lado do servidor — uma Edge Function do Supabase, que
// é onde o sistema já tem conta.
//
// O endereço é uma Edge Function que já está escrita neste repositório, em
// supabase/functions/ler-nota — lá está o passo a passo para publicar. Para
// ligar, depois de publicar, basta configurar na Vercel:
//
//   VITE_IA_ENDPOINT = https://<projeto>.supabase.co/functions/v1/ler-nota
//
// Enquanto isso não existir, `iaConfigurada()` devolve false e as telas
// explicam o que falta, em vez de quebrar ou fingir que leram.
//
// Quem chama é sempre uma pessoa logada: o crachá da sessão vai no
// cabeçalho e o Supabase confere antes de a função rodar. Sem login, a
// chamada não chega ao modelo — e não vira gasto.
//
// Controle de custo: cada chamada tem um teto de tamanho e um tempo
// máximo de espera, e o erro volta explicado para a tela mostrar.

import { sessaoAtual } from '../auth/authStore';

const ENDPOINT = (import.meta.env && import.meta.env.VITE_IA_ENDPOINT) || '';
const TAMANHO_MAXIMO = 6 * 1024 * 1024; // 6 MB de foto
const ESPERA_MAXIMA = 45000; // 45s

export function iaConfigurada() {
  return typeof ENDPOINT === 'string' && ENDPOINT.startsWith('http');
}

export function motivoIaDesligada() {
  return 'A leitura por foto precisa de um endereço de IA configurado (VITE_IA_ENDPOINT). '
    + 'Enquanto isso, dá para colar o texto da nota ou importar o XML.';
}

// Manda a foto e recebe o TEXTO da nota. Quem lê o texto e monta os
// itens continua sendo o nosso código (src/notas/lerNota.js) — o modelo
// só transcreve. Assim o número que entra na obra sempre passa pelas
// mesmas conferências (multiplicação de cada linha e soma contra o total).
export async function lerNotaPorFoto(arquivo) {
  if (!iaConfigurada()) return { ok: false, erro: motivoIaDesligada() };
  if (!arquivo) return { ok: false, erro: 'Escolha uma foto da nota.' };
  if (arquivo.size > TAMANHO_MAXIMO) {
    return { ok: false, erro: 'A foto está muito grande (máximo 6 MB). Tire outra com menos resolução.' };
  }

  const sessao = await sessaoAtual().catch(() => null);
  if (!sessao?.access_token) {
    return { ok: false, erro: 'Sua sessão expirou. Saia e entre de novo para ler a nota por foto.' };
  }

  const corte = new AbortController();
  const relogio = setTimeout(() => corte.abort(), ESPERA_MAXIMA);
  try {
    const corpo = new FormData();
    corpo.append('arquivo', arquivo);
    const resposta = await fetch(ENDPOINT, {
      method: 'POST',
      body: corpo,
      signal: corte.signal,
      headers: { Authorization: `Bearer ${sessao.access_token}` },
    });
    if (!resposta.ok) {
      // A função devolve o motivo em português; se vier outra coisa, o
      // número do erro já diz mais que "algo deu errado".
      const dito = await resposta.json().catch(() => null);
      return {
        ok: false,
        erro: dito?.erro || `O serviço de leitura respondeu ${resposta.status}. Tente de novo em instantes.`,
      };
    }
    const dados = await resposta.json();
    if (!dados || typeof dados.texto !== 'string' || !dados.texto.trim()) {
      return { ok: false, erro: 'O serviço não devolveu texto nenhum para essa foto.' };
    }
    return { ok: true, texto: dados.texto, custo: dados.custo || null };
  } catch (e) {
    if (e && e.name === 'AbortError') {
      return { ok: false, erro: 'A leitura demorou demais e foi cancelada. Tente uma foto menor.' };
    }
    return { ok: false, erro: 'Não foi possível falar com o serviço de leitura.' };
  } finally {
    clearTimeout(relogio);
  }
}
