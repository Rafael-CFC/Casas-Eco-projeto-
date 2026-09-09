// Mão de obra: pagamento de gente, não compra de material.
//
// Esta categoria responde a uma pergunta só: quanto o pedreiro já recebeu
// nesta obra, e quando. Não tem quantidade, unidade nem preço unitário —
// tratar o pagamento como se fosse um produto ("2 UN x R$ 500") só
// atrapalhava quem lança e enchia a tela de campo que não é pra preencher.
//
// No dado gravado o pagamento continua sendo um lançamento normal (é o que
// o Financeiro, o resumo da obra e os relatórios já somam): quantidade 1,
// sem unidade, e o valor pago no preço — assim `total` é o valor pago.
//
// Funções puras: não mexem em React nem em rede.
import { semAcento } from '../textUtils';

export const CATEGORIA_MAO_DE_OBRA = 'mao_de_obra';

export function ehPagamentoDeMaoDeObra(categoria) {
  return categoria === CATEGORIA_MAO_DE_OBRA;
}

// Chave "à prova de digitação" do nome de quem recebe: sem acento e sem
// caixa, para "João" e "JOAO" contarem como a mesma pessoa.
function chaveNome(nome) {
  return semAcento(nome).replace(/\s+/g, ' ').trim();
}

// Quem já recebeu pagamento de mão de obra, para escolher em vez de
// digitar o nome de novo (e escrever diferente da última vez).
//
// Entram os nomes que já apareceram em lançamentos de mão de obra — de
// qualquer obra, porque o mesmo pedreiro trabalha em várias — e os
// montadores cadastrados no crediário, que são as mesmas pessoas.
export function nomesDeQuemRecebe({ lancamentos = [], montadores = [] } = {}) {
  const vistos = new Map();
  const juntar = (nome) => {
    const limpo = String(nome == null ? '' : nome).replace(/\s+/g, ' ').trim();
    const k = chaveNome(limpo);
    if (!k || vistos.has(k)) return;
    vistos.set(k, limpo);
  };
  (lancamentos || [])
    .filter((l) => l && ehPagamentoDeMaoDeObra(l.categoria))
    .forEach((l) => juntar(l.descricao));
  (montadores || []).forEach((m) => juntar(m && m.nome));
  return [...vistos.values()].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

// Quanto essa pessoa já recebeu de mão de obra numa obra. É o número que
// falta na hora de pagar de novo ("já paguei quanto pro João aqui?"), e
// aparece do lado do nome na hora de escolher.
export function totalJaRecebido(lancamentos, obraId, nome) {
  const alvo = chaveNome(nome);
  if (!alvo) return 0;
  return (lancamentos || [])
    .filter((l) => (
      l && l.obraId === obraId
      && ehPagamentoDeMaoDeObra(l.categoria)
      && chaveNome(l.descricao) === alvo
    ))
    .reduce((a, l) => a + (Number(l.total) || 0), 0);
}
