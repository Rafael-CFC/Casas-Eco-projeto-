import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, ArrowRight, User, Home, DollarSign, ListOrdered, ClipboardList, Eye,
  Plus, Trash2, ChevronUp, ChevronDown, FileDown, AlertTriangle, Check, Wand2,
} from 'lucide-react';
import { formatMoney, formatDateBR, parsePrecoBR, todayISO } from '../domain';
import { valorPorExtenso } from './numeroPorExtenso';
import { MODELOS_OBRA, ETAPAS_SUGERIDAS, CATEGORIAS_MEMORIAL, memorialPadraoDoModelo } from '../config/configStore';
import {
  novaParcela, reordenarParcelas, moverParcela, totalParcelas, diferencaParcelas,
  distribuirValorIgualmente, validarContrato, congelarContrato, clausulasResolvidas, memorialResolvido,
} from './contratosStore';
import { gerarPdfContrato, gerarPdfMemorial, gerarPdfContratoEMemorial } from './gerarPdfContrato';

const ETAPAS = [
  { key: 'cliente', label: 'Cliente', icon: User },
  { key: 'obra', label: 'Obra', icon: Home },
  { key: 'valor', label: 'Valor', icon: DollarSign },
  { key: 'parcelas', label: 'Parcelas', icon: ListOrdered },
  { key: 'memorial', label: 'Memorial', icon: ClipboardList },
  { key: 'revisao', label: 'Revisão', icon: Eye },
];

export default function NovoContrato({
  contratoInicial, config, obras, clientes, contratos,
  onSalvarRascunho, onFinalizar, onCancelar, onAviso, onErro, onConfirmar,
}) {
  const [contrato, setContrato] = useState(contratoInicial);
  const [etapa, setEtapa] = useState('cliente');
  const [valorTexto, setValorTexto] = useState(
    contratoInicial.valorTotal ? String(contratoInicial.valorTotal).replace('.', ',') : ''
  );
  const [gerando, setGerando] = useState(false);
  const primeiraRenderizacao = useRef(true);

  // Rascunho automático: salva sozinho pouco depois de cada alteração, para
  // não perder nada se a página for fechada no meio do preenchimento.
  useEffect(() => {
    if (primeiraRenderizacao.current) { primeiraRenderizacao.current = false; return; }
    const t = setTimeout(() => { onSalvarRascunho(contrato); }, 1200);
    return () => clearTimeout(t);
  }, [contrato]);

  function set(campo, valor) {
    setContrato((c) => ({ ...c, [campo]: valor, atualizadoEm: todayISO() }));
  }
  function setCliente(campo, valor) {
    setContrato((c) => ({ ...c, cliente: { ...c.cliente, [campo]: valor }, atualizadoEm: todayISO() }));
  }
  function setObra(campo, valor) {
    setContrato((c) => ({ ...c, obra: { ...c.obra, [campo]: valor }, atualizadoEm: todayISO() }));
  }

  // Ao escolher um cliente já cadastrado, preenche tudo de uma vez.
  function usarClienteExistente(clienteId) {
    const cli = clientes.find((c) => c.id === clienteId);
    if (!cli) return;
    setContrato((c) => ({
      ...c,
      clienteId: cli.id,
      cliente: {
        nome: cli.nome || '', cpfCnpj: cli.cpfCnpj || '', endereco: cli.endereco || '',
        cidade: cli.cidade || '', estado: cli.estado || '', telefone: cli.telefone || '', email: cli.email || '',
      },
      atualizadoEm: todayISO(),
    }));
  }

  // Ao vincular a uma obra já existente, aproveita nome/endereço/cliente.
  function usarObraExistente(obraId) {
    const obra = obras.find((o) => o.id === obraId);
    if (!obra) { set('obraId', null); return; }
    setContrato((c) => ({
      ...c,
      obraId: obra.id,
      obra: {
        ...c.obra,
        nome: c.obra.nome || obra.nome || '',
        endereco: c.obra.endereco || obra.endereco || '',
      },
      cliente: c.cliente.nome ? c.cliente : { ...c.cliente, nome: obra.cliente || '' },
      valorTotal: c.valorTotal || obra.orcamento || 0,
      atualizadoEm: todayISO(),
    }));
    if (!contrato.valorTotal && obra.orcamento) setValorTexto(String(obra.orcamento).replace('.', ','));
  }

  function trocarModeloObra(modelo) {
    const memorialAtualVazio = !(contrato.memorial || []).some((m) => m.texto.trim());
    setContrato((c) => ({
      ...c,
      modeloObra: modelo,
      // só recarrega o memorial padrão se o atual ainda estiver em branco,
      // para não apagar um texto que o usuário já ajustou
      memorial: memorialAtualVazio ? memorialPadraoDoModelo(config, modelo) : c.memorial,
      atualizadoEm: todayISO(),
    }));
  }

  // ---- parcelas ----
  function adicionarParcela(etapaNome = '') {
    setContrato((c) => ({
      ...c,
      parcelas: reordenarParcelas([...c.parcelas, novaParcela(c.parcelas.length + 1, etapaNome)]),
      atualizadoEm: todayISO(),
    }));
  }
  function usarEtapasSugeridas() {
    setContrato((c) => ({
      ...c,
      parcelas: reordenarParcelas(ETAPAS_SUGERIDAS.map((e, i) => novaParcela(i + 1, e))),
      atualizadoEm: todayISO(),
    }));
  }
  function alterarParcela(id, campo, valor) {
    setContrato((c) => ({
      ...c,
      parcelas: c.parcelas.map((p) => (p.id === id ? { ...p, [campo]: valor } : p)),
      atualizadoEm: todayISO(),
    }));
  }
  function removerParcela(id) {
    setContrato((c) => ({ ...c, parcelas: reordenarParcelas(c.parcelas.filter((p) => p.id !== id)), atualizadoEm: todayISO() }));
  }
  function mover(index, direcao) {
    setContrato((c) => ({ ...c, parcelas: moverParcela(c.parcelas, index, direcao), atualizadoEm: todayISO() }));
  }
  function distribuir() {
    setContrato((c) => ({ ...c, parcelas: distribuirValorIgualmente(c.valorTotal, c.parcelas), atualizadoEm: todayISO() }));
  }

  function setMemorialTexto(chave, texto) {
    setContrato((c) => ({
      ...c,
      memorial: (c.memorial || []).map((m) => (m.chave === chave ? { ...m, texto } : m)),
      atualizadoEm: todayISO(),
    }));
  }

  const validacao = useMemo(() => validarContrato(contrato, config), [contrato, config]);
  const diff = diferencaParcelas(contrato.valorTotal, contrato.parcelas);
  const somaParcelas = totalParcelas(contrato.parcelas);

  async function gerar(tipo) {
    if (!validacao.podeGerar) {
      onErro(validacao.bloqueios[0]);
      return;
    }
    setGerando(true);
    try {
      const congelado = congelarContrato(contrato, config, contratos);
      if (tipo === 'contrato') await gerarPdfContrato(congelado, config);
      else if (tipo === 'memorial') await gerarPdfMemorial(congelado, config);
      else await gerarPdfContratoEMemorial(congelado, config);
      setContrato(congelado);
      await onFinalizar(congelado);
      onAviso(`Documento gerado. Contrato nº ${congelado.numero} salvo no histórico.`);
    } catch (e) {
      onErro('Não foi possível gerar o documento.');
    } finally {
      setGerando(false);
    }
  }

  const indiceEtapa = ETAPAS.findIndex((e) => e.key === etapa);
  const proximaEtapa = () => setEtapa(ETAPAS[Math.min(ETAPAS.length - 1, indiceEtapa + 1)].key);
  const etapaAnterior = () => setEtapa(ETAPAS[Math.max(0, indiceEtapa - 1)].key);

  return (
    <div className="space-y-4 pb-28 sm:pb-6">
      <button onClick={onCancelar} className="text-sm text-stone-500 hover:text-stone-800 flex items-center gap-1 transition-colors">
        <ArrowLeft size={14} /> Voltar para contratos
      </button>

      {/* trilha de etapas */}
      <div className="eco-card p-2 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {ETAPAS.map((e, i) => {
            const Icon = e.icon;
            const ativo = etapa === e.key;
            const passou = i < indiceEtapa;
            return (
              <button
                key={e.key}
                onClick={() => setEtapa(e.key)}
                className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-2 rounded-lg transition-colors whitespace-nowrap ${
                  ativo ? 'bg-green-700 text-white' : passou ? 'text-green-700 hover:bg-green-50' : 'text-stone-400 hover:bg-stone-50'
                }`}
              >
                {passou ? <Check size={13} /> : <Icon size={13} />}
                <span className="hidden xs:inline sm:inline">{e.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ---- ETAPA 1: CLIENTE ---- */}
      {etapa === 'cliente' && (
        <div className="eco-card p-4 space-y-3">
          <p className="text-sm font-semibold text-stone-700">Dados do cliente (CONTRATANTE)</p>
          {clientes.length > 0 && (
            <div>
              <label className="eco-label">Usar cliente já cadastrado</label>
              <select
                value={contrato.clienteId || ''}
                onChange={(e) => (e.target.value ? usarClienteExistente(e.target.value) : set('clienteId', null))}
                className="eco-input"
              >
                <option value="">— Digitar um cliente novo —</option>
                {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="eco-label">Nome completo *</label>
              <input value={contrato.cliente.nome} onChange={(e) => setCliente('nome', e.target.value)} className="eco-input" />
            </div>
            <div>
              <label className="eco-label">CPF/CNPJ</label>
              <input value={contrato.cliente.cpfCnpj} onChange={(e) => setCliente('cpfCnpj', e.target.value)} className="eco-input" />
            </div>
            <div>
              <label className="eco-label">Telefone</label>
              <input value={contrato.cliente.telefone} onChange={(e) => setCliente('telefone', e.target.value)} className="eco-input" />
            </div>
            <div className="sm:col-span-2">
              <label className="eco-label">Endereço</label>
              <input value={contrato.cliente.endereco} onChange={(e) => setCliente('endereco', e.target.value)} className="eco-input" />
            </div>
            <div>
              <label className="eco-label">Cidade</label>
              <input value={contrato.cliente.cidade} onChange={(e) => setCliente('cidade', e.target.value)} className="eco-input" />
            </div>
            <div>
              <label className="eco-label">Estado (UF)</label>
              <input value={contrato.cliente.estado} onChange={(e) => setCliente('estado', e.target.value)} className="eco-input" />
            </div>
            <div className="sm:col-span-2">
              <label className="eco-label">E-mail</label>
              <input value={contrato.cliente.email} onChange={(e) => setCliente('email', e.target.value)} className="eco-input" />
            </div>
          </div>
        </div>
      )}

      {/* ---- ETAPA 2: OBRA ---- */}
      {etapa === 'obra' && (
        <div className="eco-card p-4 space-y-3">
          <p className="text-sm font-semibold text-stone-700">Dados da obra</p>
          {obras.length > 0 && (
            <div>
              <label className="eco-label">Vincular a uma obra já cadastrada</label>
              <select value={contrato.obraId || ''} onChange={(e) => usarObraExistente(e.target.value)} className="eco-input">
                <option value="">— Não vincular por enquanto —</option>
                {obras.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
              </select>
              <p className="text-xs text-stone-400 mt-1">
                Vinculando, o contrato e as parcelas aparecem dentro da página da obra.
              </p>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="eco-label">Nome/identificação da obra *</label>
              <input value={contrato.obra.nome} onChange={(e) => setObra('nome', e.target.value)} className="eco-input" placeholder="Ex.: CASA JOÃO" />
            </div>
            <div className="sm:col-span-2">
              <label className="eco-label">Modelo da obra</label>
              <select value={contrato.modeloObra} onChange={(e) => trocarModeloObra(e.target.value)} className="eco-input">
                {MODELOS_OBRA.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="eco-label">Endereço da obra</label>
              <input value={contrato.obra.endereco} onChange={(e) => setObra('endereco', e.target.value)} className="eco-input" />
            </div>
            <div>
              <label className="eco-label">Cidade</label>
              <input value={contrato.obra.cidade} onChange={(e) => setObra('cidade', e.target.value)} className="eco-input" />
            </div>
            <div>
              <label className="eco-label">Estado (UF)</label>
              <input value={contrato.obra.estado} onChange={(e) => setObra('estado', e.target.value)} className="eco-input" />
            </div>
            <div>
              <label className="eco-label">Área construída (m²)</label>
              <input value={contrato.obra.area} onChange={(e) => setObra('area', e.target.value)} inputMode="decimal" className="eco-input" />
            </div>
            <div>
              <label className="eco-label">Varanda (m²)</label>
              <input value={contrato.obra.varanda} onChange={(e) => setObra('varanda', e.target.value)} inputMode="decimal" className="eco-input" />
            </div>
            <div>
              <label className="eco-label">Deck (m²)</label>
              <input value={contrato.obra.deck} onChange={(e) => setObra('deck', e.target.value)} inputMode="decimal" className="eco-input" />
            </div>
            <div>
              <label className="eco-label">Pavimentos</label>
              <input value={contrato.obra.pavimentos} onChange={(e) => setObra('pavimentos', e.target.value)} className="eco-input" />
            </div>
            <div>
              <label className="eco-label">Data de início</label>
              <input type="date" value={contrato.obra.dataInicio} onChange={(e) => setObra('dataInicio', e.target.value)} className="eco-input" />
            </div>
            <div>
              <label className="eco-label">Prazo de execução</label>
              <input value={contrato.obra.prazo} onChange={(e) => setObra('prazo', e.target.value)} className="eco-input" placeholder="Ex.: 180 dias" />
            </div>
            <div className="sm:col-span-2">
              <label className="eco-label">Observações da obra</label>
              <textarea value={contrato.obra.observacoes} onChange={(e) => setObra('observacoes', e.target.value)} rows={2} className="eco-input" />
            </div>
          </div>
        </div>
      )}

      {/* ---- ETAPA 3: VALOR ---- */}
      {etapa === 'valor' && (
        <div className="eco-card p-4 space-y-3">
          <p className="text-sm font-semibold text-stone-700">Valor total da obra</p>
          <div>
            <label className="eco-label">Valor total (R$) *</label>
            <input
              value={valorTexto}
              onChange={(e) => {
                setValorTexto(e.target.value);
                const v = parsePrecoBR(e.target.value);
                set('valorTotal', isNaN(v) ? 0 : v);
              }}
              inputMode="decimal"
              placeholder="0,00"
              className="eco-input text-lg font-semibold"
            />
          </div>
          {contrato.valorTotal > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-xs text-green-700/80">Valor por extenso (vai automático no contrato)</p>
              <p className="text-sm font-medium text-green-900 mt-0.5 capitalize">{valorPorExtenso(contrato.valorTotal)}</p>
            </div>
          )}
        </div>
      )}

      {/* ---- ETAPA 4: PARCELAS ---- */}
      {etapa === 'parcelas' && (
        <div className="space-y-3">
          <div className="eco-card p-4">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <p className="text-sm font-semibold text-stone-700">Parcelas e etapas de pagamento</p>
              <div className="flex gap-2">
                {contrato.parcelas.length === 0 && (
                  <button onClick={usarEtapasSugeridas} className="eco-btn-secondary eco-btn-xs">
                    <Wand2 size={12} /> Usar etapas padrão
                  </button>
                )}
                {contrato.parcelas.length > 0 && contrato.valorTotal > 0 && (
                  <button onClick={distribuir} className="eco-btn-secondary eco-btn-xs">
                    <Wand2 size={12} /> Dividir igualmente
                  </button>
                )}
                <button onClick={() => adicionarParcela()} className="eco-btn-secondary eco-btn-xs">
                  <Plus size={12} /> Parcela
                </button>
              </div>
            </div>

            {contrato.parcelas.length === 0 ? (
              <p className="text-sm text-stone-400 text-center py-6">
                Nenhuma parcela ainda. Use "Usar etapas padrão" para começar rápido.
              </p>
            ) : (
              <div className="space-y-2">
                {contrato.parcelas.map((p, i) => (
                  <div key={p.id} className="bg-stone-50 rounded-lg p-2.5 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-green-700 text-white text-xs font-semibold flex items-center justify-center flex-shrink-0">
                        {p.ordem}
                      </span>
                      <input
                        value={p.etapa}
                        onChange={(e) => alterarParcela(p.id, 'etapa', e.target.value.toUpperCase())}
                        placeholder="ETAPA"
                        className="eco-input-sm flex-1 min-w-0"
                      />
                      <div className="flex flex-shrink-0">
                        <button onClick={() => mover(i, -1)} disabled={i === 0} className="eco-icon-btn w-7 h-7 disabled:opacity-30">
                          <ChevronUp size={13} />
                        </button>
                        <button onClick={() => mover(i, 1)} disabled={i === contrato.parcelas.length - 1} className="eco-icon-btn w-7 h-7 disabled:opacity-30">
                          <ChevronDown size={13} />
                        </button>
                        <button onClick={() => removerParcela(p.id)} className="eco-icon-btn-danger w-7 h-7">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-stone-400 block">Valor</label>
                        <input
                          value={p.valor ? String(p.valor).replace('.', ',') : ''}
                          onChange={(e) => {
                            const v = parsePrecoBR(e.target.value);
                            alterarParcela(p.id, 'valor', isNaN(v) ? 0 : v);
                          }}
                          inputMode="decimal"
                          placeholder="0,00"
                          className="eco-input-sm w-full"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-stone-400 block">Vencimento</label>
                        <input
                          type="date"
                          value={p.vencimento || ''}
                          onChange={(e) => alterarParcela(p.id, 'vencimento', e.target.value)}
                          className="eco-input-sm w-full"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {contrato.parcelas.length > 0 && (
            <div className={`eco-card p-3 ${diff !== 0 ? 'border-amber-300 bg-amber-50/40' : 'border-green-200 bg-green-50/30'}`}>
              <div className="flex items-center justify-between text-sm">
                <span className="text-stone-600">Soma das parcelas</span>
                <span className="font-semibold text-stone-900">{formatMoney(somaParcelas)}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-stone-600">Valor do contrato</span>
                <span className="font-semibold text-stone-900">{formatMoney(contrato.valorTotal)}</span>
              </div>
              {diff !== 0 && (
                <p className="text-xs text-amber-800 mt-2 flex items-start gap-1.5">
                  <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
                  {diff > 0
                    ? `Faltam ${formatMoney(diff)} para fechar o valor do contrato.`
                    : `As parcelas passaram ${formatMoney(Math.abs(diff))} do valor do contrato.`}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ---- ETAPA 5: MEMORIAL ---- */}
      {etapa === 'memorial' && (
        <div className="space-y-3">
          <div className="eco-card p-3 border-blue-200 bg-blue-50/40">
            <p className="text-xs text-blue-900">
              O texto já vem do modelo padrão desta obra ({MODELOS_OBRA.find((m) => m.key === contrato.modeloObra)?.label}).
              Ajuste só o que for específico desta obra — o modelo salvo em Configurações não é alterado.
            </p>
          </div>
          {CATEGORIAS_MEMORIAL.map((cat) => {
            const item = (contrato.memorial || []).find((m) => m.chave === cat.chave) || { texto: '' };
            return (
              <div key={cat.chave} className="eco-card p-4">
                <label className="eco-label">{cat.titulo}</label>
                <textarea
                  value={item.texto}
                  onChange={(e) => setMemorialTexto(cat.chave, e.target.value)}
                  rows={3}
                  className="eco-input text-xs"
                  placeholder="Vazio — preencha aqui ou cadastre um padrão em Configurações."
                />
              </div>
            );
          })}
        </div>
      )}

      {/* ---- ETAPA 6: REVISÃO ---- */}
      {etapa === 'revisao' && (
        <div className="space-y-3">
          {validacao.bloqueios.length > 0 && (
            <div className="eco-card p-4 border-red-300 bg-red-50/50">
              <p className="text-sm font-semibold text-red-800 mb-1.5 flex items-center gap-1.5">
                <AlertTriangle size={15} /> Falta preencher antes de gerar
              </p>
              <ul className="text-xs text-red-700 space-y-1 list-disc list-inside">
                {validacao.bloqueios.map((b, i) => <li key={i}>{b}</li>)}
              </ul>
            </div>
          )}
          {validacao.problemas.length > 0 && (
            <div className="eco-card p-4 border-amber-300 bg-amber-50/40">
              <p className="text-sm font-semibold text-amber-800 mb-1.5 flex items-center gap-1.5">
                <AlertTriangle size={15} /> Confira antes de gerar
              </p>
              <ul className="text-xs text-amber-800 space-y-1 list-disc list-inside">
                {validacao.problemas.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            </div>
          )}

          <PreVisualizacao contrato={contrato} config={config} />

          <div className="eco-card p-4 space-y-2">
            <p className="text-sm font-semibold text-stone-700 mb-1">Gerar documentos</p>
            <button onClick={() => gerar('ambos')} disabled={gerando || !validacao.podeGerar} className="eco-btn-primary w-full">
              <FileDown size={16} /> {gerando ? 'Gerando…' : 'Gerar contrato + memorial (PDF único)'}
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => gerar('contrato')} disabled={gerando || !validacao.podeGerar} className="eco-btn-secondary">
                <FileDown size={14} /> Só contrato
              </button>
              <button onClick={() => gerar('memorial')} disabled={gerando || !validacao.podeGerar} className="eco-btn-secondary">
                <FileDown size={14} /> Só memorial
              </button>
            </div>
            <p className="text-xs text-stone-400 pt-1">
              Ao gerar, o contrato recebe um número, é salvo no histórico e os dados do modelo ficam
              congelados nele — alterar o modelo depois não muda este documento.
            </p>
          </div>
        </div>
      )}

      {/* navegação entre etapas */}
      <div className="fixed inset-x-0 bottom-16 sm:static sm:bottom-auto z-30 px-3 sm:px-0">
        <div className="eco-card max-w-5xl mx-auto sm:mx-0 p-2.5 flex items-center justify-between gap-2 shadow-elevated sm:shadow-soft">
          <button onClick={etapaAnterior} disabled={indiceEtapa === 0} className="eco-btn-secondary eco-btn-sm disabled:opacity-40">
            <ArrowLeft size={14} /> Voltar
          </button>
          <span className="text-xs text-stone-400">{indiceEtapa + 1} de {ETAPAS.length}</span>
          {indiceEtapa < ETAPAS.length - 1 ? (
            <button onClick={proximaEtapa} className="eco-btn-primary eco-btn-sm">
              Continuar <ArrowRight size={14} />
            </button>
          ) : (
            <span className="text-xs text-green-700 font-medium">Última etapa</span>
          )}
        </div>
      </div>
    </div>
  );
}

// Pré-visualização fiel do que vai sair no PDF.
function PreVisualizacao({ contrato, config }) {
  const clausulas = clausulasResolvidas(contrato, config);
  const memorial = memorialResolvido(contrato, config);
  const contratada = contrato.contratadaSnapshot || config.contratada || {};

  return (
    <div className="eco-card overflow-hidden">
      <div className="px-4 py-2.5 border-b border-stone-100 bg-stone-50">
        <p className="text-sm font-semibold text-stone-700">Pré-visualização do documento</p>
      </div>
      <div className="p-5 max-h-[420px] overflow-y-auto text-xs text-stone-700 space-y-4 bg-white">
        <div className="text-center border-b border-stone-200 pb-3">
          <p className="font-bold text-green-800 text-sm">CASAS ECO</p>
          <p className="font-bold text-stone-900 mt-2 uppercase">Contrato de Prestação de Serviços de Construção</p>
        </div>

        <div>
          <p className="font-semibold text-green-800 uppercase text-[11px] mb-1">Das partes</p>
          <p className="font-semibold mt-1.5">CONTRATADA</p>
          <p className="text-stone-500">{contratada.razaoSocial || '(dados da empresa não preenchidos)'}{contratada.cnpj ? ` — CNPJ ${contratada.cnpj}` : ''}</p>
          <p className="font-semibold mt-1.5">CONTRATANTE</p>
          <p className="text-stone-500">{contrato.cliente.nome || '(cliente não informado)'}{contrato.cliente.cpfCnpj ? ` — ${contrato.cliente.cpfCnpj}` : ''}</p>
        </div>

        <div>
          <p className="font-semibold text-green-800 uppercase text-[11px] mb-1">Da obra</p>
          <p className="text-stone-500">{contrato.obra.nome || '(obra não informada)'}{contrato.obra.endereco ? ` — ${contrato.obra.endereco}` : ''}</p>
        </div>

        <div className="bg-stone-50 border border-stone-200 rounded-lg p-3">
          <p className="font-semibold text-green-800 uppercase text-[11px]">Valor total da obra</p>
          <p className="font-bold text-stone-900 text-sm mt-1">{formatMoney(contrato.valorTotal)}</p>
          <p className="text-stone-500 capitalize">({valorPorExtenso(contrato.valorTotal)})</p>
        </div>

        {contrato.parcelas.length > 0 && (
          <div>
            <p className="font-semibold text-green-800 uppercase text-[11px] mb-1.5">Das parcelas</p>
            <table className="w-full">
              <tbody>
                {contrato.parcelas.map((p) => (
                  <tr key={p.id} className="border-b border-stone-100">
                    <td className="py-1 text-stone-400 w-6">{p.ordem}</td>
                    <td className="py-1">{p.etapa || 'Parcela'}</td>
                    <td className="py-1 text-right text-stone-500">{p.vencimento ? formatDateBR(p.vencimento) : '—'}</td>
                    <td className="py-1 text-right font-semibold">{formatMoney(p.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {clausulas.length > 0 ? (
          clausulas.map((c) => (
            <div key={c.chave}>
              <p className="font-semibold text-green-800 uppercase text-[11px] mb-1">{c.titulo}</p>
              <p className="whitespace-pre-wrap text-stone-600">{c.texto}</p>
            </div>
          ))
        ) : (
          <p className="text-red-600 bg-red-50 border border-red-200 rounded p-2.5">
            O texto das cláusulas ainda não foi cadastrado. Vá em Configurações → Modelo de contrato e cole o
            texto do contrato da Casas Eco (uma única vez).
          </p>
        )}

        {memorial.length > 0 && (
          <div className="border-t border-stone-200 pt-4">
            <p className="font-bold text-stone-900 uppercase text-center mb-3">Memorial Descritivo</p>
            {memorial.map((m) => (
              <div key={m.chave} className="mb-3">
                <p className="font-semibold text-green-800 uppercase text-[11px] mb-1">{m.titulo}</p>
                <p className="whitespace-pre-wrap text-stone-600">{m.texto}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
