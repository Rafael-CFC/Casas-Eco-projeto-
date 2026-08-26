// Contas a pagar: filtros e somas do relatório.
//
// Funções puras — não mexem em React nem em rede. Recebem a lista de
// contas já carregada e devolvem números prontos para a tela. Assim dá
// para conferir que nenhum valor é inventado: tudo é soma ou filtro em
// cima do que foi registrado.
import { chaveFornecedor } from '../textUtils';

export const TODAS = 'todas';

// Nome que identifica a conta. Contas antigas, de quando o formulário
// tinha descrição, continuam legíveis por ela.
export function nomeDaConta(c) {
  return c.fornecedorNome || c.descricao || 'Sem distribuidora';
}

export function estaPaga(c) {
  return c.status === 'pago';
}

function somar(lista) {
  return lista.reduce((a, c) => a + (Number(c.valor) || 0), 0);
}

// Soma dias a uma data ISO sem passar por fuso horário.
export function somarDias(iso, dias) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

// ---- filtros ----

export function distribuidorasDasContas(contas) {
  const vistas = new Map();
  contas.forEach((c) => {
    const nome = nomeDaConta(c);
    const k = chaveFornecedor(nome);
    if (k && !vistas.has(k)) vistas.set(k, nome);
  });
  return [...vistas.values()].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

// `situacao`: 'a_pagar' | 'pagas' | 'todas'
export function filtrarContas(contas, { distribuidora = TODAS, situacao = 'a_pagar', de = '', ate = '' } = {}) {
  const alvo = distribuidora !== TODAS ? chaveFornecedor(distribuidora) : null;
  return contas.filter((c) => {
    if (alvo && chaveFornecedor(nomeDaConta(c)) !== alvo) return false;
    if (situacao === 'a_pagar' && estaPaga(c)) return false;
    if (situacao === 'pagas' && !estaPaga(c)) return false;
    if (de && (!c.vencimento || c.vencimento < de)) return false;
    if (ate && (!c.vencimento || c.vencimento > ate)) return false;
    return true;
  });
}

// ---- as janelas de 7 / 15 / 30 dias ----

// Sempre contadas a partir de HOJE e só sobre o que ainda não foi pago.
// O que já venceu fica separado de propósito: juntar as duas coisas
// esconderia justamente o que é urgente.
export function resumoVencimentos(contas, hojeISO) {
  const pendentes = contas.filter((c) => !estaPaga(c) && c.vencimento);
  const vencidas = pendentes.filter((c) => c.vencimento < hojeISO);
  const janela = (dias) => pendentes.filter(
    (c) => c.vencimento >= hojeISO && c.vencimento <= somarDias(hojeISO, dias)
  );
  const ate7 = janela(7);
  const ate15 = janela(15);
  const ate30 = janela(30);
  return {
    vencidas: { quantidade: vencidas.length, valor: somar(vencidas) },
    ate7: { quantidade: ate7.length, valor: somar(ate7) },
    ate15: { quantidade: ate15.length, valor: somar(ate15) },
    ate30: { quantidade: ate30.length, valor: somar(ate30) },
    total: { quantidade: pendentes.length, valor: somar(pendentes) },
  };
}

// ---- agrupamentos para os gráficos ----

export function totalPorDistribuidora(contas, limite) {
  const somas = {};
  contas.forEach((c) => {
    const nome = nomeDaConta(c);
    const k = chaveFornecedor(nome);
    if (!somas[k]) somas[k] = { nome, total: 0, quantidade: 0 };
    somas[k].total += Number(c.valor) || 0;
    somas[k].quantidade += 1;
  });
  const lista = Object.values(somas).sort((a, b) => b.total - a.total);
  return limite ? lista.slice(0, limite) : lista;
}

const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function rotuloMes(iso) {
  const [ano, mes] = iso.split('-');
  return `${MESES_ABREV[Number(mes) - 1]}/${ano.slice(2)}`;
}

function inicioDaSemana(iso) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // segunda-feira
  return d.toISOString().slice(0, 10);
}

// Quanto vence em cada semana ou mês, para o gráfico de "quando o
// dinheiro sai". A granularidade vem de fora para a tela poder escolher.
//
// Cada barra vem partida em duas: o que já venceu e o que ainda vai
// vencer. Sem isso, a semana que começou ontem e vence amanhã teria que
// ser pintada de uma cor só — e qualquer uma das duas mentiria.
export function totalPorVencimento(contas, granularidade = 'mensal', hojeISO = '') {
  const somas = {};
  contas.forEach((c) => {
    if (!c.vencimento) return;
    const chave = granularidade === 'semanal' ? inicioDaSemana(c.vencimento) : c.vencimento.slice(0, 7);
    if (!somas[chave]) somas[chave] = { chave, total: 0, quantidade: 0, vencido: 0, aVencer: 0 };
    const valor = Number(c.valor) || 0;
    const g = somas[chave];
    g.total += valor;
    g.quantidade += 1;
    if (!estaPaga(c) && hojeISO && c.vencimento < hojeISO) g.vencido += valor;
    else g.aVencer += valor;
  });
  return Object.values(somas)
    .sort((a, b) => a.chave.localeCompare(b.chave))
    .map((g) => ({
      ...g,
      rotulo: granularidade === 'semanal'
        ? `${g.chave.slice(8, 10)}/${g.chave.slice(5, 7)}`
        : rotuloMes(g.chave),
    }));
}

export function somarContas(contas) {
  return somar(contas);
}
