import React, { useMemo, useState } from 'react';
import {
  Plus, Search, Trash2, Pencil, ArrowLeft, FileDown, Copy, HandCoins,
  ShoppingBag, Info, X, UserPlus, Phone,
} from 'lucide-react';
import { formatMoney, formatDateBR, todayISO } from '../domain';
import { upperInput } from '../textUtils';
import {
  novoMontador, atualizarMontador, novaRetirada, novoAcerto, atualizarMovimento,
  nomeExibicao, encontrarMontadorPorNome, descreverMovimento, rotuloFormaAcerto,
} from './crediarioStore';
import {
  montadoresComSaldo, extratoDoMontador, resumoDeMovimentos, totaisCrediario,
  movimentosDoMontador, filtrarMovimentos,
} from './crediarioCalc';
import { gerarPdfExtratoCrediario } from './gerarPdfExtratoCrediario';
import FormRetirada from './FormRetirada';
import ModalAcerto from './ModalAcerto';

const CADASTRO_VAZIO = { nome: '', apelido: '', telefone: '', documento: '', observacao: '' };

// Tela do crediário dos montadores.
//
// A ideia do módulo inteiro: os montadores levam produto da loja e o
// valor é abatido depois, quando o pai paga a mão de obra deles. Não é
// venda — não gera nota, imposto, receita nem custo de obra. Por isso
// esses dados ficam numa lista separada (`crediario`) e não encostam em
// `lancamentos`.
export default function Crediario({
  montadores, movimentos, obras, catalogoProdutos,
  onSalvarMontadores, onSalvarMovimentos,
  onAviso, onErro, onConfirmar,
}) {
  const [modo, setModo] = useState('lista'); // 'lista' | 'detalhe' | 'retirada'
  const [montadorAbertoId, setMontadorAbertoId] = useState(null);
  const [movimentoEditando, setMovimentoEditando] = useState(null);
  const [acertoAberto, setAcertoAberto] = useState(null); // { montador, acertoEditando }

  const [busca, setBusca] = useState('');
  const [apenasComSaldo, setApenasComSaldo] = useState(false);

  const [cadastroAberto, setCadastroAberto] = useState(false);
  const [cadastro, setCadastro] = useState(CADASTRO_VAZIO);
  const [cadastroEditandoId, setCadastroEditandoId] = useState(null);

  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [buscaExtrato, setBuscaExtrato] = useState('');

  const hoje = todayISO();
  const montadorAberto = montadores.find((m) => m.id === montadorAbertoId) || null;

  const totais = useMemo(() => totaisCrediario(montadores, movimentos, hoje), [montadores, movimentos, hoje]);
  const linhas = useMemo(
    () => montadoresComSaldo(montadores, movimentos, { busca, apenasComSaldo }),
    [montadores, movimentos, busca, apenasComSaldo]
  );

  const extrato = useMemo(
    () => (montadorAberto ? extratoDoMontador(movimentos, montadorAberto.id) : []),
    [movimentos, montadorAberto]
  );
  const extratoFiltrado = useMemo(
    () => filtrarMovimentos(extrato, { tipo: filtroTipo, busca: buscaExtrato }),
    [extrato, filtroTipo, buscaExtrato]
  );
  const resumoAberto = useMemo(
    () => (montadorAberto ? resumoDeMovimentos(movimentosDoMontador(movimentos, montadorAberto.id)) : null),
    [movimentos, montadorAberto]
  );

  // ---------------- cadastro de montador ----------------

  function abrirCadastroNovo() {
    setCadastro(CADASTRO_VAZIO);
    setCadastroEditandoId(null);
    setCadastroAberto(true);
  }

  function abrirCadastroEdicao(montador) {
    setCadastro({
      nome: montador.nome,
      apelido: montador.apelido || '',
      telefone: montador.telefone || '',
      documento: montador.documento || '',
      observacao: montador.observacao || '',
    });
    setCadastroEditandoId(montador.id);
    setCadastroAberto(true);
  }

  function fecharCadastro() {
    setCadastro(CADASTRO_VAZIO);
    setCadastroEditandoId(null);
    setCadastroAberto(false);
  }

  async function salvarCadastro() {
    const nome = cadastro.nome.trim();
    if (!nome) {
      onErro && onErro('Digite o nome do montador.');
      return;
    }
    const jaExiste = encontrarMontadorPorNome(montadores, nome);
    if (jaExiste && jaExiste.id !== cadastroEditandoId) {
      onErro && onErro(`Já existe um montador chamado "${nome}".`);
      return;
    }

    if (cadastroEditandoId) {
      const lista = montadores.map((m) => (m.id === cadastroEditandoId ? atualizarMontador(m, cadastro) : m));
      const ok = await onSalvarMontadores(lista);
      if (ok) {
        onAviso && onAviso(`Cadastro de "${nome}" atualizado.`);
        fecharCadastro();
      }
      return;
    }

    const criado = novoMontador(cadastro);
    const ok = await onSalvarMontadores([...montadores, criado]);
    if (ok) {
      onAviso && onAviso(`"${nome}" cadastrado no crediário.`);
      fecharCadastro();
    }
  }

  function removerMontador(montador) {
    const quantos = movimentosDoMontador(movimentos, montador.id).length;
    const aviso = quantos > 0
      ? `Remover "${nomeExibicao(montador)}" apaga também as ${quantos} anotação(ões) do crediário dele. Isso não pode ser desfeito. Tem certeza?`
      : `Remover "${nomeExibicao(montador)}" do crediário?`;
    onConfirmar(aviso, async () => {
      const ok = await onSalvarMontadores(montadores.filter((m) => m.id !== montador.id));
      if (ok && quantos > 0) await onSalvarMovimentos(movimentos.filter((m) => m.montadorId !== montador.id));
      if (ok) {
        onAviso && onAviso(`"${nomeExibicao(montador)}" removido.`);
        if (montadorAbertoId === montador.id) { setMontadorAbertoId(null); setModo('lista'); }
      }
    });
  }

  // ---------------- movimentos ----------------

  function abrirRetirada(montador, movimento) {
    setMontadorAbertoId(montador.id);
    setMovimentoEditando(movimento || null);
    setModo('retirada');
  }

  async function salvarRetirada(campos) {
    const registro = movimentoEditando
      ? atualizarMovimento(movimentoEditando, campos)
      : novaRetirada(campos);
    const lista = movimentoEditando
      ? movimentos.map((m) => (m.id === registro.id ? registro : m))
      : [...movimentos, registro];
    const ok = await onSalvarMovimentos(lista);
    if (ok) {
      onAviso && onAviso(movimentoEditando ? 'Retirada atualizada.' : `Retirada de ${formatMoney(registro.valor)} anotada.`);
      setMovimentoEditando(null);
      setModo('detalhe');
    }
  }

  async function confirmarAcerto(campos) {
    const alvo = acertoAberto.montador;
    const existente = acertoAberto.acertoEditando;
    const registro = existente
      ? atualizarMovimento(existente, campos)
      : novoAcerto({ ...campos, montadorId: alvo.id });
    const lista = existente
      ? movimentos.map((m) => (m.id === registro.id ? registro : m))
      : [...movimentos, registro];
    const ok = await onSalvarMovimentos(lista);
    if (ok) {
      onAviso && onAviso(existente ? 'Acerto atualizado.' : `Acerto de ${formatMoney(registro.valor)} registrado.`);
      setAcertoAberto(null);
    }
  }

  function removerMovimento(movimento) {
    const texto = movimento.tipo === 'acerto'
      ? `Apagar o acerto de ${formatMoney(movimento.valor)} de ${formatDateBR(movimento.data)}?`
      : `Apagar a retirada de ${formatMoney(movimento.valor)} de ${formatDateBR(movimento.data)}?`;
    onConfirmar(texto, async () => {
      const ok = await onSalvarMovimentos(movimentos.filter((m) => m.id !== movimento.id));
      if (ok) onAviso && onAviso('Anotação apagada.');
    });
  }

  // ---------------- exportações ----------------

  async function baixarExtratoPdf() {
    try {
      await gerarPdfExtratoCrediario({
        montador: montadorAberto,
        extrato,
        resumo: resumoAberto,
        obras,
      });
      onAviso && onAviso('Extrato em PDF baixado.');
    } catch (e) {
      onErro && onErro('Não foi possível gerar o PDF do extrato.');
    }
  }

  async function copiarExtrato() {
    const linhasTexto = extrato.slice().reverse().map((m) => {
      const sinal = m.tipo === 'acerto' ? '-' : '+';
      const titulo = m.tipo === 'acerto' ? `ACERTO (${rotuloFormaAcerto(m.forma)})` : descreverMovimento(m);
      return `${formatDateBR(m.data)}  ${sinal}${formatMoney(m.valor)}  ${titulo}`;
    });
    const texto = [
      `CREDIÁRIO — ${nomeExibicao(montadorAberto)}`,
      'Anotação interna da Casas Eco (não é venda, não tem valor fiscal).',
      '',
      ...linhasTexto,
      '',
      `Total retirado: ${formatMoney(resumoAberto.retirado)}`,
      `Já descontado: ${formatMoney(resumoAberto.acertado)}`,
      `Saldo a descontar: ${formatMoney(resumoAberto.saldo)}`,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(texto);
      onAviso && onAviso('Extrato copiado — é só colar no WhatsApp.');
    } catch (e) {
      onErro && onErro('Não foi possível copiar automaticamente neste navegador.');
    }
  }

  // ---------------- pedaços de tela ----------------

  const AvisoNaoEVenda = (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2.5">
      <Info size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
      <p className="text-xs text-amber-800 leading-relaxed">
        <strong>Isto aqui não é venda.</strong> O crediário é só a anotação do que cada montador
        levou da loja, para descontar depois no pagamento da mão de obra dele. Nada aqui vira nota
        fiscal, imposto, faturamento nem custo de obra — não aparece no Financeiro e não entra em
        nenhum relatório de venda.
      </p>
    </div>
  );

  function CardMontador({ linha }) {
    const { montador, saldo, retirado, acertado, ultimoMovimento } = linha;
    return (
      <div className="eco-card eco-card-hover p-4">
        <button
          onClick={() => { setMontadorAbertoId(montador.id); setFiltroTipo('todos'); setBuscaExtrato(''); setModo('detalhe'); }}
          className="w-full text-left"
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="min-w-0">
              <p className="font-semibold text-stone-900 truncate">{nomeExibicao(montador)}</p>
              {montador.telefone && (
                <p className="text-xs text-stone-400 flex items-center gap-1 mt-0.5">
                  <Phone size={11} /> {montador.telefone}
                </p>
              )}
            </div>
            <span className={`eco-badge flex-shrink-0 border ${
              saldo >= 0.01
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-green-50 text-green-700 border-green-200'
            }`}>
              {saldo >= 0.01 ? 'EM ABERTO' : 'EM DIA'}
            </span>
          </div>

          <p className={`text-2xl font-semibold mb-1 ${saldo >= 0.01 ? 'text-amber-700' : 'text-green-700'}`}>
            {formatMoney(saldo)}
          </p>
          <p className="text-xs text-stone-400 mb-3">
            {formatMoney(retirado)} retirado · {formatMoney(acertado)} já descontado
            {ultimoMovimento && ` · último em ${formatDateBR(ultimoMovimento)}`}
          </p>
        </button>

        <div className="flex flex-wrap gap-2 pt-2 border-t border-stone-100">
          <button onClick={() => abrirRetirada(montador)} className="eco-btn-primary eco-btn-xs">
            <ShoppingBag size={13} /> Retirada
          </button>
          <button onClick={() => setAcertoAberto({ montador, acertoEditando: null })} className="eco-btn-secondary eco-btn-xs">
            <HandCoins size={13} /> Acerto
          </button>
          <button onClick={() => abrirCadastroEdicao(montador)} className="eco-btn-ghost eco-btn-xs">
            <Pencil size={13} /> Editar
          </button>
          <button onClick={() => removerMontador(montador)} className="eco-btn-ghost eco-btn-xs text-stone-400 hover:text-red-600">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    );
  }

  function LinhaMovimento({ movimento }) {
    const acerto = movimento.tipo === 'acerto';
    const obra = movimento.obraId ? obras.find((o) => o.id === movimento.obraId) : null;
    return (
      <div className="border-t border-stone-100 px-3 py-3 first:border-t-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-stone-800">
              {acerto ? rotuloFormaAcerto(movimento.forma) : descreverMovimento(movimento)}
            </p>
            <p className="text-xs text-stone-400">
              {formatDateBR(movimento.data)}
              {obra && ` · ${obra.nome}`}
              {` · saldo depois: ${formatMoney(movimento.saldoApos)}`}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className={`font-semibold ${acerto ? 'text-green-700' : 'text-stone-900'}`}>
              {acerto ? '- ' : '+ '}{formatMoney(movimento.valor)}
            </p>
            <div className="flex gap-1 justify-end mt-1">
              <button
                onClick={() => (acerto
                  ? setAcertoAberto({ montador: montadorAberto, acertoEditando: movimento })
                  : abrirRetirada(montadorAberto, movimento))}
                className="eco-icon-btn"
                title="Editar anotação"
              >
                <Pencil size={14} />
              </button>
              <button onClick={() => removerMovimento(movimento)} className="eco-icon-btn-danger" title="Apagar anotação">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>

        {!acerto && movimento.itens?.length > 0 && (
          <ul className="mt-2 space-y-0.5">
            {movimento.itens.map((it) => (
              <li key={it.id} className="text-xs text-stone-500 flex justify-between gap-3">
                <span className="truncate">{it.quantidade} {it.unidade} × {formatMoney(it.precoUnitario)} — {it.nome}</span>
                <span className="flex-shrink-0">{formatMoney(it.total)}</span>
              </li>
            ))}
          </ul>
        )}

        {movimento.observacao && !acerto && (
          <p className="text-xs text-stone-400 italic mt-1">{movimento.observacao}</p>
        )}
        {movimento.observacao && acerto && (
          <p className="text-xs text-stone-400 italic mt-1">{movimento.observacao}</p>
        )}
      </div>
    );
  }

  const formularioCadastro = cadastroAberto && (
    <div className="eco-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-stone-800">
          {cadastroEditandoId ? 'Editar montador' : 'Novo montador'}
        </p>
        <button onClick={fecharCadastro} className="eco-icon-btn"><X size={16} /></button>
      </div>
      <div className="flex flex-col sm:flex-row flex-wrap gap-3">
        <div className="w-full sm:flex-1 min-w-0">
          <label className="text-xs text-stone-500 block mb-1">Nome</label>
          <input
            value={cadastro.nome}
            onChange={(e) => setCadastro((c) => ({ ...c, nome: upperInput(e.target.value) }))}
            placeholder="Ex: MESSIAS"
            className="eco-input"
          />
        </div>
        <div className="w-full sm:w-40">
          <label className="text-xs text-stone-500 block mb-1">Apelido (opcional)</label>
          <input
            value={cadastro.apelido}
            onChange={(e) => setCadastro((c) => ({ ...c, apelido: upperInput(e.target.value) }))}
            className="eco-input"
          />
        </div>
        <div className="w-full sm:w-40">
          <label className="text-xs text-stone-500 block mb-1">Telefone</label>
          <input
            value={cadastro.telefone}
            onChange={(e) => setCadastro((c) => ({ ...c, telefone: e.target.value }))}
            placeholder="(00) 00000-0000"
            className="eco-input"
          />
        </div>
        <div className="w-full sm:w-44">
          <label className="text-xs text-stone-500 block mb-1">CPF (opcional)</label>
          <input
            value={cadastro.documento}
            onChange={(e) => setCadastro((c) => ({ ...c, documento: e.target.value }))}
            className="eco-input"
          />
        </div>
      </div>
      <div>
        <label className="text-xs text-stone-500 block mb-1">Observação (opcional)</label>
        <input
          value={cadastro.observacao}
          onChange={(e) => setCadastro((c) => ({ ...c, observacao: e.target.value }))}
          placeholder="Ex: montador de telhado, trabalha com o Berlanda"
          className="eco-input"
        />
      </div>
      <div className="flex gap-2">
        <button onClick={salvarCadastro} className="eco-btn-primary eco-btn-sm">
          <Plus size={14} /> {cadastroEditandoId ? 'Salvar cadastro' : 'Cadastrar montador'}
        </button>
        <button onClick={fecharCadastro} className="eco-btn-secondary eco-btn-sm">Cancelar</button>
      </div>
    </div>
  );

  // ---------------- telas ----------------

  if (modo === 'retirada' && montadorAberto) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => { setMovimentoEditando(null); setModo('detalhe'); }}
          className="text-sm text-stone-500 hover:text-stone-800 flex items-center gap-1 transition-colors"
        >
          <ArrowLeft size={14} /> Voltar para o extrato
        </button>
        {AvisoNaoEVenda}
        <FormRetirada
          montador={montadorAberto}
          obras={obras}
          catalogoProdutos={catalogoProdutos}
          movimentoEditando={movimentoEditando}
          onSalvar={salvarRetirada}
          onCancelar={() => { setMovimentoEditando(null); setModo('detalhe'); }}
          onErro={onErro}
        />
      </div>
    );
  }

  if (modo === 'detalhe' && montadorAberto) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setModo('lista')}
          className="text-sm text-stone-500 hover:text-stone-800 flex items-center gap-1 transition-colors"
        >
          <ArrowLeft size={14} /> Voltar para os montadores
        </button>

        {AvisoNaoEVenda}

        <div className="eco-card p-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-lg font-semibold text-stone-900">{nomeExibicao(montadorAberto)}</p>
              <p className="text-xs text-stone-400">
                {[montadorAberto.telefone, montadorAberto.documento].filter(Boolean).join(' · ') || 'sem telefone cadastrado'}
              </p>
              {montadorAberto.observacao && (
                <p className="text-xs text-stone-500 italic mt-1">{montadorAberto.observacao}</p>
              )}
            </div>
            <div className="sm:text-right">
              <p className="text-xs text-stone-400">Saldo a descontar</p>
              <p className={`text-3xl font-semibold ${resumoAberto.saldo >= 0.01 ? 'text-amber-700' : 'text-green-700'}`}>
                {formatMoney(resumoAberto.saldo)}
              </p>
              <p className="text-xs text-stone-400">
                {formatMoney(resumoAberto.retirado)} retirado · {formatMoney(resumoAberto.acertado)} descontado
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-stone-100">
            <button onClick={() => abrirRetirada(montadorAberto)} className="eco-btn-primary eco-btn-sm">
              <ShoppingBag size={14} /> Nova retirada
            </button>
            <button
              onClick={() => setAcertoAberto({ montador: montadorAberto, acertoEditando: null })}
              className="eco-btn-secondary eco-btn-sm"
            >
              <HandCoins size={14} /> Registrar acerto
            </button>
            <button onClick={baixarExtratoPdf} className="eco-btn-secondary eco-btn-sm">
              <FileDown size={14} /> Extrato em PDF
            </button>
            <button onClick={copiarExtrato} className="eco-btn-secondary eco-btn-sm">
              <Copy size={14} /> Copiar para WhatsApp
            </button>
            <button onClick={() => abrirCadastroEdicao(montadorAberto)} className="eco-btn-ghost eco-btn-sm">
              <Pencil size={14} /> Editar cadastro
            </button>
          </div>
        </div>

        {formularioCadastro}

        <div className="eco-card p-3 flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="relative flex-1 min-w-0">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-300" />
            <input
              value={buscaExtrato}
              onChange={(e) => setBuscaExtrato(e.target.value)}
              placeholder="Procurar produto ou observação no extrato…"
              className="eco-input pl-9"
            />
          </div>
          <div className="flex bg-stone-100 rounded-lg p-1">
            {[
              { key: 'todos', label: 'Tudo' },
              { key: 'retirada', label: 'Retiradas' },
              { key: 'acerto', label: 'Acertos' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFiltroTipo(key)}
                className={`text-xs px-3 py-1.5 rounded transition-colors duration-150 ${
                  filtroTipo === key ? 'bg-white text-green-700 shadow-sm font-medium' : 'text-stone-500'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="eco-card overflow-hidden">
          {extratoFiltrado.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-stone-400">
              {extrato.length === 0
                ? 'Nada anotado ainda. Use "Nova retirada" quando ele levar produto.'
                : 'Nenhuma anotação com esse filtro.'}
            </p>
          ) : (
            extratoFiltrado.map((m) => <LinhaMovimento key={m.id} movimento={m} />)
          )}
        </div>

        {acertoAberto && (
          <ModalAcerto
            montador={acertoAberto.montador}
            saldo={acertoAberto.acertoEditando ? resumoAberto.saldo + acertoAberto.acertoEditando.valor : resumoAberto.saldo}
            acertoEditando={acertoAberto.acertoEditando}
            onConfirmar={confirmarAcerto}
            onFechar={() => setAcertoAberto(null)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {AvisoNaoEVenda}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="eco-card p-4">
          <p className="text-xs text-stone-400 mb-1">Total em aberto</p>
          <p className="text-2xl font-semibold text-amber-700">{formatMoney(totais.emAberto)}</p>
          <p className="text-xs text-stone-400 mt-1">{totais.montadoresEmAberto} montador(es)</p>
        </div>
        <div className="eco-card p-4">
          <p className="text-xs text-stone-400 mb-1">Retirado no mês</p>
          <p className="text-2xl font-semibold text-stone-800">{formatMoney(totais.retiradoNoMes)}</p>
        </div>
        <div className="eco-card p-4">
          <p className="text-xs text-stone-400 mb-1">Descontado no mês</p>
          <p className="text-2xl font-semibold text-green-700">{formatMoney(totais.acertadoNoMes)}</p>
        </div>
        <div className="eco-card p-4">
          <p className="text-xs text-stone-400 mb-1">Montadores cadastrados</p>
          <p className="text-2xl font-semibold text-stone-800">{montadores.length}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1 min-w-0">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-300" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Procurar montador…"
            className="eco-input pl-9"
          />
        </div>
        <label className="flex items-center gap-2 text-xs text-stone-500 whitespace-nowrap">
          <input
            type="checkbox"
            checked={apenasComSaldo}
            onChange={(e) => setApenasComSaldo(e.target.checked)}
            className="rounded border-stone-300"
          />
          Só quem tem saldo
        </label>
        <button onClick={abrirCadastroNovo} className="eco-btn-primary sm:w-auto">
          <UserPlus size={15} /> Novo montador
        </button>
      </div>

      {formularioCadastro}

      {montadores.length === 0 ? (
        <div className="eco-card p-8 text-center">
          <p className="text-stone-500 mb-1">Nenhum montador cadastrado ainda.</p>
          <p className="text-xs text-stone-400">
            Cadastre o Messias, o Berlanda e os outros para começar a anotar o que cada um pega.
          </p>
        </div>
      ) : linhas.length === 0 ? (
        <p className="text-center text-stone-400 py-10">Nenhum montador encontrado com esse filtro.</p>
      ) : (
        <div className="eco-stagger grid grid-cols-1 sm:grid-cols-2 gap-4">
          {linhas.map((linha) => <CardMontador key={linha.montador.id} linha={linha} />)}
        </div>
      )}

      {acertoAberto && (
        <ModalAcerto
          montador={acertoAberto.montador}
          saldo={linhas.find((l) => l.montador.id === acertoAberto.montador.id)?.saldo || 0}
          acertoEditando={acertoAberto.acertoEditando}
          onConfirmar={confirmarAcerto}
          onFechar={() => setAcertoAberto(null)}
        />
      )}
    </div>
  );
}
