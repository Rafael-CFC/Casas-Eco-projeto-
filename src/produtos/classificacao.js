// Reconhecer o que é o item que está sendo lançado.
//
// O dono digita "Cimento Votoran 50kg" e o sistema já sabe que é material
// de construção, subcategoria Cimento, vendido em SACO. Digita "João da
// Silva - diária de pedreiro" e sabe que é serviço, mão de obra, DIÁRIA.
// A ideia é digitar menos e errar menos.
//
// A ordem de quem responde é de propósito, do mais confiável para o menos:
//
//   1. o que o DONO já corrigiu antes (aprendizado) — ninguém sabe mais
//      do que ele sobre o material dele;
//   2. o que ele já LANÇOU antes com esse mesmo nome (histórico) — o
//      sistema não inventa uma unidade diferente da que ele sempre usou;
//   3. o CATÁLOGO LOCAL aqui de baixo — regras escritas, sem rede, sem
//      custo, sem espera;
//   4. nada: devolve sem palpite, e a tela pede para ele escolher.
//
// Só o passo 4 é candidato a chamar uma IA de verdade um dia (ver
// `precisaDeAjuda`). Chamar modelo a cada tecla digitada seria lento e
// caro para resolver o que uma lista de palavras resolve.
//
// Funções puras: não mexem em React, em rede nem em banco.
import { semAcento } from '../textUtils';

// ---- o que o sistema sabe nomear ----
//
// `tipo` separa o que é COMPRA (material) do que é CONTRATAÇÃO (serviço).
// `secao` é em qual das quatro seções da obra o gasto costuma entrar — é
// sugestão, e o dono troca de seção quando quiser.
export const TIPOS = { material: 'Material', servico: 'Serviço' };

export const SUBCATEGORIAS = {
  cimento: { label: 'Cimento', categoria: 'Materiais de construção', tipo: 'material', secao: 'produto_loja', unidade: 'SC' },
  agregados: { label: 'Agregados', categoria: 'Materiais de construção', tipo: 'material', secao: 'material_bruto', unidade: 'M3' },
  alvenaria: { label: 'Alvenaria', categoria: 'Materiais de construção', tipo: 'material', secao: 'material_bruto', unidade: 'UN' },
  cobertura: { label: 'Cobertura', categoria: 'Materiais de construção', tipo: 'material', secao: 'produto_loja', unidade: 'UN' },
  madeiras: { label: 'Madeiras', categoria: 'Materiais de construção', tipo: 'material', secao: 'madeiras', unidade: 'UN' },
  eletrica: { label: 'Elétrica', categoria: 'Materiais de construção', tipo: 'material', secao: 'produto_loja', unidade: 'M' },
  hidraulica: { label: 'Hidráulica', categoria: 'Materiais de construção', tipo: 'material', secao: 'produto_loja', unidade: 'UN' },
  ferragens: { label: 'Ferragens', categoria: 'Materiais de construção', tipo: 'material', secao: 'produto_loja', unidade: 'UN' },
  pintura: { label: 'Pintura e acabamento', categoria: 'Materiais de construção', tipo: 'material', secao: 'produto_loja', unidade: 'UN' },
  revestimento: { label: 'Revestimento', categoria: 'Materiais de construção', tipo: 'material', secao: 'produto_loja', unidade: 'M2' },
  esquadrias: { label: 'Esquadrias', categoria: 'Materiais de construção', tipo: 'material', secao: 'produto_loja', unidade: 'UN' },
  mao_de_obra: { label: 'Mão de obra', categoria: 'Mão de obra', tipo: 'servico', secao: 'mao_de_obra', unidade: 'DIÁRIA' },
  equipamentos: { label: 'Equipamentos e locação', categoria: 'Equipamentos', tipo: 'servico', secao: 'material_bruto', unidade: 'UN' },
  combustivel: { label: 'Combustível', categoria: 'Combustível', tipo: 'material', secao: 'material_bruto', unidade: 'L' },
  projetos: { label: 'Projetos e serviços técnicos', categoria: 'Projetos', tipo: 'servico', secao: 'material_bruto', unidade: 'UN' },
  transporte: { label: 'Transporte e frete', categoria: 'Serviços', tipo: 'servico', secao: 'material_bruto', unidade: 'UN' },
};

// Profissões: entram em mão de obra e dão a subcategoria exata ("Pedreiro").
const PROFISSOES = [
  'pedreiro', 'servente', 'ajudante', 'mestre de obra', 'mestre de obras', 'encarregado',
  'carpinteiro', 'marceneiro', 'armador', 'ferreiro', 'eletricista', 'encanador',
  'bombeiro hidraulico', 'pintor', 'gesseiro', 'azulejista', 'ceramista', 'telhadista',
  'soldador', 'vidraceiro', 'jardineiro', 'montador', 'diarista', 'empreiteiro', 'pedreiro oficial',
];

// Palavras que, sozinhas, já dizem que é pagamento de gente.
const PALAVRAS_MAO_DE_OBRA = ['diaria', 'diarias', 'empreita', 'empreitada', 'mao de obra', 'maodeobra', 'salario', 'pagamento de', 'vale', 'adiantamento'];

// O catálogo local: palavra (ou começo de palavra) → subcategoria. A
// ordem importa, porque a primeira que casar ganha: o que é mais
// específico vem antes ("tubo pvc" antes de "pvc").
const REGRAS = [
  // combustível e equipamento primeiro: "aluguel de betoneira" não é
  // betoneira comprada, e "diesel da retroescavadeira" não é máquina.
  { sub: 'combustivel', unidade: 'L', palavras: ['diesel', 'oleo diesel', 'gasolina', 'etanol', 'alcool combustivel', 'arla', 'querosene'] },
  { sub: 'equipamentos', palavras: ['aluguel', 'locacao', 'locação', 'alugue'] },
  { sub: 'equipamentos', palavras: ['betoneira', 'andaime', 'compactador', 'placa vibratoria', 'martelete', 'gerador', 'escora metalica', 'bomba de concreto', 'retroescavadeira', 'escavadeira', 'guincho', 'munck'] },
  { sub: 'projetos', palavras: ['projeto', 'art ', 'rrt ', 'anotacao de responsabilidade', 'laudo', 'engenheiro', 'arquiteto', 'topografia', 'sondagem', 'calculo estrutural', 'memorial'] },
  { sub: 'transporte', palavras: ['frete', 'carreto', 'transporte', 'entrega', 'caminhao de', 'viagem de'] },

  { sub: 'cimento', unidade: 'SC', palavras: ['cimento', 'votoran', 'cp ii', 'cp-ii', 'cp iv', 'cp-iv', 'argamassa', 'cal hidratada', 'cal ', 'rejunte'] },
  { sub: 'agregados', unidade: 'M3', palavras: ['areia', 'brita', 'pedrisco', 'pedra marroada', 'pedra ', 'saibro', 'macadame', 'po de pedra', 'rachao', 'seixo', 'bica corrida'] },
  { sub: 'alvenaria', palavras: ['tijolo', 'bloco de concreto', 'bloco ceramico', 'bloco estrutural', 'bloco de vedacao', 'canaleta de concreto', 'verga', 'contraverga', 'elemento vazado'] },
  { sub: 'cobertura', palavras: ['telha', 'cumeeira', 'calha', 'rufo', 'manta asfaltica', 'subcobertura', 'cumieira'] },
  { sub: 'madeiras', palavras: ['madeira', 'eucalipto', 'pinus', 'tabua', 'taboa', 'deck', 'assoalho', 'forro de madeira', 'ripa', 'caibro', 'sarrafo', 'prancha', 'moerao', 'moirao', 'palanque', 'compensado', 'frontal', 'espelho beiral'] },
  { sub: 'eletrica', unidade: 'M', palavras: ['fio ', 'cabo ', 'cabo flexivel', 'disjuntor', 'quadro de distribuicao', 'tomada', 'interruptor', 'eletroduto', 'conduite', 'lampada', 'luminaria', 'reator', 'dps', 'padrao de energia'] },
  { sub: 'hidraulica', palavras: ['tubo', 'cano', 'joelho', 'cotovelo', 'luva ', 'te ', 'tes ', 'registro', 'torneira', 'caixa dagua', 'caixa d agua', 'sifao', 'ralo', 'vaso sanitario', 'pia ', 'cuba', 'adesivo pvc', 'veda rosca', 'conexao'] },
  { sub: 'ferragens', palavras: ['prego', 'parafuso', 'arame', 'vergalhao', 'ferro ', 'tela soldada', 'estribo', 'treliça', 'trelica', 'dobradica', 'fechadura', 'bucha', 'abracadeira', 'rebite', 'porca', 'arruela'] },
  { sub: 'pintura', palavras: ['tinta', 'massa corrida', 'massa acrilica', 'selador', 'verniz', 'solvente', 'thinner', 'lixa', 'rolo de pintura', 'pincel', 'fundo preparador'] },
  { sub: 'revestimento', unidade: 'M2', palavras: ['piso', 'porcelanato', 'azulejo', 'ceramica', 'revestimento', 'rodape', 'soleira', 'granito', 'marmore'] },
  { sub: 'esquadrias', palavras: ['porta', 'janela', 'batente', 'guarnicao', 'marco', 'esquadria', 'vidro', 'box de'] },
];

// ---- unidade a partir do que está escrito no nome ----
//
// "Cimento 50kg" é vendido em saco, não em quilo: o 50kg é o tamanho do
// saco. Por isso a unidade sai da regra do produto (cimento → SC) e só
// cai no que está escrito quando a regra não disser nada.
const UNIDADE_POR_ESCRITO = [
  [/\b\d+\s?kg\b/, null],
  [/\bm2\b|\bm²\b|metro quadrado/, 'M2'],
  [/\bm3\b|\bm³\b|metro cubico|metro cúbico/, 'M3'],
  [/\bml\b|metro linear/, 'ML'],
  [/\blitros?\b|\bl\b/, 'L'],
  [/\bsacos?\b|\bsc\b/, 'SC'],
  [/\bbarras?\b/, 'BR'],
  [/\brolos?\b/, 'RL'],
  [/\bcaixas?\b|\bcx\b/, 'CX'],
  [/\bmilheiros?\b/, 'MLH'],
  [/\bdiarias?\b|\bdiárias?\b/, 'DIÁRIA'],
];

function chave(texto) {
  return semAcento(texto).replace(/\s+/g, ' ').trim();
}

// O nome padronizado é o que vai ficar gravado: caixa alta, sem espaço
// sobrando e sem o pedaço que é observação ("- diária de pedreiro",
// "(comprado na loja X)").
export function padronizarNome(descricao) {
  return String(descricao == null ? '' : descricao)
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

// Quem recebeu, quando a linha é de mão de obra escrita como
// "João da Silva - diária de pedreiro".
export function separarPessoaEServico(descricao) {
  const partes = String(descricao || '').split(/\s[-–—]\s|,\s/);
  if (partes.length < 2) return { pessoa: '', resto: String(descricao || '').trim() };
  return { pessoa: partes[0].trim(), resto: partes.slice(1).join(' ').trim() };
}

function acharProfissao(k) {
  return PROFISSOES.find((p) => k.includes(p)) || '';
}

function unidadePeloEscrito(k) {
  for (const [padrao, unidade] of UNIDADE_POR_ESCRITO) {
    if (padrao.test(k)) return unidade; // null = "não dá para saber por aqui"
  }
  return undefined;
}

// ---- 2) o que o dono já lançou antes ----
//
// Mesmo nome já lançado = mesma unidade e mesma seção de antes. Isso vale
// mais do que qualquer regra escrita aqui: é o uso real da loja.
function pelosLancamentos(k, lancamentos) {
  const iguais = (lancamentos || []).filter((l) => l && chave(l.descricao) === k);
  if (iguais.length === 0) return null;
  const ultimo = iguais.reduce((a, l) => (String(l.data || '') > String(a.data || '') ? l : a), iguais[0]);
  return {
    subcategoria: ultimo.subcategoria || null,
    unidade: ultimo.unidade || '',
    secao: ultimo.categoria || '',
    tipo: ultimo.categoria === 'mao_de_obra' ? 'servico' : 'material',
    origem: 'historico',
    confianca: 0.9,
    vezes: iguais.length,
  };
}

// ---- 3) o catálogo local ----
function peloCatalogo(k) {
  // mão de obra: profissão escrita, ou palavra que já diz que é pagamento
  const profissao = acharProfissao(k);
  const ehPagamento = PALAVRAS_MAO_DE_OBRA.some((p) => k.includes(p));
  if (profissao || ehPagamento) {
    return {
      subcategoria: 'mao_de_obra',
      subcategoriaDetalhe: profissao ? profissao.replace(/\b\w/g, (c) => c.toUpperCase()) : '',
      unidade: unidadePeloEscrito(k) || 'DIÁRIA',
      secao: 'mao_de_obra',
      tipo: 'servico',
      origem: 'catalogo',
      confianca: profissao && ehPagamento ? 0.95 : 0.8,
    };
  }

  for (const regra of REGRAS) {
    const casou = regra.palavras.find((palavra) => k === palavra.trim() || k.includes(palavra));
    if (!casou) continue;
    const base = SUBCATEGORIAS[regra.sub];
    const escrita = unidadePeloEscrito(k);
    return {
      subcategoria: regra.sub,
      subcategoriaDetalhe: '',
      // a unidade escrita no nome só vale quando a regra não tem uma
      // própria e quando ela não é "nula" (o 50kg do saco de cimento)
      unidade: regra.unidade || (escrita === undefined || escrita === null ? base.unidade : escrita),
      secao: base.secao,
      tipo: base.tipo,
      origem: 'catalogo',
      // nome inteiro igual à palavra da regra é mais certo do que um
      // pedaço no meio da frase
      confianca: k === casou.trim() ? 0.9 : 0.75,
    };
  }
  return null;
}

// ---- entrada principal ----
//
// `aprendidas` é o que o dono já corrigiu: { [chave do nome]: {...} }.
export function classificar(descricao, { lancamentos = [], aprendidas = {} } = {}) {
  const nome = padronizarNome(descricao);
  const k = chave(nome);
  const vazio = {
    nomePadronizado: nome, subcategoria: null, subcategoriaLabel: '', categoria: '',
    unidade: '', secao: '', tipo: '', confianca: 0, origem: 'nenhuma',
  };
  if (!k) return vazio;

  // O histórico e o catálogo se completam. O lançamento antigo guarda a
  // UNIDADE que o dono usa de verdade ("AREIA MEDIA" em CARRADA), mas os
  // lançamentos feitos antes desta tela existir não têm categoria
  // nenhuma gravada — e sem juntar os dois, todo item que ele já comprou
  // apareceria como "não reconheci". Então: categoria vem do catálogo,
  // unidade e seção vêm do que ele já fez.
  const doHistorico = aprendidas[k] ? null : pelosLancamentos(k, lancamentos);
  const doCatalogo = aprendidas[k] ? null : peloCatalogo(k);

  let bruto;
  if (aprendidas[k]) {
    bruto = { ...aprendidas[k], origem: 'aprendido', confianca: 1 };
  } else if (doHistorico && doHistorico.subcategoria) {
    bruto = doHistorico;
  } else if (doHistorico && doCatalogo) {
    bruto = {
      ...doCatalogo,
      unidade: doHistorico.unidade || doCatalogo.unidade,
      secao: doHistorico.secao || doCatalogo.secao,
      origem: 'historico',
      // já ter sido lançado antes com esse nome é sinal forte
      confianca: Math.max(doCatalogo.confianca, 0.85),
      vezes: doHistorico.vezes,
    };
  } else {
    bruto = doHistorico || doCatalogo;
  }

  if (!bruto || !bruto.subcategoria) {
    // sem palpite: a tela pede para o dono escolher, e a escolha dele
    // vira aprendizado para a próxima vez
    return { ...vazio, unidade: bruto?.unidade || '', secao: bruto?.secao || '', origem: bruto?.origem || 'nenhuma' };
  }

  const base = SUBCATEGORIAS[bruto.subcategoria] || {};
  return {
    nomePadronizado: nome,
    subcategoria: bruto.subcategoria,
    subcategoriaLabel: bruto.subcategoriaDetalhe || base.label || bruto.subcategoria,
    categoria: base.categoria || '',
    unidade: bruto.unidade || base.unidade || 'UN',
    secao: bruto.secao || base.secao || '',
    tipo: bruto.tipo || base.tipo || '',
    confianca: bruto.confianca || 0.6,
    origem: bruto.origem,
    vezes: bruto.vezes || 0,
  };
}

// Quando a classificação não dá para confiar, a tela pede ajuda ao dono
// (e é também o único caso em que faria sentido perguntar a uma IA).
export function precisaDeAjuda(resultado) {
  return !resultado || !resultado.subcategoria || resultado.confianca < 0.7;
}

// Como mostrar a confiança sem encher a tela de número: três níveis.
export function nivelDeConfianca(resultado) {
  if (!resultado || !resultado.subcategoria) return 'nenhuma';
  if (resultado.confianca >= 0.9) return 'alta';
  if (resultado.confianca >= 0.7) return 'media';
  return 'baixa';
}

// ---- aprendizado ----
//
// Guarda a correção do dono para aquele nome. É isto que faz o sistema
// parar de errar duas vezes a mesma coisa.
export function aprenderCorrecao(aprendidas, descricao, { subcategoria, unidade, secao, tipo }) {
  const k = chave(descricao);
  if (!k || !subcategoria) return aprendidas || {};
  const base = SUBCATEGORIAS[subcategoria] || {};
  return {
    ...(aprendidas || {}),
    [k]: {
      subcategoria,
      unidade: unidade || base.unidade || 'UN',
      secao: secao || base.secao || '',
      tipo: tipo || base.tipo || '',
      corrigidoEm: new Date().toISOString().slice(0, 10),
    },
  };
}

// A lista para o dono escolher à mão, em ordem de gente.
export function opcoesDeSubcategoria() {
  return Object.entries(SUBCATEGORIAS)
    .map(([key, s]) => ({ key, label: s.label, categoria: s.categoria, tipo: s.tipo, unidade: s.unidade, secao: s.secao }))
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
}
