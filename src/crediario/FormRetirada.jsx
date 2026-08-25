import React, { useState } from 'react';
import { Plus, Trash2, X, Save } from 'lucide-react';
import { formatMoney, parsePrecoBR, todayISO } from '../domain';
import { upperInput } from '../textUtils';
import ProdutoSeletor from '../produtos/ProdutoSeletor';
import { itemVazio, nomeExibicao } from './crediarioStore';

// Formulário de retirada: o montador levou tais produtos, em tal data.
// O preço vem preenchido do catálogo só como referência do valor a
// descontar depois — dá para trocar linha a linha, e nada disso vira
// venda ou nota.
export default function FormRetirada({
  montador, obras, catalogoProdutos, movimentoEditando, onSalvar, onCancelar, onErro,
}) {
  const editando = Boolean(movimentoEditando);

  const [data, setData] = useState(movimentoEditando?.data || todayISO());
  const [obraId, setObraId] = useState(movimentoEditando?.obraId || '');
  const [observacao, setObservacao] = useState(movimentoEditando?.observacao || '');
  const [itens, setItens] = useState(() => {
    if (movimentoEditando && movimentoEditando.itens?.length) {
      return movimentoEditando.itens.map((it) => ({
        id: it.id || crypto.randomUUID(),
        nome: it.nome,
        unidade: it.unidade,
        produtoId: it.produtoId || null,
        quantidadeTexto: String(it.quantidade).replace('.', ','),
        precoTexto: String(it.precoUnitario).replace('.', ','),
      }));
    }
    return [itemVazio()];
  });

  function alterarItem(id, campos) {
    setItens((atual) => atual.map((it) => (it.id === id ? { ...it, ...campos } : it)));
  }

  function adicionarLinha() {
    setItens((atual) => [...atual, itemVazio()]);
  }

  function removerLinha(id) {
    setItens((atual) => (atual.length === 1 ? [itemVazio()] : atual.filter((it) => it.id !== id)));
  }

  function numeros(item) {
    const quantidade = parsePrecoBR(item.quantidadeTexto);
    const precoUnitario = parsePrecoBR(item.precoTexto);
    return {
      quantidade: isNaN(quantidade) ? 0 : quantidade,
      precoUnitario: isNaN(precoUnitario) ? 0 : precoUnitario,
    };
  }

  function totalDaLinha(item) {
    const { quantidade, precoUnitario } = numeros(item);
    return Math.round(quantidade * precoUnitario * 100) / 100;
  }

  const total = Math.round(itens.reduce((soma, it) => soma + totalDaLinha(it), 0) * 100) / 100;

  function salvar() {
    const preenchidos = itens.filter((it) => it.nome.trim());
    if (preenchidos.length === 0) {
      onErro && onErro('Coloque pelo menos um produto na retirada.');
      return;
    }
    const semQuantidade = preenchidos.find((it) => numeros(it).quantidade <= 0);
    if (semQuantidade) {
      onErro && onErro(`Informe a quantidade de "${semQuantidade.nome.trim()}".`);
      return;
    }
    onSalvar({
      montadorId: montador.id,
      data,
      obraId: obraId || null,
      observacao,
      itens: preenchidos.map((it) => ({
        id: it.id,
        nome: it.nome,
        unidade: it.unidade,
        produtoId: it.produtoId,
        ...numeros(it),
      })),
    });
  }

  return (
    <div className="space-y-4">
      <div className="eco-card p-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-stone-900">
              {editando ? 'Editar retirada' : 'Nova retirada'}
            </p>
            <p className="text-xs text-stone-500">{nomeExibicao(montador)}</p>
          </div>
          <button onClick={onCancelar} className="eco-icon-btn" title="Fechar">
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="w-full sm:w-40">
            <label className="text-xs text-stone-500 block mb-1">Data</label>
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} className="eco-input" />
          </div>
          <div className="w-full sm:flex-1 min-w-0">
            <label className="text-xs text-stone-500 block mb-1">Obra (opcional)</label>
            <select value={obraId} onChange={(e) => setObraId(e.target.value)} className="eco-input">
              <option value="">Sem obra específica</option>
              {obras.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-3">
          {itens.map((item, indice) => (
            <div key={item.id} className="border border-stone-200 rounded-lg p-3 space-y-3 bg-stone-50/50">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-stone-400">ITEM {indice + 1}</span>
                <button onClick={() => removerLinha(item.id)} className="eco-icon-btn-danger" title="Remover item">
                  <Trash2 size={15} />
                </button>
              </div>

              <div>
                <label className="text-xs text-stone-500 block mb-1">Produto</label>
                <ProdutoSeletor
                  value={item.nome}
                  onChangeTexto={(texto) => alterarItem(item.id, { nome: upperInput(texto), produtoId: null })}
                  onSelecionar={(escolhido) => alterarItem(item.id, {
                    nome: escolhido.nome,
                    unidade: escolhido.unidade || 'UN',
                    produtoId: escolhido.produtoId || null,
                    precoTexto: escolhido.preco != null ? String(escolhido.preco).replace('.', ',') : item.precoTexto,
                  })}
                  itens={catalogoProdutos}
                  placeholder="Digite ou escolha no catálogo"
                  categoriaLabel="Catálogo da loja"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <div className="w-24">
                  <label className="text-xs text-stone-500 block mb-1">Qtd.</label>
                  <input
                    value={item.quantidadeTexto}
                    onChange={(e) => alterarItem(item.id, { quantidadeTexto: e.target.value })}
                    inputMode="decimal"
                    className="eco-input"
                  />
                </div>
                <div className="w-24">
                  <label className="text-xs text-stone-500 block mb-1">Unidade</label>
                  <input
                    value={item.unidade}
                    onChange={(e) => alterarItem(item.id, { unidade: upperInput(e.target.value) })}
                    className="eco-input"
                  />
                </div>
                <div className="w-32">
                  <label className="text-xs text-stone-500 block mb-1">Valor unitário</label>
                  <input
                    value={item.precoTexto}
                    onChange={(e) => alterarItem(item.id, { precoTexto: e.target.value })}
                    placeholder="0,00"
                    inputMode="decimal"
                    className="eco-input"
                  />
                </div>
                <div className="flex-1 min-w-[100px] flex flex-col justify-end pb-1">
                  <p className="text-xs text-stone-400">Total do item</p>
                  <p className="font-semibold text-stone-800">{formatMoney(totalDaLinha(item))}</p>
                </div>
              </div>
            </div>
          ))}

          <button onClick={adicionarLinha} className="eco-btn-secondary eco-btn-sm">
            <Plus size={14} /> Adicionar outro produto
          </button>
        </div>

        <div>
          <label className="text-xs text-stone-500 block mb-1">Observação (opcional)</label>
          <input
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Ex: levou para terminar o telhado da obra do Zé"
            className="eco-input"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-stone-100 pt-3">
          <div>
            <p className="text-xs text-stone-400">Total da retirada</p>
            <p className="text-2xl font-semibold text-stone-900">{formatMoney(total)}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={onCancelar} className="eco-btn-secondary">Cancelar</button>
            <button onClick={salvar} className="eco-btn-primary">
              <Save size={15} /> {editando ? 'Salvar alterações' : 'Anotar retirada'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
