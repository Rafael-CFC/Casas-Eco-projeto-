// Contas fixas do mês: energia, água, aluguel, internet, salário — o que
// vence todo mês, sempre no mesmo dia, e que hoje precisava ser digitado
// de novo a cada mês.
//
// A ideia é guardar só o MOLDE da conta (nome, valor de sempre e o dia do
// vencimento). O boleto do mês continua sendo uma conta normal na lista de
// contas a pagar — criada a partir do molde, com um clique, e dali em
// diante somada, paga e apagada como qualquer outra.
//
// Nada é lançado sozinho. O sistema mostra o que ainda falta lançar no mês
// e espera o dono confirmar: valor de energia muda todo mês, e inventar um
// número que ninguém conferiu seria pior do que não lançar.
//
// Funções puras — não mexem em React nem em rede.
import { isoLocal } from '../domain';

// O mês de uma data ISO: '2026-09-14' -> '2026-09'.
export function mesDe(iso) {
  return String(iso || '').slice(0, 7);
}

const NOMES_MES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

// '2026-09' -> 'setembro de 2026'
export function rotuloMes(mesISO) {
  const [ano, mes] = String(mesISO || '').split('-').map(Number);
  if (!ano || !mes || mes < 1 || mes > 12) return '';
  return `${NOMES_MES[mes - 1]} de ${ano}`;
}

// Anda para frente ou para trás na lista de meses: ('2026-12', 1) -> '2027-01'.
export function mesVizinho(mesISO, passo) {
  const [ano, mes] = String(mesISO || '').split('-').map(Number);
  if (!ano || !mes) return mesISO;
  const d = new Date(ano, mes - 1 + passo, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Em que dia essa conta fixa vence num determinado mês.
//
// Dia 31 em fevereiro não existe: cai no último dia do mês (28, ou 29 em
// ano bissexto), nunca no dia 1º do mês seguinte. Vale o mesmo para o 31
// em abril, junho, setembro e novembro.
export function vencimentoNoMes(diaVencimento, mesISO) {
  const [ano, mes] = String(mesISO || '').split('-').map(Number);
  const dia = Number(diaVencimento);
  if (!ano || !mes || !dia) return '';
  const ultimoDiaDoMes = new Date(ano, mes, 0).getDate();
  return isoLocal(new Date(ano, mes - 1, Math.min(dia, ultimoDiaDoMes)));
}

// Normaliza o dia digitado para algo entre 1 e 31. Fora disso não é dia de
// vencimento de boleto nenhum.
export function diaValido(valor) {
  const n = Math.trunc(Number(valor));
  if (!Number.isFinite(n) || n < 1 || n > 31) return null;
  return n;
}

// A conta daquele mês que veio deste molde, se já tiver sido lançada.
//
// A pergunta é feita à lista de contas, não a uma marca guardada dentro do
// molde: se o dono apagar a conta lançada por engano, ela volta a aparecer
// como pendente — que é o certo — em vez de sumir para sempre porque o
// molde ficou marcado como "já lancei este mês".
export function contaLancadaDoMes(contas, fixaId, mesISO) {
  return contas.find((c) => c.fixaId === fixaId && mesDe(c.vencimento) === mesISO) || null;
}

// O quadro do mês: cada conta fixa ativa, em que dia ela vence naquele mês
// e se já foi lançada ou não. Ordenado pelo dia do vencimento, que é a
// ordem em que o dinheiro sai.
export function situacaoDoMes(fixas, contas, mesISO) {
  return (fixas || [])
    .filter((f) => f.ativa !== false)
    .map((fixa) => {
      const vencimento = vencimentoNoMes(fixa.diaVencimento, mesISO);
      const conta = contaLancadaDoMes(contas, fixa.id, mesISO);
      return { fixa, vencimento, conta, lancada: !!conta };
    })
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento));
}

// Só o que ainda falta lançar naquele mês.
export function pendentesDoMes(fixas, contas, mesISO) {
  return situacaoDoMes(fixas, contas, mesISO).filter((s) => !s.lancada);
}

// Quanto sai por mês somando todas as contas fixas ativas. É o "custo fixo"
// da empresa: o que vence mesmo em mês sem obra nenhuma.
export function totalMensal(fixas) {
  return (fixas || [])
    .filter((f) => f.ativa !== false)
    .reduce((a, f) => a + (Number(f.valor) || 0), 0);
}
