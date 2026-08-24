import React, { useMemo, useState } from 'react';
import { Search, Plus, Minus, Trash2, FileDown, ShoppingCart } from 'lucide-react';
import { formatMoney, parsePrecoBR } from '../domain';
import { CATALOGO_VENDA } from './catalogoVenda';
import { gerarPdfOrcamentoVenda } from './gerarPdfOrcamentoVenda';

export default function OrcamentoVenda({ onAviso, onErro }) {
  const [busca, setBusca] = useState('');
  const [modoPagamento, setModoPagamento] = useState('vista'); // 'vista' | 'prazo'
  const [carrinho, setCarrinho] = useState([]); // [{ nome, formato, quantidade, precoAVista, precoAPrazo }]
  const [clienteNome, setClienteNome] = useState('');
  const [observacao, setObservacao] = useState('');
  const [baixarAmbos, setBaixarAmbos] = useState(false);
  const [gerando, setGerando] = useState(false);

  const itensFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return CATALOGO_VENDA;
    return CATALOGO_VENDA.filter((it) => it.nome.toLowerCase().includes(termo));
  }, [busca]);

  function precoAtual(item) {
    return modoPagamento === 'vista' ? item.precoAVista : item.precoAPrazo;
  }

  function adicionarItem(item) {
    setCarrinho((atual) => {
      const idx = atual.findIndex((i) => i.nome === item.nome);
      if (idx >= 0) {
        const copia = [...atual];
        copia[idx] = { ...copia[idx], quantidade: copia[idx].quantidade + 1 };
        return copia;
      }
      return [...atual, { ...item, quantidade: 1 }];
    });
  }

  function alterarQuantidade(nome, delta) {
    setCarrinho((atual) => atual
      .map((i) => (i.nome === nome ? { ...i, quantidade: Math.max(0, arredondar(i.quantidade + delta)) } : i))
      .filter((i) => i.quantidade > 0));
  }

  function definirQuantidadeTexto(nome, texto) {
    const valor = parsePrecoBR(texto.replace(/[^0-9.,]/g, ''));
    setCarrinho((atual) => atual.map((i) => (i.nome === nome ? { ...i, quantidadeTexto: texto, quantidade: isNaN(valor) ? i.quantidade : valor } : i)));
  }

  function confirmarQuantidadeTexto(nome) {
    setCarrinho((atual) => atual
      .map((i) => {
        if (i.nome !== nome) return i;
        const { quantidadeTexto, ...resto } = i;
        return resto.quantidade > 0 ? resto : { ...resto, quantidade: 1 };
      })
      .filter((i) => i.quantidade > 0));
  }

  function arredondar(v) {
    return Math.round(v * 100) / 100;
  }

  function removerItem(nome) {
    setCarrinho((atual) => atual.filter((i) => i.nome !== nome));
  }

  function limparCarrinho() {
    setCarrinho([]);
    setClienteNome('');
    setObservacao('');
  }

  const total = carrinho.reduce((acc, i) => acc + i.quantidade * precoAtual(i), 0);

  async function baixarPdf() {
    if (carrinho.length === 0) return;
    setGerando(true);
    try {
      const modos = baixarAmbos ? ['vista', 'prazo'] : [modoPagamento];
      for (const modo of modos) {
        await gerarPdfOrcamentoVenda({
          itens: carrinho.map((i) => ({
            nome: i.nome,
            formato: i.formato,
            quantidade: i.quantidade,
            precoUnit: modo === 'vista' ? i.precoAVista : i.precoAPrazo,
          })),
          modoPagamento: modo,
          clienteNome,
          observacao,
        });
      }
      onAviso && onAviso(baixarAmbos ? 'Os dois orçamentos (à vista e a prazo) foram baixados.' : 'Orçamento em PDF baixado.');
    } catch (e) {
      onErro && onErro('Não foi possível gerar o PDF do orçamento.');
    } finally {
      setGerando(false);
    }
  }

  return (
    <div className="space-y-4 pb-40 sm:pb-0">
      {/* ---- modo de pagamento ---- */}
      <div className="eco-card p-3 flex items-center gap-2">
        <span className="text-xs font-medium text-stone-500 flex-shrink-0">Forma de pagamento:</span>
        <div className="flex bg-stone-100 rounded-lg p-1 flex-1 max-w-xs">
          <button
            onClick={() => setModoPagamento('vista')}
            className={`flex-1 text-sm font-medium rounded-md py-1.5 transition-colors ${modoPagamento === 'vista' ? 'bg-white text-green-800 shadow-sm' : 'text-stone-500'}`}
          >
            À vista
          </button>
          <button
            onClick={() => setModoPagamento('prazo')}
            className={`flex-1 text-sm font-medium rounded-md py-1.5 transition-colors ${modoPagamento === 'prazo' ? 'bg-white text-green-800 shadow-sm' : 'text-stone-500'}`}
          >
            A prazo
          </button>
        </div>
      </div>

      {/* ---- catálogo ---- */}
      <div className="eco-card p-3">
        <div className="relative mb-2">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-300" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar madeira/peça…"
            className="eco-input pl-8"
          />
        </div>
        <div className="max-h-72 overflow-y-auto -mx-1 px-1 divide-y divide-stone-100">
          {itensFiltrados.length === 0 && (
            <p className="text-center text-sm text-stone-400 py-6">Nenhum item encontrado para "{busca}".</p>
          )}
          {itensFiltrados.map((item) => (
            <button
              key={item.nome}
              onClick={() => adicionarItem(item)}
              className="w-full flex items-center justify-between gap-3 py-2.5 text-left hover:bg-stone-50 rounded-lg px-1.5 -mx-1.5 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-stone-800 truncate">{item.nome}</p>
                <p className="text-xs text-stone-400">{item.formato} · {formatMoney(precoAtual(item))}</p>
              </div>
              <span className="eco-icon-btn bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800 flex-shrink-0">
                <Plus size={16} />
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ---- carrinho / orçamento montado ---- */}
      <div className="eco-card p-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-stone-700 flex items-center gap-1.5">
            <ShoppingCart size={15} /> Itens do orçamento ({carrinho.length})
          </p>
          {carrinho.length > 0 && (
            <button onClick={limparCarrinho} className="text-xs text-stone-400 hover:text-red-600 transition-colors">
              Limpar tudo
            </button>
          )}
        </div>

        {carrinho.length === 0 ? (
          <p className="text-sm text-stone-400 py-4 text-center">Toque em um item da lista acima para adicionar ao orçamento.</p>
        ) : (
          <div className="space-y-2">
            {carrinho.map((item) => (
              <div key={item.nome} className="flex items-center gap-2 bg-stone-50 rounded-lg p-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-stone-800 truncate">{item.nome}</p>
                  <p className="text-xs text-stone-400">{formatMoney(precoAtual(item))} / {item.formato}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => alterarQuantidade(item.nome, -1)} className="eco-icon-btn w-7 h-7">
                    <Minus size={13} />
                  </button>
                  <input
                    value={item.quantidadeTexto !== undefined ? item.quantidadeTexto : String(item.quantidade)}
                    onChange={(e) => definirQuantidadeTexto(item.nome, e.target.value)}
                    onBlur={() => confirmarQuantidadeTexto(item.nome)}
                    inputMode="decimal"
                    className="w-12 text-center text-sm border border-stone-200 rounded-md py-1"
                  />
                  <button onClick={() => alterarQuantidade(item.nome, 1)} className="eco-icon-btn w-7 h-7">
                    <Plus size={13} />
                  </button>
                </div>
                <p className="text-sm font-semibold text-stone-800 w-20 text-right flex-shrink-0">
                  {formatMoney(item.quantidade * precoAtual(item))}
                </p>
                <button onClick={() => removerItem(item.nome)} className="eco-icon-btn-danger w-7 h-7 flex-shrink-0">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ---- dados do cliente ---- */}
      {carrinho.length > 0 && (
        <div className="eco-card p-3 space-y-3">
          <div>
            <label className="eco-label">Nome do cliente (opcional)</label>
            <input value={clienteNome} onChange={(e) => setClienteNome(e.target.value)} className="eco-input" placeholder="Nome do cliente" />
          </div>
          <div>
            <label className="eco-label">Observações (opcional)</label>
            <textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} className="eco-input" rows={2} placeholder="Ex.: prazo de entrega, frete, etc." />
          </div>
          <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer">
            <input
              type="checkbox"
              checked={baixarAmbos}
              onChange={(e) => setBaixarAmbos(e.target.checked)}
              className="w-4 h-4 rounded border-stone-300 text-green-700 focus:ring-green-500/40"
            />
            Gerar os dois PDFs (à vista e a prazo) — útil quando o cliente pede pra comparar
          </label>
        </div>
      )}

      {/* ---- barra de total: flutua acima do menu no celular, encaixada no fluxo no desktop ---- */}
      {carrinho.length > 0 && (
        <div className="fixed inset-x-0 bottom-28 sm:static sm:bottom-auto z-30 px-3 sm:px-0">
          <div className="eco-card max-w-5xl mx-auto sm:mx-0 p-3 flex items-center justify-between gap-3 shadow-elevated sm:shadow-soft">
            <div>
              <p className="text-xs text-stone-400">Total ({modoPagamento === 'vista' ? 'à vista' : 'a prazo'})</p>
              <p className="text-lg font-bold text-green-800">{formatMoney(total)}</p>
            </div>
            <button onClick={baixarPdf} disabled={gerando} className="eco-btn-primary">
              <FileDown size={16} /> {gerando ? 'Gerando…' : baixarAmbos ? 'Gerar os 2 PDFs' : 'Gerar PDF'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
