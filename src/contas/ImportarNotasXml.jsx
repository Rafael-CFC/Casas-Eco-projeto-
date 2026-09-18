import React, { useRef, useState } from 'react';
import { AlertTriangle, Check, FileUp, Info, Trash2, X } from 'lucide-react';
import { formatMoney, formatDateBR } from '../domain';
import { chaveFornecedor } from '../textUtils';
import SeletorComBusca from '../ui/SeletorComBusca';
import {
  contaJaLancada, contaPareceRepetida, distribuidoraDoEmitente,
  formatarCNPJ, lerNotasDoXml, soDigitos,
} from './nfeXml';

// Importar os boletos pelo XML da nota fiscal.
//
// O XML da NF-e já traz, dentro dele, a lista de boletos daquela nota
// (bloco <cobr>): número, vencimento e valor de cada um. Em vez de digitar
// os três boletos de cada nota, o dono escolhe os arquivos e confere o que
// o sistema leu.
//
// Duas decisões que valem explicar:
//
//   1. NADA é lançado sozinho. A tela mostra o que achou, já marcado, mas
//      quem clica em "Lançar" é o dono — é o mesmo conferir de sempre, só
//      que sem digitar. Boleto que ele não vai pagar (nota devolvida,
//      cobrança que já foi acertada no pix) é só desmarcar.
//   2. O arquivo vem de fora. O sistema não tem como baixar o XML da
//      Receita: o download exige o certificado digital da empresa, e
//      certificado dentro de um site é certificado na mão de quem abrir o
//      site. O XML chega por e-mail da distribuidora, pelo portal dela ou
//      pelo WhatsApp, e é esse arquivo que entra aqui.

const MAX_ARQUIVOS = 60;

function chaveDaEntrada(nota) {
  return nota.chave || `${nota.arquivo}#${nota.numero}#${nota.serie}`;
}

// Tudo que a tela precisa saber sobre um boleto agora — calculado na hora,
// em cima das contas que já existem. Fica fora do state de propósito:
// depois de lançar, a lista de contas muda e esses avisos têm que mudar
// junto, sem depender de ninguém lembrar de atualizar.
function situacaoDoBoleto(entrada, boleto, contas) {
  const jaLancado = contaJaLancada(contas, entrada.nota, boleto);
  return {
    jaLancado,
    pareceRepetido: !jaLancado && contaPareceRepetida(contas, entrada.distribuidora, boleto, chaveFornecedor),
    podeLancar: !jaLancado && !!boleto.vencimento && boleto.valor > 0,
  };
}

function Aviso({ tom = 'amber', children }) {
  const cls = tom === 'red'
    ? 'bg-red-50 border-red-200 text-red-700'
    : tom === 'blue'
      ? 'bg-blue-50 border-blue-200 text-blue-700'
      : 'bg-amber-50 border-amber-200 text-amber-700';
  const Icon = tom === 'blue' ? Info : AlertTriangle;
  return (
    <div className={`flex items-start gap-2 text-xs border rounded-lg px-2.5 py-2 ${cls}`}>
      <Icon size={14} className="flex-shrink-0 mt-0.5" />
      <span className="leading-snug">{children}</span>
    </div>
  );
}

export default function ImportarNotasXml({
  contas, nomesDistribuidoras, cnpjEmpresa, onImportar,
}) {
  const [entradas, setEntradas] = useState([]);
  const [problemas, setProblemas] = useState([]); // arquivos que não deram para ler
  const [lendo, setLendo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const inputRef = useRef(null);

  // Nota emitida com o CNPJ da própria empresa é VENDA, não compra: os
  // boletos dela são dinheiro a RECEBER. Lançar isso nas contas a pagar
  // inventaria uma dívida que não existe.
  function ehNotaDaPropriaEmpresa(nota) {
    const meu = soDigitos(cnpjEmpresa);
    return meu.length === 14 && soDigitos(nota.emitente.cnpj) === meu;
  }

  function prepararEntrada(nota) {
    const distribuidora = distribuidoraDoEmitente(nota, nomesDistribuidoras, chaveFornecedor);
    const suspeita = nota.situacao === 'cancelada'
      || nota.situacao === 'nao_autorizada'
      || ehNotaDaPropriaEmpresa(nota);
    return {
      id: chaveDaEntrada(nota),
      nota,
      distribuidora,
      // Já marcado: o caso comum é lançar todos. Nota com problema entra
      // desmarcada — se for para lançar assim mesmo, é um clique
      // consciente, não o padrão.
      boletos: nota.boletos.map((b) => ({
        ...b,
        selecionado: !suspeita && !!b.vencimento && b.valor > 0
          && !contaJaLancada(contas, nota, b),
      })),
    };
  }

  async function lerArquivos(lista) {
    const arquivos = Array.from(lista || []).slice(0, MAX_ARQUIVOS);
    if (arquivos.length === 0) return;
    setLendo(true);
    const novasEntradas = [];
    const novosProblemas = [];

    for (const arquivo of arquivos) {
      let conteudo = '';
      try {
        conteudo = await arquivo.text();
      } catch {
        novosProblemas.push({ arquivo: arquivo.name, erro: 'Não deu para abrir o arquivo.' });
        continue;
      }
      if (/\.zip$/i.test(arquivo.name)) {
        novosProblemas.push({ arquivo: arquivo.name, erro: 'É um ZIP. Descompacte e escolha os .xml de dentro dele.' });
        continue;
      }
      const lido = lerNotasDoXml(conteudo, { nomeArquivo: arquivo.name });
      if (lido.erro) {
        novosProblemas.push({ arquivo: arquivo.name, erro: lido.erro });
        continue;
      }
      lido.notas.forEach((nota) => novasEntradas.push(prepararEntrada(nota)));
    }

    setEntradas((atuais) => {
      // Mesmo XML escolhido duas vezes (veio por e-mail e por WhatsApp) não
      // vira duas notas na tela — a chave da nota é única.
      const vistas = new Set(atuais.map((e) => e.id));
      const repetidas = [];
      const somar = [];
      novasEntradas.forEach((e) => {
        if (vistas.has(e.id)) { repetidas.push(e); return; }
        vistas.add(e.id);
        somar.push(e);
      });
      if (repetidas.length > 0) {
        novosProblemas.push({
          arquivo: `${repetidas.length} ${repetidas.length === 1 ? 'nota repetida' : 'notas repetidas'}`,
          erro: 'Já estavam na lista — o mesmo XML foi escolhido mais de uma vez.',
        });
      }
      return [...atuais, ...somar];
    });
    setProblemas(novosProblemas);
    setLendo(false);
    if (inputRef.current) inputRef.current.value = '';
  }

  function alterarBoleto(entradaId, boletoId, campos) {
    setEntradas((lista) => lista.map((e) => (e.id !== entradaId ? e : {
      ...e,
      boletos: e.boletos.map((b) => (b.id === boletoId ? { ...b, ...campos } : b)),
    })));
  }

  function alterarDistribuidora(entradaId, nome) {
    setEntradas((lista) => lista.map((e) => (e.id === entradaId ? { ...e, distribuidora: nome } : e)));
  }

  function marcarTodosDaNota(entradaId, marcar) {
    setEntradas((lista) => lista.map((e) => (e.id !== entradaId ? e : {
      ...e,
      boletos: e.boletos.map((b) => {
        const s = situacaoDoBoleto(e, b, contas);
        return { ...b, selecionado: marcar && s.podeLancar };
      }),
    })));
  }

  function tirarNota(entradaId) {
    setEntradas((lista) => lista.filter((e) => e.id !== entradaId));
  }

  function limparTudo() {
    setEntradas([]);
    setProblemas([]);
  }

  // O que está de fato marcado E ainda pode ser lançado. É daqui que saem
  // o total do rodapé e o que vai para o banco — os dois do mesmo lugar,
  // para o número conferido ser o número gravado.
  const selecionados = [];
  entradas.forEach((e) => {
    e.boletos.forEach((b) => {
      const s = situacaoDoBoleto(e, b, contas);
      if (b.selecionado && s.podeLancar && e.distribuidora.trim()) selecionados.push({ entrada: e, boleto: b });
    });
  });
  const totalSelecionado = selecionados.reduce((a, s) => a + s.boleto.valor, 0);

  const faltaDistribuidora = entradas.some((e) => !e.distribuidora.trim()
    && e.boletos.some((b) => b.selecionado));

  async function lancar() {
    if (selecionados.length === 0) return;
    setSalvando(true);
    const itens = selecionados.map(({ entrada, boleto }) => ({
      fornecedorNome: entrada.distribuidora.trim(),
      valor: boleto.valor,
      vencimento: boleto.vencimento,
      chaveNfe: entrada.nota.chave,
      numeroNota: entrada.nota.numero,
      numeroDuplicata: boleto.numero,
    }));
    const ok = await onImportar(itens);
    setSalvando(false);
    if (!ok) return;

    // A nota que foi lançada inteira sai da tela — não sobra nada para
    // fazer com ela. A que ficou com algum boleto desmarcado continua ali,
    // para lançar o resto depois sem escolher o arquivo de novo. A nota sem
    // boleto nenhum também fica: o aviso dela é a informação.
    const lancados = new Set(selecionados.map(({ boleto }) => boleto.id));
    const aindaFalta = (e, b) => !lancados.has(b.id) && !contaJaLancada(contas, e.nota, b);
    setEntradas((lista) => lista
      .map((e) => ({ ...e, boletos: e.boletos.map((b) => (lancados.has(b.id) ? { ...b, selecionado: false } : b)) }))
      .filter((e) => e.boletos.length === 0 || e.boletos.some((b) => aindaFalta(e, b))));
    setProblemas([]);
  }

  return (
    <div className="space-y-4">
      {/* ---- escolher os arquivos ---- */}
      <div
        onDragOver={(ev) => { ev.preventDefault(); setArrastando(true); }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(ev) => {
          ev.preventDefault();
          setArrastando(false);
          lerArquivos(ev.dataTransfer && ev.dataTransfer.files);
        }}
        className={`eco-card p-5 text-center border-dashed transition-colors ${
          arrastando ? 'border-green-500 bg-green-50' : ''
        }`}
      >
        <FileUp size={28} className="mx-auto text-stone-400 mb-2" />
        <p className="text-sm text-stone-600 font-medium">Escolha os XML das notas</p>
        <p className="text-xs text-stone-400 mt-1 max-w-md mx-auto leading-snug">
          É o arquivo .xml que a distribuidora manda junto com a nota (por e-mail, pelo
          portal dela ou pelo WhatsApp). Pode escolher vários de uma vez. O sistema lê
          os boletos que vieram dentro da nota — você só confere e lança.
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".xml,text/xml,application/xml"
          onChange={(ev) => lerArquivos(ev.target.files)}
          className="hidden"
          id="entrada-xml-notas"
        />
        <button
          type="button"
          onClick={() => inputRef.current && inputRef.current.click()}
          disabled={lendo}
          className="eco-btn-primary eco-btn-sm mt-3"
        >
          <FileUp size={15} /> {lendo ? 'Lendo…' : 'Escolher arquivos'}
        </button>
        {entradas.length > 0 && (
          <button type="button" onClick={limparTudo} className="eco-btn-ghost eco-btn-sm mt-3 ml-2">
            <Trash2 size={14} /> Limpar a lista
          </button>
        )}
      </div>

      {/* ---- arquivos que não deram para ler ---- */}
      {problemas.length > 0 && (
        <div className="space-y-1.5">
          {problemas.map((p, i) => (
            <Aviso key={`${p.arquivo}-${i}`}>
              <span className="font-medium">{p.arquivo}</span> — {p.erro}
            </Aviso>
          ))}
        </div>
      )}

      {/* ---- uma nota por card ---- */}
      {entradas.map((e) => {
        const { nota } = e;
        const daEmpresa = ehNotaDaPropriaEmpresa(nota);
        const marcadosNaNota = e.boletos.filter((b) => b.selecionado).length;
        const jaCadastrada = (nomesDistribuidoras || []).some(
          (n) => chaveFornecedor(n) === chaveFornecedor(e.distribuidora)
        );
        return (
          <div key={e.id} className="eco-card p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-stone-800 truncate">{nota.emitente.nome || 'Sem emitente no XML'}</p>
                <p className="text-xs text-stone-400 mt-0.5">
                  Nota {nota.numero || '—'}
                  {nota.serie ? `/${nota.serie}` : ''}
                  {nota.emissao ? ` · emitida em ${formatDateBR(nota.emissao)}` : ''}
                  {nota.emitente.cnpj ? ` · ${formatarCNPJ(nota.emitente.cnpj)}` : ''}
                  {nota.valorNota > 0 ? ` · nota de ${formatMoney(nota.valorNota)}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => tirarNota(e.id)}
                aria-label={`Tirar a nota ${nota.numero} da lista`}
                className="eco-icon-btn eco-icon-btn-danger flex-shrink-0"
              >
                <X size={14} />
              </button>
            </div>

            {daEmpresa && (
              <Aviso tom="red">
                Essa nota foi <strong>emitida pela própria empresa</strong> — é uma venda sua,
                dinheiro a receber. Lançar aqui criaria uma dívida que não existe.
              </Aviso>
            )}
            {nota.situacao === 'cancelada' && (
              <Aviso tom="red">Nota <strong>cancelada</strong>. {nota.motivoSituacao}</Aviso>
            )}
            {nota.situacao === 'nao_autorizada' && (
              <Aviso tom="red">Nota <strong>não autorizada</strong> pela SEFAZ. {nota.motivoSituacao}</Aviso>
            )}
            {nota.situacao === 'sem_protocolo' && (
              <Aviso>
                O arquivo não traz o protocolo de autorização — pode ser um XML de rascunho.
                Confira com o papel da nota antes de lançar.
              </Aviso>
            )}
            {nota.somaDivergente && (
              <Aviso>
                Os boletos somam {formatMoney(nota.somaBoletos)}, e a nota é de{' '}
                {formatMoney(nota.valorNota)}. Costuma ser entrada paga na hora, desconto ou
                frete cobrado à parte — confira antes de lançar.
              </Aviso>
            )}

            <div>
              <label className="eco-label">Distribuidora</label>
              <SeletorComBusca
                value={e.distribuidora}
                onChange={(nome) => alterarDistribuidora(e.id, nome)}
                nomes={nomesDistribuidoras}
                titulo="Distribuidora"
                placeholder="Digite ou escolha a distribuidora"
                buscaPlaceholder="Procurar distribuidora…"
                textoNovo="Cadastrar nova"
                textoListaVazia="Nenhuma distribuidora cadastrada ainda — digite o nome."
                contagem={{ singular: 'distribuidora cadastrada', plural: 'distribuidoras cadastradas' }}
              />
              <p className="text-xs text-stone-400 mt-1">
                Veio do emitente da nota.{' '}
                {jaCadastrada
                  ? 'Já é uma distribuidora do sistema — os boletos entram no nome dela.'
                  : 'Ainda não existe com esse nome no sistema — vai ser cadastrada ao lançar.'}
              </p>
            </div>

            {nota.boletos.length === 0 ? (
              <Aviso tom="blue">
                Essa nota não tem boleto nenhum no XML — foi paga à vista (dinheiro, pix ou
                cartão) ou a distribuidora não pôs a cobrança no arquivo. Se tiver boleto no
                papel, lance pela aba <strong>Registrar</strong>.
              </Aviso>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-stone-500">
                    {nota.boletos.length} {nota.boletos.length === 1 ? 'boleto na nota' : 'boletos na nota'}
                  </span>
                  <button
                    type="button"
                    onClick={() => marcarTodosDaNota(e.id, marcadosNaNota === 0)}
                    className="eco-btn-ghost eco-btn-xs"
                  >
                    {marcadosNaNota === 0 ? 'Marcar todos' : 'Desmarcar todos'}
                  </button>
                </div>

                {e.boletos.map((b) => {
                  const s = situacaoDoBoleto(e, b, contas);
                  const marcado = b.selecionado && s.podeLancar;
                  return (
                    // No celular a data desce para uma linha só dela
                    // (`basis-full`): valor, aviso e data lado a lado não
                    // cabem em 390px, e o que sobrava cortado era
                    // justamente o valor.
                    <div
                      key={b.id}
                      className={`flex flex-wrap items-center gap-x-2 gap-y-2 rounded-lg border px-2.5 py-2 transition-colors ${
                        s.jaLancado
                          ? 'border-stone-200 bg-stone-50 opacity-60'
                          : marcado ? 'border-green-200 bg-green-50' : 'border-stone-200'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={marcado}
                        disabled={s.jaLancado}
                        onChange={(ev) => alterarBoleto(e.id, b.id, { selecionado: ev.target.checked })}
                        aria-label={`Lançar o boleto ${b.numero} da nota ${nota.numero}`}
                        className="w-4 h-4 flex-shrink-0 accent-green-600 disabled:opacity-40"
                      />
                      <span className="text-xs text-stone-400 w-7 flex-shrink-0 tabular-nums">{b.numero}</span>
                      <span className="text-sm font-medium text-stone-800 tabular-nums">
                        {formatMoney(b.valor)}
                      </span>
                      <span className="ml-auto text-right">
                        {s.jaLancado ? (
                          <span className="eco-badge bg-stone-100 text-stone-500">
                            <Check size={11} /> já lançado
                          </span>
                        ) : !b.vencimento ? (
                          <span className="eco-badge bg-amber-50 text-amber-700">sem data</span>
                        ) : s.pareceRepetido ? (
                          <span className="eco-badge bg-amber-50 text-amber-700">
                            <AlertTriangle size={11} /> já existe igual
                          </span>
                        ) : null}
                      </span>
                      <input
                        type="date"
                        value={b.vencimento}
                        disabled={s.jaLancado}
                        onChange={(ev) => alterarBoleto(e.id, b.id, { vencimento: ev.target.value })}
                        aria-label={`Vencimento do boleto ${b.numero}`}
                        className="eco-input-sm order-last basis-full sm:basis-auto sm:w-44 sm:flex-shrink-0"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* ---- conferência e lançamento ---- */}
      {entradas.length > 0 && (
        <div className="eco-card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-sm text-stone-500">
            {selecionados.length === 0 ? (
              faltaDistribuidora
                ? 'Escolha a distribuidora das notas marcadas.'
                : 'Nenhum boleto marcado.'
            ) : (
              <>
                {selecionados.length} {selecionados.length === 1 ? 'boleto marcado' : 'boletos marcados'} ·{' '}
                <span className="font-medium text-stone-800">{formatMoney(totalSelecionado)}</span>
              </>
            )}
          </p>
          <button
            type="button"
            onClick={lancar}
            disabled={selecionados.length === 0 || salvando}
            className="eco-btn-primary w-full sm:w-auto"
          >
            <Check size={15} />
            {salvando
              ? 'Lançando…'
              : selecionados.length > 1
                ? `Lançar ${selecionados.length} boletos`
                : 'Lançar nas contas'}
          </button>
        </div>
      )}
    </div>
  );
}
