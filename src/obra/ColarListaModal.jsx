import React, { useMemo, useState } from 'react';
import { AlertTriangle, Check, ClipboardList, Info, X } from 'lucide-react';
import { formatMoney, parsePrecoBR, todayISO } from '../domain';
import { upperInput, normalizeProductName, normalizeUnit } from '../textUtils';
import { lerListaColada } from './colarLista';

// Colar a lista da compra em vez de digitar item por item.
//
// A listagem da madeireira chega em papel, em PDF ou no WhatsApp. O dono
// cola o texto inteiro aqui, do jeito que veio, e o sistema separa as
// linhas. Depois é o de sempre: ele confere e lança.
//
// A distribuidora, a data, a etapa e a observação ficam EM CIMA, valendo
// para a lista toda — é uma compra só, e repetir isso em cada item era
// metade do trabalho.
//
// Nada entra sozinho: a leitura é um chute bem informado em cima do texto,
// então todo campo continua editável e a conferência (soma dos itens
// contra o total que a própria lista declara) aparece antes do botão.

function Aviso({ tom = 'amber', children }) {
  const cls = tom === 'red'
    ? 'bg-red-50 border-red-200 text-red-700'
    : tom === 'green'
      ? 'bg-green-50 border-green-200 text-green-700'
      : tom === 'blue'
        ? 'bg-blue-50 border-blue-200 text-blue-700'
        : 'bg-amber-50 border-amber-200 text-amber-700';
  const Icon = tom === 'green' ? Check : tom === 'blue' ? Info : AlertTriangle;
  return (
    <div className={`flex items-start gap-2 text-xs border rounded-lg px-2.5 py-2 ${cls}`}>
      <Icon size={14} className="flex-shrink-0 mt-0.5" />
      <span className="leading-snug">{children}</span>
    </div>
  );
}

const EXEMPLO = `000350  EUCALIPTO ROLIÇO 18A22 3,00 MT  UN  5,00  90,00  0,00  450,00
4 eucalipto 14a18 5m 100,00
CIMENTO CP-II 50KG  10  42,00`;

export default function ColarListaModal({
  secaoLabel, fornecedorSugerido = '', nomesFornecedores = [], etapas = [],
  onCancelar, onLancar,
}) {
  const [texto, setTexto] = useState('');
  const [leitura, setLeitura] = useState(null);
  const [itens, setItens] = useState([]);
  const [data, setData] = useState(todayISO());
  const [fornecedor, setFornecedor] = useState(fornecedorSugerido);
  const [etapaId, setEtapaId] = useState('');
  const [observacao, setObservacao] = useState('');
  const [verIgnoradas, setVerIgnoradas] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  function ler() {
    setErro('');
    const r = lerListaColada(texto);
    if (r.itens.length === 0) {
      setLeitura(r);
      setItens([]);
      setErro('Não achei nenhum item nesse texto. Cada item numa linha, com o nome, a quantidade e o valor.');
      return;
    }
    setLeitura(r);
    setItens(r.itens.map((i) => ({
      ...i,
      selecionado: true,
      descricao: i.descricao,
      quantidade: String(i.quantidade).replace('.', ','),
      preco: String(i.preco).replace('.', ','),
    })));
  }

  function alterar(id, campos) {
    setItens((lista) => lista.map((i) => (i.id === id ? { ...i, ...campos } : i)));
  }

  function voltarParaOTexto() {
    setLeitura(null);
    setItens([]);
    setErro('');
  }

  // O que está marcado e tem número que presta. É daqui que saem o total
  // do rodapé e o que vai para o banco — os dois do mesmo lugar.
  const prontos = useMemo(() => itens
    .filter((i) => i.selecionado)
    .map((i) => ({
      id: i.id,
      descricao: normalizeProductName(i.descricao),
      unidade: normalizeUnit(i.unidade) || 'UN',
      quantidade: parsePrecoBR(i.quantidade),
      preco: parsePrecoBR(i.preco),
    }))
    .filter((i) => i.descricao && i.quantidade > 0 && i.preco >= 0), [itens]);

  const totalSelecionado = prontos.reduce((a, i) => a + i.quantidade * i.preco, 0);
  const marcados = itens.filter((i) => i.selecionado).length;
  const incompletos = marcados - prontos.length;

  async function lancar() {
    setErro('');
    if (prontos.length === 0) { setErro('Marque pelo menos um item com nome, quantidade e valor.'); return; }
    if (!data) { setErro('Informe a data da compra.'); return; }
    setSalvando(true);
    const ok = await onLancar(
      prontos.map((i) => ({ ...i, total: i.quantidade * i.preco })),
      { data, fornecedorNome: fornecedor.trim(), etapaId: etapaId || null, observacao: observacao.trim() }
    );
    setSalvando(false);
    if (ok) onCancelar();
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-white w-full sm:max-w-3xl sm:rounded-xl shadow-popover animate-scale-in flex flex-col max-h-[100dvh] sm:max-h-[90dvh]">
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-stone-100 flex-shrink-0">
          <div className="min-w-0">
            <p className="font-semibold text-stone-800 flex items-center gap-2">
              <ClipboardList size={17} /> Colar lista
            </p>
            <p className="text-xs text-stone-400 truncate">
              Os itens entram em <strong>{secaoLabel}</strong>, nesta obra.
            </p>
          </div>
          <button onClick={onCancelar} className="eco-icon-btn flex-shrink-0" aria-label="Fechar">
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto p-4 space-y-4 eco-rodape-seguro">
          {/* ---- passo 1: o texto ---- */}
          {!leitura || itens.length === 0 ? (
            <>
              <p className="text-sm text-stone-600">
                Cole a lista do jeito que ela veio — da nota da madeireira, do WhatsApp ou
                digitada na mão. Uma linha por item.
              </p>
              <textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                rows={10}
                placeholder={EXEMPLO}
                className="eco-input font-mono text-xs leading-relaxed"
              />
              <Aviso tom="blue">
                O que o sistema procura em cada linha: o <strong>nome</strong> do item, a{' '}
                <strong>quantidade</strong> e o <strong>valor de cada um</strong>. Cabeçalho,
                total, vendedor e forma de pagamento ele pula sozinho — e mostra o que pulou.
              </Aviso>
              {erro && <Aviso tom="red">{erro}</Aviso>}
            </>
          ) : (
            <>
              {/* ---- o que vale para a lista toda ---- */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-1">
                  <label className="eco-label">Data da compra</label>
                  <input type="date" value={data} onChange={(e) => setData(e.target.value)} className="eco-input" />
                </div>
                <div className="col-span-1">
                  <label className="eco-label">Distribuidora</label>
                  <input
                    value={fornecedor}
                    onChange={(e) => setFornecedor(e.target.value)}
                    list="lista-fornecedores-colar"
                    placeholder="Ex: Madeireira Cargnin"
                    className="eco-input"
                  />
                  <datalist id="lista-fornecedores-colar">
                    {nomesFornecedores.map((n) => <option key={n} value={n} />)}
                  </datalist>
                </div>
                {etapas.length > 0 && (
                  <div className="col-span-1">
                    <label className="eco-label">Etapa (opcional)</label>
                    <select value={etapaId} onChange={(e) => setEtapaId(e.target.value)} className="eco-input">
                      <option value="">Nenhuma</option>
                      {etapas.map((et) => <option key={et.id} value={et.id}>{et.nome}</option>)}
                    </select>
                  </div>
                )}
                <div className={etapas.length > 0 ? 'col-span-1' : 'col-span-2'}>
                  <label className="eco-label">Observação (opcional)</label>
                  <input
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    placeholder="Ex: venda 15592, desconto de R$ 294,00"
                    className="eco-input"
                  />
                </div>
              </div>
              <p className="text-xs text-stone-400 -mt-2">
                Data, distribuidora, etapa e observação valem para <strong>todos</strong> os itens da lista.
              </p>

              {/* ---- conferência ---- */}
              {leitura.descontoDeclarado > 0 && (
                <Aviso>
                  A lista traz um <strong>desconto de {formatMoney(leitura.descontoDeclarado)}</strong>.
                  Os itens entram pelo preço cheio, porque o lançamento é quantidade × valor e não
                  tem campo de desconto — vale anotar isso na observação aí em cima.
                </Aviso>
              )}
              {leitura.fecha === true && (
                <Aviso tom="green">
                  A soma dos itens bate com o total da lista ({formatMoney(leitura.totalDeclarado)}).
                </Aviso>
              )}
              {leitura.fecha === false && (
                <Aviso>
                  A lista diz <strong>{formatMoney(leitura.totalDeclarado)}</strong> e os itens lidos
                  somam <strong>{formatMoney(leitura.somaItens)}</strong>. Pode ser desconto, frete à
                  parte ou linha lida errado — confira antes de lançar.
                </Aviso>
              )}

              {/* ---- os itens ---- */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-stone-500">
                    {itens.length} {itens.length === 1 ? 'item lido' : 'itens lidos'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setItens((l) => l.map((i) => ({ ...i, selecionado: marcados === 0 })))}
                    className="eco-btn-ghost eco-btn-xs"
                  >
                    {marcados === 0 ? 'Marcar todos' : 'Desmarcar todos'}
                  </button>
                </div>

                {itens.map((i) => {
                  const q = parsePrecoBR(i.quantidade);
                  const p = parsePrecoBR(i.preco);
                  const total = (q > 0 ? q : 0) * (p > 0 ? p : 0);
                  return (
                    <div
                      key={i.id}
                      className={`rounded-lg border px-2.5 py-2 space-y-2 transition-colors ${
                        i.selecionado ? 'border-green-200 bg-green-50' : 'border-stone-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={i.selecionado}
                          onChange={(e) => alterar(i.id, { selecionado: e.target.checked })}
                          aria-label={`Lançar ${i.descricao}`}
                          className="w-4 h-4 flex-shrink-0 accent-green-600"
                        />
                        <input
                          value={i.descricao}
                          onChange={(e) => alterar(i.id, { descricao: upperInput(e.target.value) })}
                          aria-label="Descrição"
                          className="eco-input-sm flex-1 min-w-0"
                        />
                      </div>
                      <div className="flex items-center gap-2 pl-6">
                        <input
                          value={i.quantidade}
                          onChange={(e) => alterar(i.id, { quantidade: e.target.value })}
                          inputMode="decimal"
                          aria-label="Quantidade"
                          className="eco-input-sm w-16 flex-shrink-0 text-center"
                        />
                        <input
                          value={i.unidade}
                          onChange={(e) => alterar(i.id, { unidade: upperInput(e.target.value) })}
                          aria-label="Unidade"
                          className="eco-input-sm w-16 flex-shrink-0 text-center"
                        />
                        <span className="text-xs text-stone-400">×</span>
                        <input
                          value={i.preco}
                          onChange={(e) => alterar(i.id, { preco: e.target.value })}
                          inputMode="decimal"
                          aria-label="Valor de cada um"
                          className="eco-input-sm flex-1 min-w-0"
                        />
                        <span className="text-sm font-medium text-stone-700 tabular-nums w-24 text-right flex-shrink-0">
                          {formatMoney(total)}
                        </span>
                      </div>
                      {i.aviso && (
                        <p className="text-xs text-amber-700 pl-6 flex items-start gap-1">
                          <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" /> {i.aviso}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* ---- o que o sistema pulou ---- */}
              {leitura.ignoradas.length > 0 && (
                <div>
                  <button
                    type="button"
                    onClick={() => setVerIgnoradas((v) => !v)}
                    className="text-xs text-stone-400 underline"
                  >
                    {leitura.ignoradas.length} {leitura.ignoradas.length === 1 ? 'linha pulada' : 'linhas puladas'}
                    {verIgnoradas ? ' — esconder' : ' — ver quais'}
                  </button>
                  {verIgnoradas && (
                    <ul className="mt-1.5 space-y-1">
                      {leitura.ignoradas.map((ig) => (
                        <li key={ig.linha} className="text-xs text-stone-400 leading-snug">
                          <span className="text-stone-300">linha {ig.linha}:</span> {ig.bruto}{' '}
                          <span className="text-stone-300">({ig.motivo})</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {incompletos > 0 && (
                <Aviso>
                  {incompletos} {incompletos === 1 ? 'item marcado está' : 'itens marcados estão'} sem
                  nome, quantidade ou valor — {incompletos === 1 ? 'ele não vai' : 'eles não vão'} ser
                  {' '}lançado{incompletos === 1 ? '' : 's'}.
                </Aviso>
              )}
              {erro && <Aviso tom="red">{erro}</Aviso>}
            </>
          )}
        </div>

        {/* ---- rodapé ---- */}
        <div className="border-t border-stone-100 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 flex-shrink-0 eco-rodape-seguro">
          {!leitura || itens.length === 0 ? (
            <>
              <p className="text-sm text-stone-500">Cole a lista e confira antes de lançar.</p>
              <div className="flex gap-2">
                <button type="button" onClick={onCancelar} className="eco-btn-secondary eco-btn-sm flex-1 sm:flex-none">
                  Cancelar
                </button>
                <button type="button" onClick={ler} disabled={!texto.trim()} className="eco-btn-primary eco-btn-sm flex-1 sm:flex-none">
                  <ClipboardList size={15} /> Ler lista
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-stone-500">
                {prontos.length === 0 ? 'Nenhum item marcado.' : (
                  <>
                    {prontos.length} {prontos.length === 1 ? 'item' : 'itens'} ·{' '}
                    <span className="font-medium text-stone-800">{formatMoney(totalSelecionado)}</span>
                  </>
                )}
              </p>
              <div className="flex gap-2">
                <button type="button" onClick={voltarParaOTexto} className="eco-btn-secondary eco-btn-sm flex-1 sm:flex-none">
                  Voltar ao texto
                </button>
                <button
                  type="button"
                  onClick={lancar}
                  disabled={prontos.length === 0 || salvando}
                  className="eco-btn-primary eco-btn-sm flex-1 sm:flex-none"
                >
                  <Check size={15} />
                  {salvando ? 'Lançando…' : prontos.length > 1 ? `Lançar ${prontos.length} itens` : 'Lançar'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
