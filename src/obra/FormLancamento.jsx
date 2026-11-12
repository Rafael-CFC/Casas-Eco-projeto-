import React, { useDeferredValue, useMemo, useState } from 'react';
import { ClipboardList, FileText, Pencil, Plus, Trees } from 'lucide-react';
import { todayISO, formatMoney, formatDateBR, parsePrecoBR } from '../domain';
import { upperInput, normalizeProductName, normalizeUnit } from '../textUtils';
import ProdutoSeletor from '../produtos/ProdutoSeletor';
import SeletorComBusca from '../ui/SeletorComBusca';
import { nivelDeConfianca, precisaDeAjuda, opcoesDeSubcategoria } from '../produtos/classificacao';

// O formulário de lançar um gasto na obra, com estado PRÓPRIO.
//
// Por que ele saiu de dentro do App: o App é uma tela só, com dezenas de
// estados, e cada tecla digitada num campo do formulário re-renderizava
// tudo — a lista de obras, os cartões do resumo, a tabela de lançamentos.
// No celular do dono, com o catálogo do PDV carregado, isso dava mais de
// um décimo de segundo de atraso POR LETRA; a tela parecia travada.
//
// Aqui dentro, digitar só re-renderiza este formulário. O App só é avisado
// quando o dono clica em lançar — que é quando ele tem o que fazer.
//
// O que o formulário NÃO faz de propósito: gravar. Ele valida, monta os
// dados e entrega para quem sabe gravar (`onLancar`). Assim a regra de
// gravação continua num lugar só.

// Mão de obra é pagamento de gente: quem recebeu, quanto e quando. Sem
// quantidade, unidade nem preço unitário — campo de compra de material só
// atrapalhava quem quer anotar o que o pedreiro já recebeu.
function estadoInicial(emEdicao, pagamentoMaoDeObra) {
  if (!emEdicao) {
    return {
      descricao: '', quantidade: '1', unidade: 'UN', preco: '',
      data: todayISO(), observacao: '', etapaId: '', fornecedor: '',
      fornecedorAutomatico: false,
    };
  }
  // Lançamento antigo de mão de obra, feito quando a tela pedia quantidade
  // e preço unitário ("5 diárias x R$ 150"), volta pelo TOTAL — assim
  // editar a data não muda o valor que já estava gravado.
  return {
    descricao: emEdicao.descricao || '',
    quantidade: pagamentoMaoDeObra ? '1' : String(emEdicao.quantidade),
    unidade: pagamentoMaoDeObra ? '' : emEdicao.unidade,
    preco: String(pagamentoMaoDeObra ? emEdicao.total : emEdicao.preco),
    data: emEdicao.data,
    observacao: emEdicao.observacao || '',
    etapaId: emEdicao.etapaId || '',
    fornecedor: emEdicao.fornecedorNome || '',
    fornecedorAutomatico: false,
  };
}

// A bolinha de confiança: verde = o sistema tem certeza, âmbar = achou
// parecido, cinza = não sabe. É de propósito discreta — é um palpite
// ajudando, não um alarme.
const CORES_CONFIANCA = {
  alta: 'bg-green-500',
  media: 'bg-amber-500',
  baixa: 'bg-stone-300',
  nenhuma: 'bg-stone-300',
};

// O que o sistema reconheceu do item, embaixo do campo: categoria,
// unidade e a última compra. Tudo aqui é sugestão — o dono troca no
// "trocar", e a troca vira aprendizado para a próxima vez.
function FaixaDeSugestao({ sugestao, historico, aberto, onAbrir, onEscolher }) {
  const nivel = nivelDeConfianca(sugestao);
  const pedeAjuda = precisaDeAjuda(sugestao);
  const opcoes = useMemo(() => opcoesDeSubcategoria(), []);

  return (
    <div className="mt-1.5 text-[11px] leading-snug">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${CORES_CONFIANCA[nivel]}`} />
        {sugestao.subcategoria ? (
          <span className="text-stone-500">
            {sugestao.subcategoriaLabel}
            {sugestao.unidade ? ` · ${sugestao.unidade}` : ''}
            {sugestao.tipo ? ` · ${sugestao.tipo === 'servico' ? 'serviço' : 'material'}` : ''}
            {sugestao.origem === 'aprendido' ? ' · você ensinou' : ''}
            {sugestao.origem === 'historico' && sugestao.vezes > 1 ? ` · já lançado ${sugestao.vezes}×` : ''}
          </span>
        ) : (
          <span className="text-stone-400">{pedeAjuda ? 'não reconheci este item' : ''}</span>
        )}
        <button type="button" onClick={onAbrir} className="text-stone-400 underline hover:text-green-700">
          {aberto ? 'fechar' : pedeAjuda ? 'escolher' : 'trocar'}
        </button>
      </div>

      {historico && historico.ultimo && (
        <p className="text-stone-400 mt-0.5">
          última compra {formatMoney(historico.ultimo.preco)} em {formatDateBR(historico.ultimo.data)}
          {historico.ultimo.fornecedorNome ? ` · ${historico.ultimo.fornecedorNome}` : ''}
          {historico.variacao !== null && Math.abs(historico.variacao) >= 5 && (
            <span className={historico.variacao > 0 ? ' text-amber-700' : ' text-green-700'}>
              {' '}({historico.variacao > 0 ? '+' : ''}{historico.variacao.toFixed(0)}% desde a primeira)
            </span>
          )}
        </p>
      )}

      {aberto && (
        <select
          autoFocus
          value={sugestao.subcategoria || ''}
          onChange={(e) => onEscolher(e.target.value)}
          className="eco-input-sm mt-1.5 w-full"
        >
          <option value="">Escolha a categoria…</option>
          {opcoes.map((o) => (
            <option key={o.key} value={o.key}>{o.label} · {o.categoria}</option>
          ))}
        </select>
      )}
    </div>
  );
}

export default function FormLancamento({
  categoria,
  categoriaLabel,
  classeBotao,
  pagamentoMaoDeObra,
  catalogo,
  nomesQuemRecebe,
  detalheDoNome,
  fornecedores,
  etapas,
  fornecedorMadeiras,
  ehMadeira,
  emEdicao,
  onLancar,
  onCancelarEdicao,
  onErro,
  onColarLista,
  onLerNota,
  classificar,
  historicoDoProduto,
  onCorrigirClassificacao,
}) {
  const [form, setForm] = useState(() => estadoInicial(emEdicao, pagamentoMaoDeObra));
  const [salvando, setSalvando] = useState(false);
  const [escolhendoCategoria, setEscolhendoCategoria] = useState(false);
  const mudar = (campos) => setForm((f) => ({ ...f, ...campos }));

  // O reconhecimento roda sobre o nome ADIADO (useDeferredValue): a letra
  // digitada aparece na hora e a faixa de sugestão se atualiza logo
  // atrás, sem segurar o teclado.
  const nomeAdiado = useDeferredValue(form.descricao);
  const sugestao = useMemo(
    () => (classificar ? classificar(nomeAdiado) : null),
    [classificar, nomeAdiado]
  );
  const historico = useMemo(
    () => (historicoDoProduto && nomeAdiado.trim() ? historicoDoProduto(nomeAdiado) : null),
    [historicoDoProduto, nomeAdiado]
  );

  // O dono trocou a categoria: aplica a unidade sugerida (se ele ainda
  // não digitou uma própria) e ensina o sistema.
  function escolherCategoria(chave) {
    if (!chave) return;
    const escolha = opcoesDeSubcategoria().find((o) => o.key === chave);
    if (!escolha) return;
    setEscolhendoCategoria(false);
    setForm((f) => ({ ...f, unidade: f.unidade && f.unidade !== 'UN' ? f.unidade : escolha.unidade }));
    if (onCorrigirClassificacao) {
      onCorrigirClassificacao(form.descricao, {
        subcategoria: escolha.key, unidade: escolha.unidade, secao: escolha.secao, tipo: escolha.tipo,
      });
    }
  }

  // A madeira vem toda de uma distribuidora só (ver Configurações >
  // Madeiras). Quando o item lançado é madeira, o fornecedor já entra
  // preenchido — assim o gasto aparece no Financeiro sem depender de
  // alguém lembrar de digitar. O campo continua editável: se a compra foi
  // em outro lugar, é só trocar, e o que foi digitado à mão nunca é
  // apagado pelo sistema.
  function ajustarFornecedorMadeira(nome, atual) {
    if (!fornecedorMadeiras) return {};
    const madeira = ehMadeira(nome, categoria);
    if (madeira && (!atual.fornecedor.trim() || atual.fornecedorAutomatico)) {
      return { fornecedor: fornecedorMadeiras, fornecedorAutomatico: true };
    }
    if (!madeira && atual.fornecedorAutomatico) {
      return { fornecedor: '', fornecedorAutomatico: false };
    }
    return {};
  }

  function aoDigitarDescricao(valor) {
    const nome = upperInput(valor);
    setForm((f) => {
      const item = catalogo.find((it) => it.nome.toLowerCase() === nome.trim().toLowerCase());
      return {
        ...f,
        descricao: nome,
        ...(item ? { preco: String(item.preco), unidade: item.unidade } : {}),
        ...ajustarFornecedorMadeira(nome, f),
      };
    });
  }

  function selecionarItemCatalogo(item) {
    setForm((f) => ({
      ...f,
      descricao: item.nome,
      unidade: item.unidade,
      preco: String(item.preco),
      ...ajustarFornecedorMadeira(item.nome, f),
    }));
  }

  async function lancar() {
    const quantidade = pagamentoMaoDeObra ? 1 : parsePrecoBR(form.quantidade);
    const preco = parsePrecoBR(form.preco);
    const nome = normalizeProductName(form.descricao);
    const unidade = pagamentoMaoDeObra ? '' : (normalizeUnit(form.unidade) || 'UN');

    if (!nome) { onErro(pagamentoMaoDeObra ? 'Diga quem recebeu o pagamento.' : 'Descreva o item.'); return; }
    if (!pagamentoMaoDeObra && (isNaN(quantidade) || quantidade <= 0)) { onErro('Informe uma quantidade válida.'); return; }
    if (isNaN(preco) || preco < 0 || (pagamentoMaoDeObra && preco === 0)) {
      onErro(pagamentoMaoDeObra ? 'Informe quanto foi pago.' : 'Informe um valor válido.');
      return;
    }
    // Pagamento sem data não serve para nada: a data é metade do que se
    // quer saber ("quanto o pedreiro recebeu e quando").
    if (pagamentoMaoDeObra && !form.data) { onErro('Informe a data do pagamento.'); return; }

    setSalvando(true);
    const ok = await onLancar({
      nome, quantidade, preco, unidade,
      data: form.data || todayISO(),
      observacao: form.observacao.trim(),
      etapaId: form.etapaId || null,
      fornecedorNome: form.fornecedor.trim(),
      // o que o sistema reconheceu fica gravado junto: é o que permite
      // somar por categoria depois sem adivinhar de novo
      subcategoria: sugestao && sugestao.subcategoria ? sugestao.subcategoria : null,
      tipo: sugestao && sugestao.tipo ? sugestao.tipo : null,
    });
    setSalvando(false);
    if (ok) setForm(estadoInicial(null, pagamentoMaoDeObra));
  }

  return (
    <div className="eco-card p-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 items-end">
      <div className="col-span-2 sm:col-span-4 lg:col-span-2">
        <label className="text-xs text-stone-500 block mb-1">
          {pagamentoMaoDeObra ? 'Quem recebeu' : categoria === 'produto_loja' ? 'Produto' : 'Descrição'}
        </label>
        {pagamentoMaoDeObra ? (
          <SeletorComBusca
            value={form.descricao}
            onChange={(v) => mudar({ descricao: v })}
            nomes={nomesQuemRecebe}
            titulo="Quem recebeu"
            placeholder="Ex: JOÃO PEDREIRO"
            buscaPlaceholder="Procurar pelo nome…"
            textoNovo="Usar este nome"
            textoListaVazia="Ninguém recebeu pagamento ainda — digite o nome."
            contagem={{ singular: 'nome já usado', plural: 'nomes já usados' }}
            detalhe={detalheDoNome}
          />
        ) : (
          <ProdutoSeletor
            value={form.descricao}
            onChangeTexto={aoDigitarDescricao}
            onSelecionar={selecionarItemCatalogo}
            itens={catalogo}
            categoriaLabel={categoriaLabel}
            placeholder={
              categoria === 'produto_loja'
                ? 'Digite ou escolha — se já existir, o preço vem sozinho'
                : categoria === 'madeiras'
                  ? 'Ex: Tábua pinus 30cm'
                  : 'Ex: Areia lavada'
            }
          />
        )}
        {sugestao && form.descricao.trim().length > 2 && (
          <FaixaDeSugestao
            sugestao={sugestao}
            historico={historico}
            aberto={escolhendoCategoria}
            onAbrir={() => setEscolhendoCategoria((v) => !v)}
            onEscolher={escolherCategoria}
          />
        )}
      </div>
      {!pagamentoMaoDeObra && (
        <div className="col-span-1">
          <label className="text-xs text-stone-500 block mb-1">Qtd.</label>
          <input value={form.quantidade} onChange={(e) => mudar({ quantidade: e.target.value })} inputMode="decimal"
            className="eco-input" />
        </div>
      )}
      {!pagamentoMaoDeObra && (
        <div className="col-span-1">
          <label className="text-xs text-stone-500 block mb-1">Unid.</label>
          <input value={form.unidade} onChange={(e) => mudar({ unidade: upperInput(e.target.value) })} placeholder="UN, M³..."
            className="eco-input" />
        </div>
      )}
      <div className="col-span-1">
        <label className="text-xs text-stone-500 block mb-1">
          {pagamentoMaoDeObra ? 'Quanto recebeu (R$)' : 'Valor (R$)'}
        </label>
        <input value={form.preco} onChange={(e) => mudar({ preco: e.target.value })} placeholder="0,00" inputMode="decimal"
          className="eco-input" />
      </div>
      <div className="col-span-1">
        <label className="text-xs text-stone-500 block mb-1">
          {pagamentoMaoDeObra ? 'Data do pagamento' : 'Data'}
        </label>
        <input type="date" value={form.data} onChange={(e) => mudar({ data: e.target.value })}
          className="eco-input" />
      </div>
      {etapas.length > 0 && (
        <div className="col-span-1">
          <label className="text-xs text-stone-500 block mb-1">Etapa (opc.)</label>
          <select value={form.etapaId} onChange={(e) => mudar({ etapaId: e.target.value })} className="eco-input">
            <option value="">Nenhuma</option>
            {etapas.map((et) => <option key={et.id} value={et.id}>{et.nome}</option>)}
          </select>
        </div>
      )}
      {!pagamentoMaoDeObra && (
        <div className="col-span-2 sm:col-span-2 lg:col-span-2">
          <label className="text-xs text-stone-500 block mb-1">Fornecedor (opcional)</label>
          <input
            value={form.fornecedor}
            onChange={(e) => mudar({ fornecedor: e.target.value, fornecedorAutomatico: false })}
            placeholder="Ex: Depósito São José"
            list="lista-fornecedores-lancamento"
            className="eco-input"
          />
          <datalist id="lista-fornecedores-lancamento">
            {fornecedores.map((f) => <option key={f.id} value={f.nome} />)}
          </datalist>
          {form.fornecedorAutomatico && (
            <p className="text-[11px] text-green-700 mt-1 flex items-center gap-1">
              <Trees size={11} /> madeira — gasto vinculado a {form.fornecedor} (dá para trocar)
            </p>
          )}
        </div>
      )}
      <div className="col-span-2 sm:col-span-2 lg:col-span-2">
        <label className="text-xs text-stone-500 block mb-1">Observação (opcional)</label>
        <input value={form.observacao} onChange={(e) => mudar({ observacao: e.target.value })}
          placeholder={pagamentoMaoDeObra ? 'Ex: adiantamento da semana' : 'Ex: comprado em outra loja'}
          className="eco-input" />
      </div>
      <div className="col-span-2 sm:col-span-4 lg:col-span-2 flex gap-2">
        <button
          type="button"
          onClick={lancar}
          disabled={salvando}
          className={`flex-1 text-white text-sm font-medium px-4 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all duration-150 active:scale-[0.97] disabled:opacity-60 ${classeBotao} hover:opacity-90`}
        >
          <Plus size={15} /> {emEdicao ? 'Salvar edição' : pagamentoMaoDeObra ? 'Registrar pagamento' : 'Lançar'}
        </button>
        {emEdicao && (
          <button type="button" onClick={onCancelarEdicao} className="eco-btn-secondary flex-1">
            Cancelar
          </button>
        )}
        {/* A compra que veio em lista (nota da madeireira, papel, WhatsApp)
            não precisa ser digitada item por item. E quando o que chegou
            foi a NOTA inteira, o sistema tira dela o fornecedor, a data e
            o número também — e avisa se essa nota já foi lançada. */}
        {!emEdicao && onColarLista && (
          <button type="button" onClick={onColarLista} className="eco-btn-secondary flex-1">
            <ClipboardList size={15} /> Colar lista
          </button>
        )}
        {!emEdicao && onLerNota && (
          <button type="button" onClick={onLerNota} className="eco-btn-secondary flex-1">
            <FileText size={15} /> Ler nota
          </button>
        )}
      </div>
    </div>
  );
}
