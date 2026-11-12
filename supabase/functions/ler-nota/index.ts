// A função que lê a foto da nota — e o lugar onde a chave da IA mora.
//
// POR QUE ESTE ARQUIVO EXISTE: o site é uma página aberta. Qualquer chave
// colocada lá dentro fica à vista de quem abre o código no navegador, e a
// conta chega para o dono. Então o site NÃO fala com a IA: ele manda a
// foto para cá, e é aqui — dentro do servidor do Supabase — que a chave é
// usada. A chave nunca sai daqui.
//
// O que esta função faz, e só isso: recebe a foto, pede ao modelo que
// TRANSCREVA o que está escrito, e devolve o texto. Quem separa os itens,
// confere a multiplicação de cada linha e compara a soma com o total
// continua sendo o código do site (src/notas/lerNota.js). O modelo não
// decide número nenhum: ele só lê o papel.
//
// ---- COMO LIGAR (uma vez) ----
//
//  1. instale a CLI do Supabase e entre no projeto;
//  2. guarde a chave da Anthropic no servidor (ela não vai para o site):
//
//       supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//
//  3. publique a função:
//
//       supabase functions deploy ler-nota
//
//  4. na Vercel, crie a variável do site apontando para cá:
//
//       VITE_IA_ENDPOINT = https://<projeto>.supabase.co/functions/v1/ler-nota
//
// Enquanto o passo 4 não existir, a tela continua dizendo que a leitura
// por foto está desligada — e colar o texto da nota segue funcionando.
//
// ---- CONTROLE DE CUSTO ----
//
//  - só entra quem está logado no sistema (o Supabase confere o crachá
//    antes de a função rodar; sem login, a chamada nem chega aqui);
//  - foto acima de 6 MB é recusada antes de virar gasto;
//  - o esforço do modelo fica em "low": transcrever não precisa de
//    raciocínio longo, e é aí que o preço cresce;
//  - quem quiser gastar menos ainda pode trocar o modelo pela variável
//    IA_MODELO (claude-haiku-5-5 custa bem menos; claude-opus-5-5, o
//    padrão daqui, lê papel ruim melhor).
import Anthropic from 'npm:@anthropic-ai/sdk@1.8.0';

const CHAVE = Deno.env.get('ANTHROPIC_API_KEY') || '';
const MODELO = Deno.env.get('IA_MODELO') || 'claude-opus-5-5';
const TAMANHO_MAXIMO = 6 * 1024 * 1024;

const TIPOS_DE_IMAGEM = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const CABECALHOS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

// A instrução é curta de propósito e diz duas vezes a mesma coisa: não
// inventar. Dígito que não dá para ler vira "?" — um "?" na tela o dono
// resolve em dois segundos; um número inventado ele só descobre quando o
// gasto da obra não fecha.
const INSTRUCAO = [
  'Transcreva EXATAMENTE o texto desta nota/cupom, linha por linha, na mesma ordem do papel.',
  'Mantenha os números como estão escritos, com os pontos e as vírgulas do papel.',
  'Uma linha de produto por linha de texto, separando as colunas por TAB.',
  'NÃO calcule, NÃO corrija, NÃO complete e NÃO invente nada.',
  'Se um dígito estiver ilegível, escreva ? no lugar dele.',
  'Se a imagem não for uma nota ou cupom, responda apenas: SEM NOTA.',
  'Responda só com a transcrição, sem comentários.',
].join(' ');

function erro(mensagem: string, status = 400) {
  return new Response(JSON.stringify({ erro: mensagem }), { status, headers: CABECALHOS });
}

// Buffer grande não aceita espalhar os bytes de uma vez (estoura a pilha);
// vai em pedaços.
function paraBase64(bytes: Uint8Array) {
  let bruto = '';
  const pedaco = 8192;
  for (let i = 0; i < bytes.length; i += pedaco) {
    bruto += String.fromCharCode(...bytes.subarray(i, i + pedaco));
  }
  return btoa(bruto);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CABECALHOS });
  if (req.method !== 'POST') return erro('Use POST.', 405);
  if (!CHAVE) return erro('A chave da IA não está configurada no servidor (ANTHROPIC_API_KEY).', 500);

  let arquivo: File | null = null;
  try {
    const corpo = await req.formData();
    const campo = corpo.get('arquivo');
    if (campo instanceof File) arquivo = campo;
  } catch {
    return erro('Envie a foto como formulário, no campo "arquivo".');
  }
  if (!arquivo) return erro('Nenhuma foto recebida.');
  if (arquivo.size > TAMANHO_MAXIMO) return erro('A foto passa de 6 MB. Tire outra com menos resolução.');
  if (!TIPOS_DE_IMAGEM.has(arquivo.type)) return erro('Mande uma foto (JPEG, PNG ou WebP).');

  const dados = paraBase64(new Uint8Array(await arquivo.arrayBuffer()));
  const anthropic = new Anthropic({ apiKey: CHAVE });

  try {
    const resposta = await anthropic.beta.messages.create({
      model: MODELO,
      max_tokens: 8000,
      // Transcrever não é raciocinar: esforço baixo lê igual e custa menos.
      output_config: { effort: 'low' },
      // Se o modelo recusar a tarefa, o próprio servidor da Anthropic
      // tenta num modelo irmão, em vez de a tela voltar vazia.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: arquivo.type, data: dados } },
          { type: 'text', text: INSTRUCAO },
        ],
      }],
    });

    if (resposta.stop_reason === 'refusal') {
      return erro('O leitor não aceitou essa imagem. Tente outra foto, ou cole o texto da nota.', 422);
    }

    const texto = resposta.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { text: string }).text)
      .join('\n')
      .trim();

    if (!texto || /^SEM NOTA$/i.test(texto)) {
      return erro('Não deu para ler uma nota nessa foto. Tente de novo com mais luz, ou cole o texto.', 422);
    }

    // O custo volta junto para a tela poder mostrar — e para o dono ver
    // quanto cada leitura gastou, em vez de descobrir na fatura.
    const uso = resposta.usage || {};
    return new Response(JSON.stringify({
      texto,
      custo: {
        modelo: resposta.model,
        tokensEntrada: uso.input_tokens ?? null,
        tokensSaida: uso.output_tokens ?? null,
      },
    }), { headers: CABECALHOS });
  } catch (e) {
    // O erro técnico fica no log do servidor; para a tela vai o que dá
    // para agir em cima.
    console.error('falha ao ler a nota:', e);
    const status = (e as { status?: number })?.status;
    if (status === 429) return erro('O leitor está ocupado agora. Tente de novo em um minuto.', 429);
    if (status === 401) return erro('A chave da IA no servidor foi recusada. Confira ANTHROPIC_API_KEY.', 500);
    return erro('Não foi possível ler a foto agora.', 502);
  }
});
