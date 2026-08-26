// Constantes e helpers de domínio compartilhados entre o app principal e o
// Dashboard Financeiro. Mantidos aqui para ter uma única fonte de verdade
// (mesmas categorias, mesmas cores, mesma formatação de data/moeda usadas em
// todo o sistema).
import { HardHat, Mountain, Store, Trees } from 'lucide-react';

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function formatDateBR(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function formatMoney(v) {
  const n = Number(v) || 0;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function parsePrecoBR(s) {
  if (s === null || s === undefined) return NaN;
  let t = String(s).trim().replace(/^R\$\s*/i, '');
  if (t.includes(',') && t.includes('.')) {
    t = t.replace(/\./g, '').replace(',', '.');
  } else if (t.includes(',')) {
    t = t.replace(',', '.');
  }
  return parseFloat(t);
}

export const CATEGORIAS = {
  mao_de_obra: { label: 'Mão de obra', icon: HardHat, cls: 'amber' },
  material_bruto: { label: 'Materiais Brutos', icon: Mountain, cls: 'orange' },
  produto_loja: { label: 'Produtos da Loja', icon: Store, cls: 'blue' },
  // A madeira tem categoria própria porque vem toda de uma distribuidora
  // só e precisa aparecer separada no Financeiro (ver src/produtos/madeiras.js).
  madeiras: { label: 'Madeiras', icon: Trees, cls: 'fuchsia' },
};

export const CLS = {
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', solid: 'bg-amber-600' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', solid: 'bg-orange-600' },
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', solid: 'bg-blue-600' },
  fuchsia: { bg: 'bg-fuchsia-50', border: 'border-fuchsia-200', text: 'text-fuchsia-700', solid: 'bg-fuchsia-700' },
};

// Paleta usada nos gráficos de categoria (Dashboard Financeiro e Resumo Final
// da Obra). Validada com o script de acessibilidade (contraste/CVD) do
// projeto — mantida separada das cores de badge acima (CLS), que já existiam
// antes e são usadas em outros lugares do app.
// Cor de cada categoria nos gráficos. A quarta (madeiras) foi escolhida
// com o validador de paleta do projeto: passa nos testes de daltonismo
// (ΔE 9,6 no pior par) e de contraste contra o fundo, no tema claro e no
// escuro — não é chute de gosto.
export const CORES_CATEGORIA = {
  mao_de_obra: '#d97706',
  material_bruto: '#0d9488',
  produto_loja: '#2563eb',
  madeiras: '#ab2fb8',
};

export function formatPct(v) {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  const arredondado = Math.round(v * 10) / 10;
  return `${arredondado.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
}
