import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, FileDown, AlertTriangle, Pencil, Check, X, Wand2, FileText, Eye, Plus,
} from 'lucide-react';
import { formatMoney, parsePrecoBR, todayISO } from '../domain';
import { valorPorExtenso } from './numeroPorExtenso';
import {
  totalParcelas, diferencaParcelas, distribuirValorIgualmente, validarContrato,
  congelarContrato, blocosContratoResolvidos, blocosMemorialResolvidos,
  montarValoresMarcadores, dataPorExtenso, novaParcela, reordenarParcelas,
} from './contratosStore';
import { gerarPdfContrato, gerarPdfMemorial, gerarPdfContratoEMemorial } from './gerarPdfContrato';
import { partesDoParagrafo, semMarcacao } from './textoRico';

export default function NovoContrato({
  contratoInicial, config, obras, clientes, contratos,
  onSalvarRascunho, onFinalizar, onCancelar, onAviso, onErro,
}) {
  const [contrato, setContrato] = useState(contratoInicial);
  const [valorTexto, setValorTexto] = useState(
    contratoInicial.valorTotal ? String(contratoInicial.valorTotal).replace('.', ',') : ''
  );
  const [gerando, setGerando] = useState(false);
  const [abaMobile, setAbaMobile] = useState('preencher'); // 'preencher' | 'documento'
  const [docAtivo, setDocAtivo] = useState('contrato'); // 'contrato' | 'memorial'
  const primeiraRenderizacao = useRef(true);

  // rascunho automático
  useEffect(() => {
    if (primeiraRenderizacao.current) { primeiraRenderizacao.current = false; return; }
    const t = setTimeout(() => onSalvarRascunho(contrato), 1200);
    return () => clearTimeout(t);
  }, [contrato]);

  function set(campo, valor) {
    setContrato((c) => ({ ...c, [campo]: valor, atualizadoEm: todayISO() }));
  }
  function setCliente(campo, valor) {
    setContrato((c) => ({ ...c, cliente: { ...c.cliente, [campo]: valor }, atualizadoEm: todayISO() }));
  }
  function alterarParcela(id, campo, valor) {
    setContrato((c) => ({
      ...c,
      parcelas: c.parcelas.map((p) => (p.id === id ? { ...p, [campo]: valor } : p)),
      atualizadoEm: todayISO(),
    }));
  }
  function distribuir() {
    setContrato((c) => ({ ...c, parcelas: distribuirValorIgualmente(c.valorTotal, c.parcelas), atualizadoEm: todayISO() }));
  }
  // O contrato nasce com as 7 etapas de sempre, mas obra nenhuma é igual à
  // outra: dá para acrescentar quantas parcelas a negociação pedir. A nova
  // entra no fim, sem valor — o "Dividir igualmente" já reparte o total
  // entre todas de novo, se for o caso.
  function adicionarParcela() {
    setContrato((c) => ({
      ...c,
      parcelas: reordenarParcelas([...c.parcelas, novaParcela(c.parcelas.length + 1)]),
      atualizadoEm: todayISO(),
    }));
  }
  // Tirar a última não faz sentido: todo contrato tem pelo menos uma
  // parcela. As de baixo são renumeradas na hora.
  function tirarParcela(id) {
    setContrato((c) => (c.parcelas.length <= 1 ? c : {
      ...c,
      parcelas: reordenarParcelas(c.parcelas.filter((p) => p.id !== id)),
      atualizadoEm: todayISO(),
    }));
  }
  function usarClienteExistente(clienteId) {
    const cli = clientes.find((c) => c.id === clienteId);
    if (!cli) { set('clienteId', null); return; }
    setContrato((c) => ({
      ...c,
      clienteId: cli.id,
      cliente: { ...c.cliente, nome: cli.nome || '', cpfCnpj: cli.cpfCnpj || '', endereco: cli.endereco || '' },
      atualizadoEm: todayISO(),
    }));
  }
  // salva a edição de um parágrafo feita só neste contrato
  function editarBloco(qualDoc, chave, texto) {
    const campo = qualDoc === 'memorial' ? 'blocosMemorial' : 'blocosContrato';
    setContrato((c) => {
      const atuais = c[campo] || [];
      const existe = atuais.some((b) => b.chave === chave);
      return {
        ...c,
        [campo]: existe ? atuais.map((b) => (b.chave === chave ? { ...b, texto } : b)) : [...atuais, { chave, texto }],
        atualizadoEm: todayISO(),
      };
    });
  }
  function restaurarBloco(qualDoc, chave) {
    const campo = qualDoc === 'memorial' ? 'blocosMemorial' : 'blocosContrato';
    setContrato((c) => ({ ...c, [campo]: (c[campo] || []).filter((b) => b.chave !== chave), atualizadoEm: todayISO() }));
  }

  const validacao = useMemo(() => validarContrato(contrato, config), [contrato, config]);
  const diff = diferencaParcelas(contrato.valorTotal, contrato.parcelas);

  async function gerar(tipo) {
    if (!validacao.podeGerar) { onErro(validacao.bloqueios[0]); return; }
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

  const formulario = (
    <div className="space-y-3">
      <div className="eco-card p-4 space-y-3">
        <p className="text-sm font-semibold text-stone-700">Cliente</p>
        {clientes.length > 0 && (
          <select
            value={contrato.clienteId || ''}
            onChange={(e) => usarClienteExistente(e.target.value)}
            className="eco-input-sm w-full"
          >
            <option value="">— Cliente novo —</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        )}
        <div>
          <label className="eco-label">Nome completo *</label>
          <input value={contrato.cliente.nome} onChange={(e) => setCliente('nome', e.target.value)} className="eco-input" />
        </div>
        <div>
          <label className="eco-label">CPF</label>
          <input value={contrato.cliente.cpfCnpj} onChange={(e) => setCliente('cpfCnpj', e.target.value)} className="eco-input" placeholder="000.000.000-00" />
        </div>
        <div>
          <label className="eco-label">Endereço</label>
          <input value={contrato.cliente.endereco} onChange={(e) => setCliente('endereco', e.target.value)} className="eco-input" placeholder="Rua, nº, bairro - cidade UF" />
        </div>
      </div>

      <div className="eco-card p-4 space-y-3">
        <p className="text-sm font-semibold text-stone-700">A casa (cláusula primeira)</p>
        <div>
          <label className="eco-label">Descrição da casa</label>
          <textarea
            value={contrato.descricaoObra}
            onChange={(e) => set('descricaoObra', e.target.value)}
            rows={4}
            className="eco-input text-xs"
            placeholder="Ex.: uma casa mista madeira alvenaria com 47,73m2 de área útil, 5,62m2 de varanda coberta em madeira com deck no chão e sacada com 3m2 no segundo piso"
          />
          <p className="text-[11px] text-stone-400 mt-1">Entra no meio da frase: "O objeto do presente contrato é <em>…isto…</em> conforme projeto assinado pelas partes."</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="eco-label">Início da obra</label>
            <input value={contrato.inicioObra} onChange={(e) => set('inicioObra', e.target.value)} className="eco-input" placeholder="Ex.: 17/08" />
          </div>
          <div>
            <label className="eco-label">Prazo (dias)</label>
            <input value={contrato.prazoEntrega} onChange={(e) => set('prazoEntrega', e.target.value)} className="eco-input" inputMode="numeric" />
          </div>
        </div>
      </div>

      <div className="eco-card p-4 space-y-3">
        <p className="text-sm font-semibold text-stone-700">Valor e parcelas</p>
        <div>
          <label className="eco-label">Valor total *</label>
          <input
            value={valorTexto}
            onChange={(e) => {
              setValorTexto(e.target.value);
              const v = parsePrecoBR(e.target.value);
              set('valorTotal', isNaN(v) ? 0 : v);
            }}
            inputMode="decimal"
            placeholder="0,00"
            className="eco-input text-base font-semibold"
          />
          {contrato.valorTotal > 0 && (
            <p className="text-xs text-green-800 mt-1">({valorPorExtenso(contrato.valorTotal)})</p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-stone-500">
            {contrato.parcelas.length} {contrato.parcelas.length === 1 ? 'parcela' : 'parcelas'}
          </span>
          {contrato.valorTotal > 0 && (
            <button onClick={distribuir} className="eco-btn-secondary eco-btn-xs">
              <Wand2 size={12} /> Dividir igualmente
            </button>
          )}
        </div>

        <div className="space-y-1.5">
          {contrato.parcelas.map((p) => (
            <div key={p.id} className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-stone-200 text-stone-700 text-[10px] font-semibold flex items-center justify-center flex-shrink-0">
                {p.ordem}
              </span>
              <input
                value={p.etapa}
                onChange={(e) => alterarParcela(p.id, 'etapa', e.target.value)}
                className="eco-input-sm flex-1 min-w-0"
                placeholder="Etapa"
              />
              <input
                value={p.valor ? String(p.valor).replace('.', ',') : ''}
                onChange={(e) => {
                  const v = parsePrecoBR(e.target.value);
                  alterarParcela(p.id, 'valor', isNaN(v) ? 0 : v);
                }}
                inputMode="decimal"
                placeholder="0,00"
                className="eco-input-sm w-24 flex-shrink-0 text-right"
              />
              <button
                type="button"
                onClick={() => tirarParcela(p.id)}
                disabled={contrato.parcelas.length === 1}
                aria-label={`Tirar a parcela ${p.ordem}`}
                className="eco-icon-btn eco-icon-btn-danger w-7 h-7 flex-shrink-0 disabled:opacity-0 disabled:pointer-events-none"
              >
                <X size={13} />
              </button>
            </div>
          ))}
          <button type="button" onClick={adicionarParcela} className="eco-btn-secondary eco-btn-xs">
            <Plus size={12} /> Adicionar parcela
          </button>
        </div>

        <div className={`rounded-lg p-2.5 text-xs ${diff !== 0 ? 'bg-amber-50 border border-amber-200 text-amber-800' : 'bg-green-50 border border-green-200 text-green-800'}`}>
          <div className="flex justify-between">
            <span>Soma das parcelas</span>
            <span className="font-semibold">{formatMoney(totalParcelas(contrato.parcelas))}</span>
          </div>
          {diff !== 0 && (
            <p className="mt-1 flex items-start gap-1">
              <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
              {diff > 0 ? `Faltam ${formatMoney(diff)}.` : `Passou ${formatMoney(Math.abs(diff))} do valor.`}
            </p>
          )}
        </div>
      </div>

      <div className="eco-card p-4 space-y-3">
        <p className="text-sm font-semibold text-stone-700">Assinatura</p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="eco-label">Cidade</label>
            <input value={contrato.cidadeContrato} onChange={(e) => set('cidadeContrato', e.target.value)} className="eco-input" />
          </div>
          <div>
            <label className="eco-label">Data</label>
            <input type="date" value={contrato.dataContrato} onChange={(e) => set('dataContrato', e.target.value)} className="eco-input" />
          </div>
        </div>
        <p className="text-[11px] text-stone-400">Sai como: {contrato.cidadeContrato}, {dataPorExtenso(contrato.dataContrato)}</p>
      </div>

      {(validacao.bloqueios.length > 0 || validacao.problemas.length > 0) && (
        <div className={`eco-card p-3 ${validacao.bloqueios.length ? 'border-red-300 bg-red-50/50' : 'border-amber-300 bg-amber-50/40'}`}>
          <ul className="text-xs space-y-1 list-disc list-inside">
            {validacao.bloqueios.map((b, i) => <li key={`b${i}`} className="text-red-700">{b}</li>)}
            {validacao.problemas.map((p, i) => <li key={`p${i}`} className="text-amber-800">{p}</li>)}
          </ul>
        </div>
      )}

      <div className="eco-card p-4 space-y-2">
        <button onClick={() => gerar('ambos')} disabled={gerando || !validacao.podeGerar} className="eco-btn-primary w-full">
          <FileDown size={16} /> {gerando ? 'Gerando…' : 'Gerar contrato + memorial'}
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => gerar('contrato')} disabled={gerando || !validacao.podeGerar} className="eco-btn-secondary eco-btn-sm">
            <FileDown size={14} /> Só contrato
          </button>
          <button onClick={() => gerar('memorial')} disabled={gerando || !validacao.podeGerar} className="eco-btn-secondary eco-btn-sm">
            <FileDown size={14} /> Só memorial
          </button>
        </div>
      </div>
    </div>
  );

  const documento = (
    <div className="eco-card overflow-hidden">
      <div className="px-3 py-2 border-b border-stone-100 bg-stone-50 flex items-center gap-1.5">
        <button
          onClick={() => setDocAtivo('contrato')}
          className={`text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors ${docAtivo === 'contrato' ? 'bg-green-700 text-white' : 'text-stone-500 hover:bg-stone-100'}`}
        >
          Contrato
        </button>
        <button
          onClick={() => setDocAtivo('memorial')}
          className={`text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors ${docAtivo === 'memorial' ? 'bg-green-700 text-white' : 'text-stone-500 hover:bg-stone-100'}`}
        >
          Memorial
        </button>
        <span className="text-[11px] text-stone-400 ml-auto hidden sm:inline">clique num parágrafo para editar</span>
      </div>
      <div className="max-h-[70vh] overflow-y-auto bg-white p-5 sm:p-8">
        {docAtivo === 'contrato'
          ? <FolhaContrato contrato={contrato} config={config} onEditar={editarBloco} onRestaurar={restaurarBloco} />
          : <FolhaMemorial contrato={contrato} config={config} onEditar={editarBloco} onRestaurar={restaurarBloco} />}
      </div>
    </div>
  );

  return (
    <div className="space-y-4 pb-24 sm:pb-6">
      <button onClick={onCancelar} className="text-sm text-stone-500 hover:text-stone-800 flex items-center gap-1">
        <ArrowLeft size={14} /> Voltar para contratos
      </button>

      {/* celular: alterna entre preencher e ver o documento */}
      <div className="sm:hidden flex bg-stone-100 rounded-lg p-1">
        <button
          onClick={() => setAbaMobile('preencher')}
          className={`flex-1 flex items-center justify-center gap-1.5 text-sm font-medium rounded-md py-2 transition-colors ${abaMobile === 'preencher' ? 'bg-white text-green-800 shadow-sm' : 'text-stone-500'}`}
        >
          <Pencil size={14} /> Preencher
        </button>
        <button
          onClick={() => setAbaMobile('documento')}
          className={`flex-1 flex items-center justify-center gap-1.5 text-sm font-medium rounded-md py-2 transition-colors ${abaMobile === 'documento' ? 'bg-white text-green-800 shadow-sm' : 'text-stone-500'}`}
        >
          <Eye size={14} /> Documento
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] gap-4 items-start">
        <div className={abaMobile === 'preencher' ? '' : 'hidden sm:block'}>{formulario}</div>
        <div className={`${abaMobile === 'documento' ? '' : 'hidden sm:block'} lg:sticky lg:top-20`}>{documento}</div>
      </div>
    </div>
  );
}

// ---- folha do contrato (aparência igual à do PDF) ----
function FolhaContrato({ contrato, config, onEditar, onRestaurar }) {
  const blocos = blocosContratoResolvidos(contrato, config);
  const valores = montarValoresMarcadores(contrato, config);
  const contratada = contrato.contratadaSnapshot || config.contratada || {};
  const editados = new Set((contrato.blocosContrato || []).map((b) => b.chave));

  return (
    <div className="text-[13px] leading-relaxed text-stone-900 font-serif">
      <p className="text-center font-bold text-[15px] mb-6">CONTRATO PARTICULAR DE COMPRA E VENDA</p>
      {blocos.map((b) => {
        if (b.tabelaParcelas) return <TabelaParcelas key={b.chave} parcelas={contrato.parcelas} />;
        return (
          <BlocoEditavel
            key={b.chave}
            bloco={b}
            editado={editados.has(b.chave)}
            onSalvar={(txt) => onEditar('contrato', b.chave, txt)}
            onRestaurar={() => onRestaurar('contrato', b.chave)}
            textoOriginalDoModelo={(contrato.blocosContratoSnapshot || []).find?.((x) => x.chave === b.chave)?.texto}
          />
        );
      })}
      <Assinaturas
        cidadeData={valores['{{CIDADE_DATA}}']}
        esquerda={contratada.representante}
        direita={contrato.cliente.nome}
      />
    </div>
  );
}

function FolhaMemorial({ contrato, config, onEditar, onRestaurar }) {
  const blocos = blocosMemorialResolvidos(contrato, config);
  const valores = montarValoresMarcadores(contrato, config);
  const contratada = contrato.contratadaSnapshot || config.contratada || {};
  const editados = new Set((contrato.blocosMemorial || []).map((b) => b.chave));

  return (
    <div className="text-[13px] leading-relaxed text-stone-900 font-serif">
      <p className="text-center font-bold text-[15px] mb-6">MEMORIAL DESCRITIVO</p>
      {blocos.map((b) => (
        <div key={b.chave}>
          {b.titulo && <p className="font-bold mt-4 mb-1">● {b.titulo}</p>}
          <BlocoEditavel
            bloco={b}
            editado={editados.has(b.chave)}
            onSalvar={(txt) => onEditar('memorial', b.chave, txt)}
            onRestaurar={() => onRestaurar('memorial', b.chave)}
          />
        </div>
      ))}
      <Assinaturas
        cidadeData={valores['{{CIDADE_DATA}}']}
        esquerda={contratada.representante}
        direita={contrato.cliente.nome}
      />
    </div>
  );
}

// Parágrafo que vira campo de texto ao clicar — a edição vale só para
// este contrato, o modelo salvo em Configurações não é alterado.
// Mostra na tela os trechos entre ** ** em negrito, igual sai no PDF.
function TextoComNegrito({ texto }) {
  return (
    <>
      {partesDoParagrafo(texto).map((p, i) => (p.negrito ? <strong key={i}>{p.texto}</strong> : <span key={i}>{p.texto}</span>))}
    </>
  );
}

function BlocoEditavel({ bloco, editado, onSalvar, onRestaurar }) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState('');

  function abrir() {
    setTexto(bloco.texto);
    setEditando(true);
  }
  function confirmar() {
    onSalvar(texto);
    setEditando(false);
  }

  if (editando) {
    return (
      <div className="my-2 border border-green-300 rounded-lg p-2 bg-green-50/40">
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={Math.min(14, Math.max(3, Math.ceil(texto.length / 70)))}
          className="w-full text-xs font-sans border border-stone-200 rounded p-2 outline-none focus:border-green-500"
          autoFocus
        />
        <p className="text-[10px] text-stone-400 mt-1">
          Entre <code className="font-mono">**asteriscos**</code> o texto sai em negrito.
        </p>
        <div className="flex gap-1.5 mt-1.5">
          <button onClick={confirmar} className="eco-btn-primary eco-btn-xs"><Check size={12} /> Aplicar</button>
          <button onClick={() => setEditando(false)} className="eco-btn-secondary eco-btn-xs"><X size={12} /> Cancelar</button>
          {editado && (
            <button onClick={() => { onRestaurar(); setEditando(false); }} className="eco-btn-secondary eco-btn-xs ml-auto">
              Voltar ao padrão
            </button>
          )}
        </div>
      </div>
    );
  }

  if (bloco.lista) {
    return (
      <div onClick={abrir} className="my-2 cursor-text rounded hover:bg-green-50/60 -mx-1 px-1 py-0.5 transition-colors">
        <ul className="list-disc list-inside space-y-1">
          {semMarcacao(bloco.texto).split('\n').filter((l) => l.trim()).map((l, i) => <li key={i}>{l.trim()}</li>)}
        </ul>
      </div>
    );
  }

  return (
    <p
      onClick={abrir}
      className={`my-2 whitespace-pre-wrap cursor-text rounded hover:bg-green-50/60 -mx-1 px-1 py-0.5 transition-colors text-justify ${editado ? 'border-l-2 border-green-400 pl-2' : ''}`}
      title="Clique para editar este parágrafo"
    >
      {bloco.texto ? <TextoComNegrito texto={bloco.texto} /> : <span className="text-stone-300">(vazio — clique para escrever)</span>}
    </p>
  );
}

function TabelaParcelas({ parcelas }) {
  return (
    <table className="w-full my-4 border-collapse text-[12px]">
      <tbody>
        {(parcelas || []).map((p) => (
          <tr key={p.id}>
            <td className="border border-stone-400 px-3 py-2 w-[38%]">Parcela {p.ordem}</td>
            <td className="border border-stone-400 px-3 py-2 w-[28%] font-semibold">
              R${(Number(p.valor) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
            <td className="border border-stone-400 px-3 py-2">{p.etapa}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Assinaturas({ cidadeData, esquerda, direita }) {
  return (
    <div className="mt-10">
      <p className="mb-12">{cidadeData}</p>
      <div className="grid grid-cols-2 gap-6">
        <div>
          <div className="border-t border-stone-800 pt-1.5">{esquerda || ''}</div>
        </div>
        <div>
          <div className="border-t border-stone-800 pt-1.5">{direita || ''}</div>
        </div>
      </div>
    </div>
  );
}
