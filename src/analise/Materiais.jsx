import React, { useMemo, useState } from 'react';
import { Search, Package, ArrowLeft, TrendingDown, TrendingUp, Award, AlertTriangle } from 'lucide-react';
import { formatMoney, formatDateBR } from '../domain';
import { rankingMateriais, estatisticasMaterial, compararPrecosPorFornecedor } from './analiseCalc';

export default function Materiais({ lancamentos, obras, materialInicial, onLimparMaterialInicial }) {
  const [busca, setBusca] = useState('');
  const [selecionado, setSelecionado] = useState(materialInicial || null);

  // quando a busca global manda abrir um material específico
  React.useEffect(() => {
    if (materialInicial) {
      setSelecionado(materialInicial);
      onLimparMaterialInicial && onLimparMaterialInicial();
    }
  }, [materialInicial]);

  const ranking = useMemo(() => rankingMateriais(lancamentos), [lancamentos]);
  const filtrados = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return t ? ranking.filter((m) => m.descricao.toLowerCase().includes(t)) : ranking;
  }, [ranking, busca]);

  if (selecionado) {
    return <DetalheMaterial descricao={selecionado} lancamentos={lancamentos} obras={obras} onVoltar={() => setSelecionado(null)} />;
  }

  const totalGeral = ranking.reduce((a, m) => a + m.total, 0);

  return (
    <div className="space-y-4 pb-10">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="eco-card p-3">
          <p className="text-xs text-stone-400">Materiais diferentes</p>
          <p className="text-lg font-bold text-stone-800">{ranking.length}</p>
        </div>
        <div className="eco-card p-3">
          <p className="text-xs text-stone-400">Total comprado</p>
          <p className="text-lg font-bold text-green-800">{formatMoney(totalGeral)}</p>
        </div>
        <div className="eco-card p-3 col-span-2 sm:col-span-1">
          <p className="text-xs text-stone-400">Material que mais consumiu</p>
          <p className="text-sm font-bold text-stone-800 truncate">{ranking[0]?.descricao || '—'}</p>
        </div>
      </div>

      <div className="eco-card p-3">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-300" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar material…" className="eco-input pl-8" />
        </div>
      </div>

      {filtrados.length === 0 ? (
        <div className="eco-card p-8 text-center">
          <Package size={28} className="mx-auto text-stone-300 mb-2" />
          <p className="text-sm text-stone-500">
            {ranking.length === 0 ? 'Nenhum material comprado ainda.' : `Nenhum material encontrado para "${busca}".`}
          </p>
          {ranking.length === 0 && (
            <p className="text-xs text-stone-400 mt-1">Os materiais aparecem aqui conforme você lança compras nas obras.</p>
          )}
        </div>
      ) : (
        <div className="eco-card divide-y divide-stone-100">
          {filtrados.map((m) => {
            const pct = totalGeral > 0 ? (m.total / totalGeral) * 100 : 0;
            return (
              <button key={m.descricao} onClick={() => setSelecionado(m.descricao)} className="w-full text-left p-3 hover:bg-stone-50 transition-colors">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-stone-800 truncate">{m.descricao}</p>
                    <p className="text-xs text-stone-400">
                      {m.quantidade.toLocaleString('pt-BR')} {m.unidade} · {m.compras} compra{m.compras > 1 ? 's' : ''}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-stone-800 flex-shrink-0">{formatMoney(m.total)}</p>
                </div>
                <div className="w-full h-1 bg-stone-100 rounded-full overflow-hidden mt-2">
                  <div className="h-full bg-green-600" style={{ width: `${pct}%` }} />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DetalheMaterial({ descricao, lancamentos, obras, onVoltar }) {
  const stats = useMemo(() => estatisticasMaterial(lancamentos, descricao), [lancamentos, descricao]);
  const comparacao = useMemo(() => compararPrecosPorFornecedor(lancamentos, descricao), [lancamentos, descricao]);

  const variacao = stats.menorPreco > 0 ? ((stats.ultimoPreco - stats.menorPreco) / stats.menorPreco) * 100 : 0;

  return (
    <div className="space-y-4 pb-10">
      <button onClick={onVoltar} className="text-sm text-stone-500 hover:text-stone-800 flex items-center gap-1">
        <ArrowLeft size={14} /> Todos os materiais
      </button>

      <div className="eco-card p-4">
        <h2 className="text-lg font-semibold text-stone-900">{descricao}</h2>
        <p className="text-xs text-stone-400 mt-0.5">
          {stats.quantidade.toLocaleString('pt-BR')} {stats.unidade} comprados em {stats.compras.length} lançamento{stats.compras.length > 1 ? 's' : ''}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="eco-card p-3">
          <p className="text-xs text-stone-400">Total gasto</p>
          <p className="text-lg font-bold text-green-800">{formatMoney(stats.totalGasto)}</p>
        </div>
        <div className="eco-card p-3">
          <p className="text-xs text-stone-400">Preço médio</p>
          <p className="text-lg font-bold text-stone-800">{formatMoney(stats.precoMedio)}</p>
          <p className="text-[10px] text-stone-400">por {stats.unidade || 'un'}</p>
        </div>
        <div className="eco-card p-3">
          <p className="text-xs text-stone-400">Último preço</p>
          <p className="text-lg font-bold text-stone-800">{formatMoney(stats.ultimoPreco)}</p>
        </div>
        <div className="eco-card p-3 border-green-200">
          <p className="text-xs text-green-700/70 flex items-center gap-1"><TrendingDown size={11} /> Menor preço</p>
          <p className="text-lg font-bold text-green-700">{formatMoney(stats.menorPreco)}</p>
        </div>
        <div className="eco-card p-3 border-red-200">
          <p className="text-xs text-red-700/70 flex items-center gap-1"><TrendingUp size={11} /> Maior preço</p>
          <p className="text-lg font-bold text-red-600">{formatMoney(stats.maiorPreco)}</p>
        </div>
        <div className="eco-card p-3">
          <p className="text-xs text-stone-400">Último vs. menor</p>
          <p className={`text-lg font-bold ${variacao > 5 ? 'text-red-600' : 'text-green-700'}`}>
            {variacao > 0 ? '+' : ''}{variacao.toFixed(0)}%
          </p>
        </div>
      </div>

      {/* comparador de preços entre fornecedores */}
      <div className="eco-card p-4">
        <p className="text-sm font-semibold text-stone-700 mb-1">Comparar preços entre fornecedores</p>
        <p className="text-xs text-stone-400 mb-3">Último preço pago a cada fornecedor. O mais barato fica destacado.</p>

        {comparacao.fornecedores.length === 0 ? (
          <p className="text-sm text-stone-400 py-3 text-center">
            Nenhuma compra deste material tem fornecedor informado ainda.
          </p>
        ) : (
          <>
            <div className="space-y-2">
              {comparacao.fornecedores.map((f) => (
                <div key={f.fornecedor} className={`rounded-lg p-2.5 border ${f.ehMaisBarato ? 'bg-green-50 border-green-200' : 'bg-stone-50 border-stone-200'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-stone-800 truncate flex items-center gap-1.5">
                        {f.ehMaisBarato && <Award size={13} className="text-green-600 flex-shrink-0" />}
                        {f.fornecedor}
                      </p>
                      <p className="text-xs text-stone-400">
                        {f.compras} compra{f.compras > 1 ? 's' : ''}
                        {f.ultimaData ? ` · última em ${formatDateBR(f.ultimaData)}` : ''}
                        {f.menorPreco !== f.maiorPreco ? ` · já variou de ${formatMoney(f.menorPreco)} a ${formatMoney(f.maiorPreco)}` : ''}
                      </p>
                    </div>
                    <p className={`text-base font-bold flex-shrink-0 ${f.ehMaisBarato ? 'text-green-700' : 'text-stone-800'}`}>
                      {formatMoney(f.ultimoPreco)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {comparacao.economiaPorUnidade > 0 && (
              <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-start gap-2">
                <AlertTriangle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800">
                  Comprando do mais barato você economiza <strong>{formatMoney(comparacao.economiaPorUnidade)}</strong> por
                  {' '}{stats.unidade || 'unidade'} ({comparacao.economiaPct.toFixed(0)}% de diferença entre o mais caro e o mais barato).
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* histórico de compras */}
      <div className="eco-card p-4">
        <p className="text-sm font-semibold text-stone-700 mb-2">Histórico de compras</p>
        <div className="space-y-1.5">
          {[...stats.compras].reverse().map((l) => (
            <div key={l.id} className="flex items-center justify-between gap-2 text-sm py-1.5 border-b border-stone-100 last:border-0">
              <div className="min-w-0 flex-1">
                <p className="text-stone-700 truncate">
                  {l.fornecedorNome || 'sem fornecedor'}
                  <span className="text-stone-400"> · {obras.find((o) => o.id === l.obraId)?.nome || 'obra removida'}</span>
                </p>
                <p className="text-xs text-stone-400">
                  {formatDateBR(l.data)} · {l.quantidade} {l.unidade} × {formatMoney(l.preco)}
                </p>
              </div>
              <p className="font-semibold text-stone-800 flex-shrink-0">{formatMoney(l.total)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
