// Situação e datas de uma obra (funções puras, sem React e sem rede).
//
// Decisão importante: a data em que a obra foi CADASTRADA no sistema
// (`criadoEm`, que é também mais ou menos a data do contrato) não é a data em
// que a obra COMEÇOU. O contrato é assinado num dia e o pessoal entra na
// obra em outro. Por isso existe `inicioObraEm`: ela só é preenchida quando
// alguém aperta "Iniciar obra" e informa a data real. É a partir dela que os
// dias de obra são contados.
//
// Compatibilidade: obras cadastradas antes desta funcionalidade não têm
// `inicioObraEm`. Elas aparecem como "aguardando início" até que a data real
// seja informada — nada é preenchido automaticamente, para o sistema nunca
// inventar uma data de início que ninguém confirmou.
import { todayISO, diasCorridos } from '../domain';

export const SITUACAO_OBRA = {
  aguardando_inicio: { label: 'AGUARDANDO INÍCIO', cls: 'bg-stone-100 text-stone-600 border-stone-200' },
  programada: { label: 'INÍCIO PROGRAMADO', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  em_andamento: { label: 'EM ANDAMENTO', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  concluida: { label: 'CONCLUÍDA', cls: 'bg-green-50 text-green-700 border-green-200' },
};

export function obraEstaConcluida(obra) {
  return !!obra && obra.status === 'concluida';
}

export function obraFoiIniciada(obra) {
  return !!(obra && obra.inicioObraEm);
}

// Data (yyyy-mm-dd) em que a contagem de dias termina: a finalização, se a
// obra já foi finalizada, senão hoje.
export function dataFimContagem(obra, hojeISO = todayISO()) {
  if (obra && obra.finalizadaEm) return obra.finalizadaEm.slice(0, 10);
  return hojeISO;
}

// Dias de obra contados a partir do início REAL. `null` enquanto ninguém
// registrou o início; 0 quando o início ainda vai acontecer.
export function diasDeObra(obra, hojeISO = todayISO()) {
  if (!obraFoiIniciada(obra)) return null;
  const dias = diasCorridos(obra.inicioObraEm, dataFimContagem(obra, hojeISO));
  return dias === null ? null : Math.max(0, dias);
}

export function situacaoObra(obra, hojeISO = todayISO()) {
  if (obraEstaConcluida(obra)) return 'concluida';
  if (!obraFoiIniciada(obra)) return 'aguardando_inicio';
  return obra.inicioObraEm > hojeISO ? 'programada' : 'em_andamento';
}

// Texto curto para os cartões e cabeçalhos: "12 dias de obra",
// "obra ainda não iniciada", "começa em 03/09/2026", "durou 118 dias".
export function textoDiasDeObra(obra, hojeISO = todayISO()) {
  const situacao = situacaoObra(obra, hojeISO);
  if (situacao === 'aguardando_inicio') return 'obra ainda não iniciada';
  const dias = diasDeObra(obra, hojeISO);
  if (situacao === 'programada') return 'início programado';
  const plural = `${dias} ${dias === 1 ? 'dia' : 'dias'}`;
  return situacao === 'concluida' ? `durou ${plural}` : `${plural} de obra`;
}
