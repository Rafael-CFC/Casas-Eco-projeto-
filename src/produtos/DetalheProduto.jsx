import React, { useMemo } from 'react';
import { ArrowDownRight, ArrowUpRight, Star, X } from 'lucide-react';
import { formatMoney, formatDateBR } from '../domain';
import { historicoDePrecos, ondeFoiUsado, ehFavorito } from './catalogoCentral';

// A ficha de um produto: o que ele custou ao longo do tempo e em que
// obras foi usado.
//
// O dado não é novo — sempre esteve espalhado nos lançamentos de cada
// obra. O que faltava era juntar: "o cimento subiu 19% desde a primeira
// compra" e "esse item foi para três obras" são coisas que ninguém
// consegue ver olhando obra por obra.
export default function DetalheProduto({ nome, lancamentos, obras, favoritos, onFavoritar, onFechar }) {
  const historico = useMemo(() => historicoDePrecos(nome, lancamentos, obras), [nome, lancamentos, obras]);
  const usos = useMemo(() => ondeFoiUsado(nome, lancamentos, obras), [nome, lancamentos, obras]);
  const favorito = ehFavorito(favoritos, nome);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-white w-full sm:max-w-2xl sm:rounded-xl shadow-popover animate-scale-in flex flex-col max-h-[100dvh] sm:max-h-[90dvh]">
        <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-stone-100 flex-shrink-0">
          <div className="min-w-0">
            <p className="font-semibold text-stone-800 break-words">{nome}</p>
            <p className="text-xs text-stone-400">
              {historico.itens.length === 0
                ? 'ainda não foi comprado em nenhuma obra'
                : `${historico.itens.length} ${historico.itens.length === 1 ? 'compra' : 'compras'} · ${usos.length} ${usos.length === 1 ? 'obra' : 'obras'}`}
            </p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => onFavoritar(nome)}
              className={`eco-icon-btn ${favorito ? 'text-amber-500' : ''}`}
              title={favorito ? 'Tirar dos favoritos' : 'Marcar como favorito'}
            >
              <Star size={16} fill={favorito ? 'currentColor' : 'none'} />
            </button>
            <button onClick={onFechar} className="eco-icon-btn" aria-label="Fechar"><X size={16} /></button>
          </div>
        </div>

        <div className="overflow-y-auto p-4 space-y-4 eco-rodape-seguro">
          {historico.itens.length === 0 ? (
            <p className="text-sm text-stone-400">
              Este produto está no catálogo, mas ainda não foi lançado em obra nenhuma — por isso
              não há histórico de preço.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  ['Última compra', formatMoney(historico.ultimo.preco)],
                  ['Média', formatMoney(historico.medio)],
                  ['Menor', formatMoney(historico.menor)],
                  ['Maior', formatMoney(historico.maior)],
                ].map(([rotulo, valor]) => (
                  <div key={rotulo} className="eco-card p-2.5">
                    <p className="text-[11px] text-stone-400">{rotulo}</p>
                    <p className="text-sm font-semibold text-stone-800 tabular-nums">{valor}</p>
                  </div>
                ))}
              </div>

              {historico.variacao !== null && (
                <p className={`text-sm flex items-center gap-1 ${historico.variacao > 0 ? 'text-amber-700' : 'text-green-700'}`}>
                  {historico.variacao > 0 ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
                  {historico.variacao > 0 ? 'Subiu' : 'Caiu'} {Math.abs(historico.variacao).toFixed(0)}% desde a
                  primeira compra ({formatMoney(historico.primeiro.preco)} em {formatDateBR(historico.primeiro.data)}).
                </p>
              )}

              <div>
                <p className="text-sm font-semibold text-stone-700 mb-1.5">Cada compra</p>
                <div className="eco-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[420px]">
                      <thead className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wide font-semibold">
                        <tr>
                          <th className="text-left px-3 py-2">Data</th>
                          <th className="text-right px-3 py-2">Preço</th>
                          <th className="text-left px-3 py-2">Obra</th>
                          <th className="text-left px-3 py-2">Fornecedor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historico.itens.map((i, n) => (
                          <tr key={`${i.data}-${n}`} className="border-t border-stone-100">
                            <td className="px-3 py-2 whitespace-nowrap">{formatDateBR(i.data)}</td>
                            <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">
                              {formatMoney(i.preco)}
                              <span className="text-stone-400"> /{i.unidade || 'UN'}</span>
                            </td>
                            <td className="px-3 py-2 text-stone-500">{i.obraNome || '—'}</td>
                            <td className="px-3 py-2 text-stone-500">{i.fornecedorNome || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-stone-700 mb-1.5">Onde foi usado</p>
                <div className="space-y-1.5">
                  {usos.map((u) => (
                    <div key={u.obraId} className="flex items-center justify-between gap-3 text-sm eco-card p-2.5">
                      <span className="min-w-0 truncate text-stone-700">{u.obraNome}</span>
                      <span className="text-stone-400 text-xs whitespace-nowrap">
                        {u.quantidade.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ·{' '}
                        <span className="font-medium text-stone-700">{formatMoney(u.total)}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
