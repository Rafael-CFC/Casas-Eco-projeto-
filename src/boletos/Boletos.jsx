import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus, Search, Trash2, CheckCircle2, RotateCcw, Ban, Eye, FileDown, Landmark, AlertTriangle,
} from 'lucide-react';
import { formatMoney, formatDateBR, todayISO } from '../domain';
import { CATEGORIAS_BOLETO } from './categoriasBoleto';
import {
  classificarBoleto, encontrarPossivelDuplicata,
} from './boletosStore';
import {
  filtrarBoletos, totalAPagar, totalVenceProximos7Dias, totalVencidos,
  totalPagosNoMes, proximosVencimentos, PERIODOS, getPeriodoRange,
} from './boletosCalc';
import { comprimirImagem, enviarFotoBoleto, visualizarBoletoFoto, removerFotoBoleto } from './boletosFoto';
import { analisarBoletoComIA } from './analisarBoletoComIA';
import { gerarRelatorioBoletos } from './gerarRelatorioBoletos';
import SeletorFotoBoleto from './SeletorFotoBoleto';
import FormBoleto from './FormBoleto';
import ModalPagamento from './ModalPagamento';

const GRUPOS = [
  { key: 'vencido', titulo: '🔴 Vencidos', cor: 'text-red-700' },
  { key: 'venceHoje', titulo: '🟠 Vence hoje', cor: 'text-orange-700' },
  { key: 'venceEm1Dia', titulo: '🟡 Vence amanhã', cor: 'text-amber-700' },
  { key: 'venceEm7Dias', titulo: '🟡 Vence nos próximos 7 dias', cor: 'text-amber-700' },
  { key: 'futuro', titulo: 'Pendentes', cor: 'text-stone-600' },
  { key: 'pago', titulo: '🟢 Pagos', cor: 'text-green-700' },
  { key: 'cancelado', titulo: '⚫ Cancelados', cor: 'text-stone-400' },
];

export default function Boletos({
  boletos, obras, fornecedores,
  onCriarBoleto, onAtualizarBoleto, onMarcarPago, onReabrirBoleto, onCancelarBoleto, onRemoverBoleto,
  onAviso, onErro, onConfirmar,
}) {
  const [modo, setModo] = useState('lista'); // 'lista' | 'form'
  const [boletoEditando, setBoletoEditando] = useState(null);
  const [fotoSelecionadaBlob, setFotoSelecionadaBlob] = useState(null);
  const [fotoSelecionadaNome, setFotoSelecionadaNome] = useState(null);
  const [fotoPreviewUrl, setFotoPreviewUrl] = useState(null);
  const [seletorFotoAberto, setSeletorFotoAberto] = useState(false);
  const [processandoFoto, setProcessandoFoto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [boletoPagando, setBoletoPagando] = useState(null);

  const [busca, setBusca] = useState('');
  const [filtroObra, setFiltroObra] = useState('todas');
  const [filtroFornecedor, setFiltroFornecedor] = useState('todos');
  const [filtroCategoria, setFiltroCategoria] = useState('todas');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroPeriodo, setFiltroPeriodo] = useState('todos');

  const hoje = todayISO();

  const fornecedoresBoleto = useMemo(
    () => [...new Set(boletos.map((b) => b.beneficiario).filter(Boolean))].sort(),
    [boletos]
  );

  const periodoRange = getPeriodoRange(filtroPeriodo, null, null, hoje);
  const boletosFiltrados = useMemo(() => filtrarBoletos(boletos, {
    obraId: filtroObra, fornecedor: filtroFornecedor, categoria: filtroCategoria,
    status: filtroStatus, periodoRange, busca,
  }, hoje), [boletos, filtroObra, filtroFornecedor, filtroCategoria, filtroStatus, periodoRange, busca, hoje]);

  const grupos = useMemo(() => {
    const mapa = {};
    GRUPOS.forEach((g) => { mapa[g.key] = []; });
    boletosFiltrados.forEach((b) => {
      const chave = classificarBoleto(b, hoje);
      (mapa[chave] || mapa.futuro).push(b);
    });
    Object.keys(mapa).forEach((k) => mapa[k].sort((a, b) => a.vencimento.localeCompare(b.vencimento)));
    return mapa;
  }, [boletosFiltrados, hoje]);

  const proximos = useMemo(() => proximosVencimentos(boletos, hoje, 5), [boletos, hoje]);

  function limparEstadoFoto() {
    if (fotoPreviewUrl && fotoPreviewUrl.startsWith('blob:')) URL.revokeObjectURL(fotoPreviewUrl);
    setFotoSelecionadaBlob(null);
    setFotoSelecionadaNome(null);
    setFotoPreviewUrl(null);
  }

  function voltarParaLista() {
    limparEstadoFoto();
    setBoletoEditando(null);
    setModo('lista');
  }

  function abrirNovo() {
    limparEstadoFoto();
    setBoletoEditando(null);
    setModo('form');
  }

  async function abrirEditar(boleto) {
    limparEstadoFoto();
    setBoletoEditando(boleto);
    setModo('form');
    if (boleto.fotoPath) {
      try {
        const url = await visualizarBoletoFoto(boleto.fotoPath);
        setFotoPreviewUrl(url);
      } catch (e) {
        onErro && onErro('Não foi possível carregar a foto deste boleto.');
      }
    }
  }

  async function aoImagemSelecionada(arquivo) {
    setProcessandoFoto(true);
    try {
      const comprimida = await comprimirImagem(arquivo);
      if (fotoPreviewUrl && fotoPreviewUrl.startsWith('blob:')) URL.revokeObjectURL(fotoPreviewUrl);
      setFotoSelecionadaBlob(comprimida);
      setFotoSelecionadaNome(arquivo.name);
      setFotoPreviewUrl(URL.createObjectURL(comprimida));
      await analisarBoletoComIA(comprimida); // Fase 2: hoje sempre "não identificado"
    } catch (e) {
      onErro && onErro('Não foi possível processar essa imagem. Tente outra foto.');
    } finally {
      setProcessandoFoto(false);
    }
  }

  async function finalizarSalvar(campos) {
    setSalvando(true);
    try {
      let fotoPath = boletoEditando?.fotoPath || null;
      let fotoNome = boletoEditando?.fotoNome || null;
      let camposFinais = campos;
      if (fotoSelecionadaBlob) {
        const idParaFoto = boletoEditando?.id || crypto.randomUUID();
        fotoPath = await enviarFotoBoleto(fotoSelecionadaBlob, idParaFoto);
        fotoNome = fotoSelecionadaNome;
        if (!boletoEditando) camposFinais = { ...campos, id: idParaFoto };
      }
      camposFinais = { ...camposFinais, fotoPath, fotoNome };
      const ok = boletoEditando
        ? await onAtualizarBoleto(boletoEditando.id, camposFinais)
        : await onCriarBoleto(camposFinais);
      if (ok) {
        onAviso && onAviso('Boleto salvo com sucesso.');
        voltarParaLista();
      } else {
        onErro && onErro('Não foi possível salvar o boleto.');
      }
    } catch (e) {
      onErro && onErro('Não foi possível salvar o boleto. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  }

  function aoSalvarForm(campos) {
    const duplicata = encontrarPossivelDuplicata(campos, boletos, boletoEditando?.id);
    if (duplicata) {
      const rotulo = duplicata.tipo === 'forte' ? '⚠️ POSSÍVEL BOLETO DUPLICADO' : '⚠️ Boleto parecido já cadastrado';
      const msg = `${rotulo}\n\nJá existe um boleto de "${duplicata.boleto.beneficiario}", vencimento ${formatDateBR(duplicata.boleto.vencimento)}, valor ${formatMoney(duplicata.boleto.valor)}.\n\nContinuar mesmo assim?`;
      onConfirmar(msg, () => finalizarSalvar(campos));
    } else {
      finalizarSalvar(campos);
    }
  }

  function aoExcluir(boleto) {
    onConfirmar(`Excluir o boleto de "${boleto.beneficiario}"? Essa ação não pode ser desfeita.`, async () => {
      if (boleto.fotoPath) {
        try { await removerFotoBoleto(boleto.fotoPath); } catch (e) { /* segue mesmo se falhar */ }
      }
      const ok = await onRemoverBoleto(boleto.id);
      if (ok) onAviso && onAviso('Boleto excluído.');
    });
  }

  function aoCancelar(boleto) {
    onConfirmar(`Cancelar o boleto de "${boleto.beneficiario}"? Ele continua no histórico, marcado como cancelado.`, async () => {
      const ok = await onCancelarBoleto(boleto.id);
      if (ok) onAviso && onAviso('Boleto cancelado.');
    });
  }

  function aoReabrir(boleto) {
    onReabrirBoleto(boleto.id).then((ok) => { if (ok) onAviso && onAviso('Boleto reaberto.'); });
  }

  async function aoConfirmarPagamento(dados) {
    const ok = await onMarcarPago(boletoPagando.id, dados);
    setBoletoPagando(null);
    if (ok) onAviso && onAviso('Pagamento registrado.');
    else onErro && onErro('Não foi possível registrar o pagamento.');
  }

  async function gerarRelatorio() {
    const totais = {
      quantidade: boletosFiltrados.length,
      aPagar: totalAPagar(boletosFiltrados),
      vencidos: totalVencidos(boletosFiltrados, hoje),
      pagosNoMes: totalPagosNoMes(boletosFiltrados, hoje),
    };
    const partesFiltro = [];
    if (filtroObra !== 'todas') partesFiltro.push(filtroObra === 'sem_obra' ? 'Despesa geral' : (obras.find((o) => o.id === filtroObra)?.nome || ''));
    if (filtroCategoria !== 'todas') partesFiltro.push(filtroCategoria);
    if (filtroStatus !== 'todos') partesFiltro.push(filtroStatus);
    if (filtroPeriodo !== 'todos') partesFiltro.push(PERIODOS.find((p) => p.key === filtroPeriodo)?.label || '');
    try {
      await gerarRelatorioBoletos({ boletosFiltrados, resumoFiltros: partesFiltro.filter(Boolean).join(' · ') || null, totais });
      onAviso && onAviso('Relatório gerado.');
    } catch (e) {
      onErro && onErro('Não foi possível gerar o relatório.');
    }
  }

  if (modo === 'form') {
    return (
      <div className="space-y-4 pb-10">
        <FormBoleto
          obras={obras}
          fornecedores={fornecedores}
          boletoInicial={boletoEditando}
          fotoPreviewUrl={fotoPreviewUrl}
          onTrocarFoto={() => setSeletorFotoAberto(true)}
          onSalvar={aoSalvarForm}
          onCancelar={voltarParaLista}
        />

        {boletoEditando && boletoEditando.status !== 'cancelado' && (
          <div className="eco-card p-4 flex flex-wrap gap-2">
            {boletoEditando.status === 'pendente' && (
              <button onClick={() => setBoletoPagando(boletoEditando)} className="eco-btn-primary eco-btn-sm">
                <CheckCircle2 size={14} /> Marcar como pago
              </button>
            )}
            {boletoEditando.status === 'pago' && (
              <button onClick={() => aoReabrir(boletoEditando)} className="eco-btn-secondary eco-btn-sm">
                <RotateCcw size={14} /> Reabrir (desfazer pagamento)
              </button>
            )}
            <button onClick={() => aoCancelar(boletoEditando)} className="eco-btn-secondary eco-btn-sm">
              <Ban size={14} /> Cancelar boleto
            </button>
            <button onClick={() => aoExcluir(boletoEditando)} className="eco-btn-danger eco-btn-sm">
              <Trash2 size={14} /> Excluir
            </button>
          </div>
        )}

        {processandoFoto && createPortal((
          <div className="fixed inset-0 bg-black/30 z-[55] flex items-center justify-center">
            <div className="bg-white rounded-xl px-5 py-4 shadow-popover text-sm text-stone-600">Comprimindo imagem…</div>
          </div>
        ), document.body)}

        <SeletorFotoBoleto aberto={seletorFotoAberto} onFechar={() => setSeletorFotoAberto(false)} onImagemSelecionada={aoImagemSelecionada} />

        {boletoPagando && (
          <ModalPagamento boleto={boletoPagando} onCancelar={() => setBoletoPagando(null)} onConfirmar={aoConfirmarPagamento} />
        )}
        {salvando && createPortal((
          <div className="fixed inset-0 bg-black/30 z-[55] flex items-center justify-center">
            <div className="bg-white rounded-xl px-5 py-4 shadow-popover text-sm text-stone-600">Salvando boleto…</div>
          </div>
        ), document.body)}
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-10">
      {/* ---- dashboard ---- */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="eco-card p-3">
          <p className="text-xs text-stone-400">Total a pagar</p>
          <p className="text-lg font-bold text-stone-800">{formatMoney(totalAPagar(boletos))}</p>
        </div>
        <div className="eco-card p-3">
          <p className="text-xs text-stone-400">Vence em 7 dias</p>
          <p className="text-lg font-bold text-amber-600">{formatMoney(totalVenceProximos7Dias(boletos, hoje))}</p>
        </div>
        <div className="eco-card p-3">
          <p className="text-xs text-stone-400">Vencidos</p>
          <p className="text-lg font-bold text-red-600">{formatMoney(totalVencidos(boletos, hoje))}</p>
        </div>
        <div className="eco-card p-3">
          <p className="text-xs text-stone-400">Pagos no mês</p>
          <p className="text-lg font-bold text-green-700">{formatMoney(totalPagosNoMes(boletos, hoje))}</p>
        </div>
        <div className="eco-card p-3">
          <p className="text-xs text-stone-400">Total de boletos</p>
          <p className="text-lg font-bold text-stone-800">{boletos.length}</p>
        </div>
      </div>

      {proximos.length > 0 && (
        <div className="eco-card p-4">
          <p className="text-sm font-semibold text-stone-700 mb-2 flex items-center gap-1.5"><AlertTriangle size={14} className="text-amber-500" /> Próximos vencimentos</p>
          <div className="space-y-1.5">
            {proximos.map(({ boleto, classe }) => (
              <button key={boleto.id} onClick={() => abrirEditar(boleto)} className="w-full flex items-center justify-between text-sm hover:bg-stone-50 rounded-lg px-2 py-1.5 -mx-2 transition-colors text-left">
                <span className="text-stone-700 truncate">{boleto.beneficiario}</span>
                <span className={`flex-shrink-0 ${classe === 'vencido' ? 'text-red-600' : classe === 'venceHoje' ? 'text-orange-600' : 'text-amber-600'}`}>
                  {formatDateBR(boleto.vencimento)} · {formatMoney(boleto.valor)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ---- ações + filtros ---- */}
      <div className="eco-card p-4 space-y-3">
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <button onClick={abrirNovo} className="eco-btn-primary">
            <Plus size={16} /> Adicionar Boleto
          </button>
          <button onClick={gerarRelatorio} className="eco-btn-secondary eco-btn-sm">
            <FileDown size={14} /> Relatório de boletos
          </button>
        </div>

        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-300" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Pesquisar por beneficiário, CNPJ, documento…" className="eco-input pl-8" />
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { key: 'todos', label: 'Todos' },
            { key: 'pendente', label: 'Pendentes' },
            { key: 'vencido', label: 'Vencidos' },
            { key: 'pago', label: 'Pagos' },
            { key: 'cancelado', label: 'Cancelados' },
          ].map((op) => (
            <button
              key={op.key}
              onClick={() => setFiltroStatus(op.key)}
              className={`eco-badge border transition-colors ${filtroStatus === op.key ? 'bg-green-700 text-white border-green-700' : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'}`}
            >
              {op.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <select value={filtroObra} onChange={(e) => setFiltroObra(e.target.value)} className="eco-input-sm">
            <option value="todas">Todas as obras</option>
            <option value="sem_obra">Despesa geral (sem obra)</option>
            {obras.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
          </select>
          <select value={filtroFornecedor} onChange={(e) => setFiltroFornecedor(e.target.value)} className="eco-input-sm">
            <option value="todos">Todos os fornecedores</option>
            {fornecedoresBoleto.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)} className="eco-input-sm">
            <option value="todas">Todas as categorias</option>
            {CATEGORIAS_BOLETO.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filtroPeriodo} onChange={(e) => setFiltroPeriodo(e.target.value)} className="eco-input-sm">
            {PERIODOS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
        </div>
      </div>

      {/* ---- listagem agrupada ---- */}
      {boletosFiltrados.length === 0 ? (
        <div className="eco-card p-8 text-center">
          <Landmark size={28} className="mx-auto text-stone-300 mb-2" />
          <p className="text-sm text-stone-500">Nenhum boleto encontrado.</p>
        </div>
      ) : (
        GRUPOS.map((g) => {
          const itens = grupos[g.key];
          if (!itens || itens.length === 0) return null;
          const total = itens.reduce((a, b) => a + (Number(b.valor) || 0), 0);
          return (
            <div key={g.key} className="eco-card p-4">
              <div className="flex items-center justify-between mb-2">
                <p className={`text-sm font-semibold ${g.cor}`}>{g.titulo} ({itens.length})</p>
                <p className="text-sm font-medium text-stone-500">{formatMoney(total)}</p>
              </div>
              <div className="space-y-1.5">
                {itens.map((b) => (
                  <div key={b.id} className="eco-table-row flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-2 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-stone-800 truncate">{b.beneficiario}</p>
                      <p className="text-xs text-stone-400">
                        vence {formatDateBR(b.vencimento)}
                        {b.obraId && ` · ${obras.find((o) => o.id === b.obraId)?.nome || 'obra removida'}`}
                        {!b.obraId && ' · despesa geral'}
                        {b.categoria && ` · ${b.categoria}`}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-stone-800 flex-shrink-0">{formatMoney(b.valor)}</p>
                    <button onClick={() => abrirEditar(b)} className="eco-icon-btn flex-shrink-0" title="Ver detalhes">
                      <Eye size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
