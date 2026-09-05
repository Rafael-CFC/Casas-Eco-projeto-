import React, { useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Pause, Pencil, Play, Plus, Repeat, Trash2, X } from 'lucide-react';
import { formatMoney, formatDateBR, parsePrecoBR, todayISO } from '../domain';
import { StatCard } from '../dashboard/FinanceiroDashboard';
import { diaValido, mesDe, mesVizinho, rotuloMes, situacaoDoMes, totalMensal } from './contasFixasCalc';

// Tela das contas que vencem todo mês (energia, água, aluguel, internet,
// salário). Duas partes:
//
//   1. o quadro do mês — o que já foi lançado e o que ainda falta, com o
//      botão de lançar (um de cada vez, ou todas de uma vez);
//   2. a lista dos moldes — cadastrar, corrigir, pausar e apagar.
//
// Lançar é sempre uma ação do dono. O sistema não cria boleto sozinho:
// energia e água mudam de valor todo mês, e um número que ninguém conferiu
// atrapalharia mais do que ajudaria.

const formVazio = { nome: '', fornecedorNome: '', valor: '', diaVencimento: '', observacao: '' };

export default function ContasFixas({
  fixas, contas, fornecedores,
  onSalvarFixa, onRemoverFixa, onAlternarPausa, onLancar, onLancarTodas, onMarcarPaga,
}) {
  const hoje = todayISO();
  const [mes, setMes] = useState(() => mesDe(hoje));
  const [form, setForm] = useState(formVazio);
  const [editandoId, setEditandoId] = useState(null);
  const [formAberto, setFormAberto] = useState(false);
  const [erroForm, setErroForm] = useState('');

  const situacao = useMemo(() => situacaoDoMes(fixas, contas, mes), [fixas, contas, mes]);
  const pendentes = situacao.filter((s) => !s.lancada);
  const lancadas = situacao.filter((s) => s.lancada);
  const totalDoMes = situacao.reduce((a, s) => a + (Number(s.fixa.valor) || 0), 0);
  const pausadas = (fixas || []).filter((f) => f.ativa === false);

  const nomesFornecedores = useMemo(
    () => (fornecedores || []).map((f) => f.nome).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [fornecedores]
  );

  function abrirNova() {
    setForm(formVazio);
    setEditandoId(null);
    setErroForm('');
    setFormAberto(true);
  }

  function abrirEdicao(fixa) {
    setForm({
      nome: fixa.nome || '',
      fornecedorNome: fixa.fornecedorNome || '',
      valor: fixa.valor != null ? String(fixa.valor).replace('.', ',') : '',
      diaVencimento: fixa.diaVencimento != null ? String(fixa.diaVencimento) : '',
      observacao: fixa.observacao || '',
    });
    setEditandoId(fixa.id);
    setErroForm('');
    setFormAberto(true);
  }

  function fecharForm() {
    setFormAberto(false);
    setEditandoId(null);
    setForm(formVazio);
    setErroForm('');
  }

  function salvar() {
    const nome = form.nome.trim();
    if (!nome) { setErroForm('Dê um nome para a conta (ex: ENERGIA ELÉTRICA).'); return; }

    const dia = diaValido(form.diaVencimento);
    if (dia === null) { setErroForm('O dia do vencimento precisa ser um número de 1 a 31.'); return; }

    const valor = parsePrecoBR(form.valor);
    if (isNaN(valor) || valor <= 0) { setErroForm('Informe o valor de sempre dessa conta.'); return; }

    onSalvarFixa({
      id: editandoId,
      nome,
      fornecedorNome: form.fornecedorNome.trim(),
      valor,
      diaVencimento: dia,
      observacao: form.observacao.trim(),
    });
    fecharForm();
  }

  const ehMesAtual = mes === mesDe(hoje);

  return (
    <div className="space-y-6">
      {/* ---- o que sai todo mês ---- */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 eco-stagger">
        <StatCard
          label="Custo fixo do mês"
          numero={totalMensal(fixas)}
          formatar={formatMoney}
          sub={`${(fixas || []).filter((f) => f.ativa !== false).length} conta(s) ativa(s)`}
          icon={Repeat}
        />
        <StatCard
          label="Já lançado"
          numero={lancadas.reduce((a, s) => a + (Number(s.conta.valor) || 0), 0)}
          formatar={formatMoney}
          sub={`${lancadas.length} de ${situacao.length}`}
          tone={situacao.length > 0 && pendentes.length === 0 ? 'good' : 'default'}
          icon={Check}
        />
        <StatCard
          label="Falta lançar"
          numero={pendentes.reduce((a, s) => a + (Number(s.fixa.valor) || 0), 0)}
          formatar={formatMoney}
          sub={pendentes.length === 0 ? 'Nada pendente neste mês' : `${pendentes.length} conta(s)`}
          tone={pendentes.length > 0 ? 'bad' : 'good'}
          icon={Plus}
        />
      </div>

      {/* ---- o quadro do mês ---- */}
      <div className="eco-card p-4">
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <button onClick={() => setMes(mesVizinho(mes, -1))} className="eco-btn-ghost eco-btn-sm" title="Mês anterior">
              <ChevronLeft size={15} />
            </button>
            {/* `capitalize` do Tailwind subiria a inicial de toda palavra
                ("Setembro De 2026"); aqui só a primeira letra sobe. */}
            <p className="text-sm font-semibold text-stone-700 first-letter:uppercase min-w-[9.5rem] text-center">
              {rotuloMes(mes)}
            </p>
            <button onClick={() => setMes(mesVizinho(mes, 1))} className="eco-btn-ghost eco-btn-sm" title="Próximo mês">
              <ChevronRight size={15} />
            </button>
            {!ehMesAtual && (
              <button onClick={() => setMes(mesDe(hoje))} className="eco-btn-ghost eco-btn-sm text-xs">
                Voltar para o mês de hoje
              </button>
            )}
          </div>
          {pendentes.length > 1 && (
            <button onClick={() => onLancarTodas(pendentes, mes)} className="eco-btn-primary eco-btn-sm">
              <Plus size={14} /> Lançar as {pendentes.length} de {rotuloMes(mes).split(' de ')[0]}
            </button>
          )}
        </div>

        {situacao.length === 0 ? (
          <p className="text-sm text-stone-500">
            Nenhuma conta fixa cadastrada ainda. Cadastre embaixo o que vence todo mês — energia,
            água, aluguel, internet — e todo mês elas aparecem aqui prontas para lançar.
          </p>
        ) : (
          <div className="border border-stone-200 rounded-lg overflow-hidden">
            {situacao.map(({ fixa, vencimento, conta, lancada }) => {
              const paga = lancada && conta.status === 'pago';
              const atrasada = lancada && !paga && vencimento < hoje;
              return (
                <div
                  key={fixa.id}
                  className="px-3 py-2.5 border-t border-stone-100 first:border-t-0 flex items-center justify-between gap-3 flex-wrap"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-stone-800 truncate">
                      {fixa.nome}
                      {fixa.fornecedorNome && (
                        <span className="text-stone-400"> · {fixa.fornecedorNome}</span>
                      )}
                    </p>
                    <p className="text-xs text-stone-500">
                      vence {formatDateBR(vencimento)}
                      {lancada && conta.valor !== fixa.valor && (
                        <span> · lançada por {formatMoney(conta.valor)}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5 flex-shrink-0">
                    <span className="text-sm font-medium text-stone-800 whitespace-nowrap">
                      {formatMoney(lancada ? conta.valor : fixa.valor)}
                    </span>
                    {!lancada ? (
                      <button onClick={() => onLancar(fixa, vencimento)} className="eco-btn-secondary eco-btn-sm">
                        <Plus size={13} /> Lançar
                      </button>
                    ) : (
                      <>
                        <span className={`eco-badge border whitespace-nowrap ${
                          paga
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : atrasada
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : 'bg-stone-50 text-stone-600 border-stone-200'
                        }`}>
                          {paga ? 'PAGA' : atrasada ? 'VENCIDA' : 'LANÇADA'}
                        </span>
                        {onMarcarPaga && (
                          <button onClick={() => onMarcarPaga(conta.id)} className="eco-btn-ghost eco-btn-sm text-xs">
                            {paga ? 'Reabrir' : 'Paga'}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {situacao.length > 0 && (
          <p className="text-xs text-stone-500 mt-2">
            Total de {rotuloMes(mes)}: {formatMoney(totalDoMes)}. O boleto lançado vira uma conta
            normal — aparece em Por dia, no Relatório e nos avisos de vencimento.
          </p>
        )}
      </div>

      {/* ---- cadastro dos moldes ---- */}
      <div className="eco-card p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <p className="text-sm font-semibold text-stone-700">Contas cadastradas</p>
          {!formAberto && (
            <button onClick={abrirNova} className="eco-btn-primary eco-btn-sm">
              <Plus size={14} /> Nova conta fixa
            </button>
          )}
        </div>

        {formAberto && (
          <div className="border border-stone-200 rounded-lg p-3 mb-3 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-stone-500 block mb-1">Nome da conta</label>
                <input
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value.toUpperCase() })}
                  placeholder="ENERGIA ELÉTRICA"
                  autoFocus
                  className="eco-input"
                />
              </div>
              <div>
                <label className="text-xs text-stone-500 block mb-1">Quem cobra (opcional)</label>
                <input
                  value={form.fornecedorNome}
                  onChange={(e) => setForm({ ...form, fornecedorNome: e.target.value.toUpperCase() })}
                  placeholder="CEMIG"
                  list="lista-fornecedores-fixas"
                  className="eco-input"
                />
                <datalist id="lista-fornecedores-fixas">
                  {nomesFornecedores.map((n) => <option key={n} value={n} />)}
                </datalist>
              </div>
              <div>
                <label className="text-xs text-stone-500 block mb-1">Valor de sempre</label>
                <input
                  value={form.valor}
                  onChange={(e) => setForm({ ...form, valor: e.target.value })}
                  placeholder="450,00"
                  inputMode="decimal"
                  className="eco-input"
                />
                <p className="text-[11px] text-stone-400 mt-1">
                  É só o valor sugerido — na hora de lançar dá para corrigir.
                </p>
              </div>
              <div>
                <label className="text-xs text-stone-500 block mb-1">Dia do vencimento</label>
                <input
                  value={form.diaVencimento}
                  onChange={(e) => setForm({ ...form, diaVencimento: e.target.value.replace(/\D/g, '').slice(0, 2) })}
                  placeholder="10"
                  inputMode="numeric"
                  className="eco-input"
                />
                <p className="text-[11px] text-stone-400 mt-1">
                  Dia 31 em mês que não tem: cai no último dia do mês.
                </p>
              </div>
            </div>
            <div>
              <label className="text-xs text-stone-500 block mb-1">Observação (opcional)</label>
              <input
                value={form.observacao}
                onChange={(e) => setForm({ ...form, observacao: e.target.value })}
                placeholder="Débito em conta no Sicoob"
                className="eco-input"
              />
            </div>
            {erroForm && <p className="text-xs text-red-600">{erroForm}</p>}
            <div className="flex gap-1.5">
              <button onClick={salvar} className="eco-btn-primary eco-btn-sm">
                <Check size={14} /> {editandoId ? 'Salvar alteração' : 'Cadastrar'}
              </button>
              <button onClick={fecharForm} className="eco-btn-secondary eco-btn-sm">
                <X size={14} /> Cancelar
              </button>
            </div>
          </div>
        )}

        {(fixas || []).length === 0 ? (
          <p className="text-sm text-stone-500">
            Nada cadastrado ainda.
          </p>
        ) : (
          <div className="border border-stone-200 rounded-lg overflow-hidden">
            {(fixas || []).map((fixa) => {
              const pausada = fixa.ativa === false;
              return (
                <div
                  key={fixa.id}
                  className="px-3 py-2.5 border-t border-stone-100 first:border-t-0 flex items-center justify-between gap-3 flex-wrap"
                >
                  <div className="min-w-0">
                    <p className={`text-sm truncate ${pausada ? 'text-stone-400' : 'text-stone-800'}`}>
                      {fixa.nome}
                      {pausada && (
                        <span className="eco-badge border bg-stone-50 text-stone-500 border-stone-200 ml-1.5">
                          PAUSADA
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-stone-500">
                      todo dia {fixa.diaVencimento} · {formatMoney(fixa.valor)}
                      {fixa.fornecedorNome && ` · ${fixa.fornecedorNome}`}
                      {fixa.observacao && ` · ${fixa.observacao}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => abrirEdicao(fixa)} className="eco-btn-ghost eco-btn-sm" title="Corrigir">
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => onAlternarPausa(fixa)}
                      className="eco-btn-ghost eco-btn-sm"
                      title={pausada ? 'Voltar a cobrar todo mês' : 'Pausar (para de aparecer no quadro do mês)'}
                    >
                      {pausada ? <Play size={14} /> : <Pause size={14} />}
                    </button>
                    <button onClick={() => onRemoverFixa(fixa)} className="eco-btn-ghost eco-btn-sm text-red-600" title="Apagar">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-xs text-stone-500 mt-3">
          Apagar ou pausar um molde <strong>não mexe</strong> nos boletos já lançados — eles
          continuam nas contas a pagar. Pausar serve para conta que parou por um tempo e ainda
          vai voltar{pausadas.length > 0 ? ` (${pausadas.length} pausada(s) agora)` : ''}.
        </p>
      </div>
    </div>
  );
}
