import React, { useMemo, useState } from 'react';
import {
  Plus, Search, FileText, FileDown, Copy, Pencil, Trash2, Ban, CheckCircle2,
  ArrowLeft, AlertTriangle, Wallet,
} from 'lucide-react';
import { formatMoney, formatDateBR, todayISO } from '../domain';
import {
  STATUS_CONTRATO, novoContratoRascunho, duplicarContrato, congelarContrato,
  resumoParcelas, totalParcelas, valorPagoParcela, saldoParcela, statusParcela, parcelaVencida,
  registrarPagamento, removerPagamento, quitarParcela,
} from './contratosStore';
import { gerarPdfContrato, gerarPdfMemorial, gerarPdfContratoEMemorial } from './gerarPdfContrato';
import NovoContrato from './NovoContrato';
import ModalPagamentoParcela from './ModalPagamentoParcela';

export default function Contratos({
  contratos, config, obras, clientes,
  onSalvarContrato, onRemoverContrato, onAtualizarParcela,
  onAviso, onErro, onConfirmar,
}) {
  const [modo, setModo] = useState('lista'); // 'lista' | 'editor' | 'detalhe'
  const [contratoAtivo, setContratoAtivo] = useState(null);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  // parcela aberta no modal de recebimento: { contratoId, parcelaId }
  const [parcelaEmPagamento, setParcelaEmPagamento] = useState(null);

  const rascunhos = useMemo(() => contratos.filter((c) => c.status === 'rascunho'), [contratos]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return contratos
      .filter((c) => filtroStatus === 'todos' || c.status === filtroStatus)
      .filter((c) => {
        if (!termo) return true;
        return [c.numero, c.cliente?.nome, c.cliente?.cpfCnpj, String(c.valorTotal)]
          .filter(Boolean).join(' ').toLowerCase().includes(termo);
      })
      .sort((a, b) => (b.atualizadoEm || '').localeCompare(a.atualizadoEm || ''));
  }, [contratos, busca, filtroStatus]);

  function abrirNovo() {
    setContratoAtivo(novoContratoRascunho(config));
    setModo('editor');
  }

  function continuarRascunho(c) {
    setContratoAtivo(c);
    setModo('editor');
  }

  function abrirDetalhe(c) {
    setContratoAtivo(c);
    setModo('detalhe');
  }

  async function salvarRascunho(contrato) {
    await onSalvarContrato(contrato);
  }

  async function finalizarContrato(contrato) {
    const ok = await onSalvarContrato(contrato);
    if (ok) {
      setContratoAtivo(contrato);
      setModo('detalhe');
    }
    return ok;
  }

  async function duplicar(c) {
    const copia = duplicarContrato(c);
    // salva a cópia na hora: assim ela já aparece como rascunho na lista
    // mesmo se a pessoa sair da tela antes de digitar qualquer coisa.
    await onSalvarContrato(copia);
    setContratoAtivo(copia);
    setModo('editor');
    onAviso('Contrato duplicado. Ajuste os dados do novo cliente e gere.');
  }

  function excluir(c) {
    onConfirmar(
      `Excluir o contrato ${c.numero ? `nº ${c.numero}` : '(rascunho)'} de "${c.cliente?.nome || 'sem cliente'}"? Essa ação não pode ser desfeita.`,
      async () => {
        const ok = await onRemoverContrato(c.id);
        if (ok) { onAviso('Contrato excluído.'); setModo('lista'); }
      }
    );
  }

  async function mudarStatus(c, status) {
    const ok = await onSalvarContrato({ ...c, status, atualizadoEm: todayISO() });
    if (ok) {
      setContratoAtivo((a) => (a && a.id === c.id ? { ...a, status } : a));
      onAviso(`Contrato marcado como ${STATUS_CONTRATO[status].label.toLowerCase()}.`);
    }
  }

  async function baixar(c, tipo) {
    try {
      const doc = c.contratadaSnapshot ? c : congelarContrato(c, config, contratos);
      if (tipo === 'contrato') await gerarPdfContrato(doc, config);
      else if (tipo === 'memorial') await gerarPdfMemorial(doc, config);
      else await gerarPdfContratoEMemorial(doc, config);
      onAviso('PDF gerado.');
    } catch (e) {
      onErro('Não foi possível gerar o PDF.');
    }
  }

  // ---- recebimentos das parcelas ----
  // O modal guarda só os ids: assim ele sempre lê a parcela recém-salva da
  // lista de contratos, e não uma cópia velha presa no estado.
  const alvoPagamento = (() => {
    if (!parcelaEmPagamento) return null;
    const contrato = contratos.find((x) => x.id === parcelaEmPagamento.contratoId);
    const parcela = (contrato?.parcelas || []).find((p) => p.id === parcelaEmPagamento.parcelaId);
    return parcela ? { contrato, parcela } : null;
  })();

  async function lancarPagamento({ valor, data, observacao }) {
    if (!alvoPagamento) return;
    const { contrato, parcela } = alvoPagamento;
    const ok = await onAtualizarParcela(contrato.id, parcela.id, registrarPagamento(parcela, { valor, data, observacao }));
    if (ok) onAviso(`Recebimento de ${formatMoney(valor)} lançado na parcela ${parcela.ordem}.`);
  }

  function apagarPagamento(pagamentoId) {
    if (!alvoPagamento) return;
    const { contrato, parcela } = alvoPagamento;
    onConfirmar('Apagar este recebimento? O valor volta a contar como a receber.', async () => {
      const ok = await onAtualizarParcela(contrato.id, parcela.id, removerPagamento(parcela, pagamentoId));
      if (ok) onAviso('Recebimento apagado.');
    });
  }

  async function quitarDeUmaVez(contrato, parcela) {
    const falta = saldoParcela(parcela);
    const ok = await onAtualizarParcela(contrato.id, parcela.id, quitarParcela(parcela));
    if (ok) onAviso(`Parcela ${parcela.ordem} recebida (${formatMoney(falta)}).`);
  }

  // ---- EDITOR (assistente) ----
  if (modo === 'editor' && contratoAtivo) {
    return (
      <NovoContrato
        contratoInicial={contratoAtivo}
        config={config}
        obras={obras}
        clientes={clientes}
        contratos={contratos}
        onSalvarRascunho={salvarRascunho}
        onFinalizar={finalizarContrato}
        onCancelar={() => { setModo('lista'); setContratoAtivo(null); }}
        onAviso={onAviso}
        onErro={onErro}
        onConfirmar={onConfirmar}
      />
    );
  }

  // ---- DETALHE ----
  if (modo === 'detalhe' && contratoAtivo) {
    const c = contratos.find((x) => x.id === contratoAtivo.id) || contratoAtivo;
    const resumo = resumoParcelas(c.parcelas);
    const st = STATUS_CONTRATO[c.status] || STATUS_CONTRATO.rascunho;
    return (
      <div className="space-y-4 pb-10">
        <button onClick={() => { setModo('lista'); setContratoAtivo(null); }} className="text-sm text-stone-500 hover:text-stone-800 flex items-center gap-1">
          <ArrowLeft size={14} /> Todos os contratos
        </button>

        <div className="eco-card p-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-semibold text-stone-900">{c.cliente?.nome || 'Sem cliente'}</h2>
                <span className={`eco-badge border ${st.cls}`}>{st.label}</span>
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                {c.numero ? `Contrato nº ${c.numero} · ` : ''}
                {(obras.find((o) => o.id === c.obraId) || {}).nome || 'sem obra vinculada'}
                {c.geradoEm ? ` · gerado em ${formatDateBR(c.geradoEm)}` : ''}
                {c.versaoModelo ? ` · modelo v${c.versaoModelo}` : ''}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs text-stone-500">Valor do contrato</p>
              <p className="text-xl font-semibold text-green-800">{formatMoney(c.valorTotal)}</p>
            </div>
          </div>
        </div>

        <div className="eco-card p-4 space-y-2">
          <p className="text-sm font-semibold text-stone-700 mb-1">Documentos</p>
          <button onClick={() => baixar(c, 'ambos')} className="eco-btn-primary w-full">
            <FileDown size={16} /> Contrato + memorial (PDF)
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => baixar(c, 'contrato')} className="eco-btn-secondary eco-btn-sm">
              <FileDown size={14} /> Contrato
            </button>
            <button onClick={() => baixar(c, 'memorial')} className="eco-btn-secondary eco-btn-sm">
              <FileDown size={14} /> Memorial
            </button>
          </div>
        </div>

        {/* parcelas = cronograma financeiro do contrato */}
        {(c.parcelas || []).length > 0 && (
          <div className="eco-card p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-stone-700 flex items-center gap-1.5">
                <Wallet size={15} /> Parcelas a receber
              </p>
              <p className="text-xs text-stone-400">{resumo.quantidade} parcelas</p>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="bg-stone-50 rounded-lg p-2">
                <p className="text-[11px] text-stone-400">Total</p>
                <p className="text-sm font-semibold text-stone-800">{formatMoney(resumo.total)}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-2">
                <p className="text-[11px] text-green-700/70">Recebido</p>
                <p className="text-sm font-semibold text-green-800">{formatMoney(resumo.recebido)}</p>
              </div>
              <div className={`rounded-lg p-2 ${resumo.vencidas > 0 ? 'bg-red-50' : 'bg-amber-50'}`}>
                <p className={`text-[11px] ${resumo.vencidas > 0 ? 'text-red-700/70' : 'text-amber-700/70'}`}>
                  Falta receber{resumo.vencidas > 0 ? ` (${resumo.vencidas} atrasada${resumo.vencidas > 1 ? 's' : ''})` : ''}
                </p>
                <p className={`text-sm font-semibold ${resumo.vencidas > 0 ? 'text-red-700' : 'text-amber-700'}`}>
                  {formatMoney(resumo.aReceber)}
                </p>
              </div>
            </div>
            <div className="mb-3">
              <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                <div className="h-full bg-green-500" style={{ width: `${resumo.pctRecebido}%` }}></div>
              </div>
              <p className="text-xs text-stone-400 mt-1">
                {resumo.pctRecebido.toFixed(0)}% recebido · {resumo.quitadas} de {resumo.quantidade} parcelas quitadas
                {resumo.parciais > 0 ? ` · ${resumo.parciais} parcial${resumo.parciais > 1 ? 'is' : ''}` : ''}
              </p>
            </div>
            <div className="space-y-1.5">
              {c.parcelas.map((p) => {
                const situacao = statusParcela(p);
                const pago = valorPagoParcela(p);
                const falta = saldoParcela(p);
                const vencida = parcelaVencida(p, todayISO());
                return (
                  <div key={p.id} className="bg-stone-50 rounded-lg p-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-full text-xs font-semibold flex items-center justify-center flex-shrink-0 ${
                        situacao === 'pago' ? 'bg-green-600 text-white'
                          : vencida ? 'bg-red-500 text-white'
                            : situacao === 'parcial' ? 'bg-amber-500 text-white' : 'bg-stone-300 text-stone-700'
                      }`}>{p.ordem}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-stone-800 truncate">{p.etapa || 'Parcela'}</p>
                        <p className="text-xs text-stone-400">
                          {p.vencimento ? `vence ${formatDateBR(p.vencimento)}` : 'sem vencimento'}
                          {situacao === 'pago' && p.dataPagamento ? ` · recebida em ${formatDateBR(p.dataPagamento)}` : ''}
                          {situacao === 'parcial' ? ` · pago ${formatMoney(pago)}, falta ${formatMoney(falta)}` : ''}
                          {vencida ? ' · atrasada' : ''}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-stone-800 flex-shrink-0">{formatMoney(p.valor)}</p>
                      {falta > 0 && (
                        <button
                          onClick={() => quitarDeUmaVez(c, p)}
                          aria-label={`Marcar a parcela ${p.ordem} como recebida por inteiro`}
                          title="Recebida por inteiro"
                          className="eco-icon-btn w-7 h-7 flex-shrink-0 text-green-700"
                        >
                          <CheckCircle2 size={15} />
                        </button>
                      )}
                      <button
                        onClick={() => setParcelaEmPagamento({ contratoId: c.id, parcelaId: p.id })}
                        className={`text-xs px-2 py-1 rounded-lg border transition-colors flex-shrink-0 ${
                          falta > 0 ? 'border-green-300 text-green-700 hover:bg-green-50' : 'border-stone-300 text-stone-500'
                        }`}
                      >
                        {falta > 0 ? 'Receber' : 'Recebimentos'}
                      </button>
                    </div>
                    {situacao === 'parcial' && (
                      <div className="w-full h-1 bg-stone-200 rounded-full overflow-hidden mt-1.5">
                        <div className="h-full bg-amber-500" style={{ width: `${Math.min(100, (pago / (Number(p.valor) || 1)) * 100)}%` }}></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="eco-card p-4 flex flex-wrap gap-2">
          <button onClick={() => continuarRascunho(c)} className="eco-btn-secondary eco-btn-sm">
            <Pencil size={14} /> Editar
          </button>
          <button onClick={() => duplicar(c)} className="eco-btn-secondary eco-btn-sm">
            <Copy size={14} /> Duplicar
          </button>
          {c.status !== 'assinado' && (
            <button onClick={() => mudarStatus(c, 'assinado')} className="eco-btn-secondary eco-btn-sm">
              <CheckCircle2 size={14} /> Marcar assinado
            </button>
          )}
          {c.status !== 'cancelado' && (
            <button onClick={() => mudarStatus(c, 'cancelado')} className="eco-btn-secondary eco-btn-sm">
              <Ban size={14} /> Cancelar
            </button>
          )}
          <button onClick={() => excluir(c)} className="eco-btn-danger eco-btn-sm">
            <Trash2 size={14} /> Excluir
          </button>
        </div>

        {alvoPagamento && (
          <ModalPagamentoParcela
            // remonta a cada lançamento: o campo de valor volta a vir
            // preenchido com o que ainda falta, em vez de repetir o último
            // valor digitado.
            key={`${alvoPagamento.parcela.id}-${valorPagoParcela(alvoPagamento.parcela)}`}
            parcela={alvoPagamento.parcela}
            onCancelar={() => setParcelaEmPagamento(null)}
            onRegistrar={lancarPagamento}
            onRemover={apagarPagamento}
          />
        )}
      </div>
    );
  }

  // ---- LISTA ----
  const totalContratado = contratos.filter((c) => c.status === 'gerado' || c.status === 'assinado')
    .reduce((a, c) => a + (Number(c.valorTotal) || 0), 0);
  const resumoGeral = resumoParcelas(
    contratos.filter((c) => c.status !== 'cancelado' && c.status !== 'rascunho').flatMap((c) => c.parcelas || [])
  );

  return (
    <div className="space-y-4 pb-10">
      {rascunhos.length > 0 && (
        <div className="eco-card p-4 border-amber-300 bg-amber-50/40">
          <p className="text-sm font-semibold text-amber-900 flex items-center gap-1.5">
            <AlertTriangle size={15} /> Você tem {rascunhos.length === 1 ? 'um contrato' : `${rascunhos.length} contratos`} em andamento
          </p>
          <div className="mt-2 space-y-1.5">
            {rascunhos.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-2">
                <span className="text-xs text-amber-800 truncate">
                  {r.cliente?.nome || 'Sem cliente'} · atualizado {formatDateBR(r.atualizadoEm)}
                </span>
                <button onClick={() => continuarRascunho(r)} className="eco-btn-primary eco-btn-xs flex-shrink-0">
                  Continuar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="eco-card p-3">
          <p className="text-xs text-stone-400">Contratos</p>
          <p className="text-lg font-bold text-stone-800">{contratos.length}</p>
        </div>
        <div className="eco-card p-3">
          <p className="text-xs text-stone-400">Valor contratado</p>
          <p className="text-lg font-bold text-stone-800">{formatMoney(totalContratado)}</p>
        </div>
        <div className="eco-card p-3">
          <p className="text-xs text-stone-400">Já recebido</p>
          <p className="text-lg font-bold text-green-700">{formatMoney(resumoGeral.recebido)}</p>
        </div>
        <div className="eco-card p-3">
          <p className="text-xs text-stone-400">A receber</p>
          <p className="text-lg font-bold text-amber-600">{formatMoney(resumoGeral.aReceber)}</p>
        </div>
      </div>

      <div className="eco-card p-4 space-y-3">
        <button onClick={abrirNovo} className="eco-btn-primary">
          <Plus size={16} /> Novo contrato
        </button>
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-300" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Pesquisar por cliente, obra, número…" className="eco-input pl-8" />
        </div>
        <div className="flex flex-wrap gap-2">
          {[['todos', 'Todos'], ['rascunho', 'Rascunhos'], ['gerado', 'Gerados'], ['assinado', 'Assinados'], ['cancelado', 'Cancelados']].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFiltroStatus(key)}
              className={`eco-badge border transition-colors ${filtroStatus === key ? 'bg-green-700 text-white border-green-700' : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {filtrados.length === 0 ? (
        <div className="eco-card p-8 text-center">
          <FileText size={28} className="mx-auto text-stone-300 mb-2" />
          <p className="text-sm text-stone-500">Nenhum contrato ainda.</p>
          <p className="text-xs text-stone-400 mt-1">Clique em "Novo contrato" para gerar o primeiro.</p>
        </div>
      ) : (
        <div className="eco-card divide-y divide-stone-100">
          {filtrados.map((c) => {
            const st = STATUS_CONTRATO[c.status] || STATUS_CONTRATO.rascunho;
            const soma = totalParcelas(c.parcelas);
            const divergente = c.valorTotal > 0 && Math.abs(soma - c.valorTotal) > 0.005 && (c.parcelas || []).length > 0;
            const rec = resumoParcelas(c.parcelas);
            return (
              <button key={c.id} onClick={() => abrirDetalhe(c)} className="w-full text-left p-3.5 hover:bg-stone-50 transition-colors flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-stone-800 truncate">{c.cliente?.nome || 'Sem cliente'}</p>
                    <span className={`eco-badge border text-[10px] ${st.cls}`}>{st.label}</span>
                    {divergente && <span className="eco-badge border text-[10px] bg-amber-50 text-amber-700 border-amber-200">PARCELAS ≠ VALOR</span>}
                  </div>
                  <p className="text-xs text-stone-400 mt-0.5 truncate">
                    {c.numero ? `nº ${c.numero} · ` : ''}
                    {(obras.find((o) => o.id === c.obraId) || {}).nome || 'sem obra vinculada'}
                    {rec.recebido > 0 && ` · recebido ${formatMoney(rec.recebido)} de ${formatMoney(rec.total)}`}
                    {rec.vencidas > 0 && ` · ${rec.vencidas} atrasada${rec.vencidas > 1 ? 's' : ''}`}
                  </p>
                </div>
                <p className="text-sm font-semibold text-stone-800 flex-shrink-0">{formatMoney(c.valorTotal)}</p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
