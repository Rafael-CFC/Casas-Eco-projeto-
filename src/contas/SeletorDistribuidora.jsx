import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, Plus, X, Check } from 'lucide-react';
import { upperInput, combinaBusca, chaveFornecedor } from '../textUtils';
import usarLayoutMobile from '../ui/usarLayoutMobile';

// Escolha da distribuidora na hora de registrar o boleto.
//
// Antes isso era um <select> comum, com as distribuidoras na ordem em que
// foram cadastradas. Com o cadastro grande, achar uma pelo nome virava
// rolar a lista inteira no escuro — quem procurava "DOUTORA" no meio de
// dezenas simplesmente não achava e concluía que ela não estava lá.
//
// Aqui é um campo de digitar com busca: escreve um pedaço do nome e a
// lista filtra. Nada é escondido — a lista chega inteira em `nomes` e o
// rodapé diz quantas distribuidoras existem, para ninguém ficar na dúvida
// se o sistema cortou alguma. Digitar um nome que não existe continua
// valendo: ele é cadastrado sozinho quando o boleto é gravado.
//
// O painel vai para um portal em document.body pelo mesmo motivo do
// ProdutoSeletor: um ancestral com `transform` (as animações de entrada do
// app) viraria o "containing block" de um filho position:fixed e
// desalinharia o dropdown.

export default function SeletorDistribuidora({ value, onChange, nomes, id }) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState('');
  const [indiceAtivo, setIndiceAtivo] = useState(-1);
  const [ancora, setAncora] = useState(null);
  const containerRef = useRef(null);
  const painelRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const mobile = usarLayoutMobile();

  // No celular a busca fica num campo próprio dentro do painel; no
  // computador o próprio campo da tela é o que filtra.
  const termo = mobile ? busca : value;

  const lista = useMemo(() => {
    const todas = nomes || [];
    const escolhida = chaveFornecedor(value);
    // Depois de escolher uma, o campo fica com o nome inteiro dentro. Se
    // esse texto continuasse filtrando, abrir a lista mostraria só ela —
    // e daria a impressão de que as outras sumiram.
    if (!mobile && escolhida && todas.some((n) => chaveFornecedor(n) === escolhida)) return todas;
    return todas.filter((n) => combinaBusca(termo, n));
  }, [nomes, termo, value, mobile]);

  const digitado = String(value || '').trim();
  const jaExiste = (nomes || []).some((n) => chaveFornecedor(n) === chaveFornecedor(digitado));
  const mostrarNova = digitado.length > 0 && !jaExiste;
  const idxNova = lista.length;

  useEffect(() => { setIndiceAtivo(-1); }, [termo, aberto]);

  useEffect(() => {
    if (!aberto) return;
    function aoClicarFora(e) {
      if (containerRef.current?.contains(e.target)) return;
      if (painelRef.current?.contains(e.target)) return;
      fechar();
    }
    document.addEventListener('mousedown', aoClicarFora);
    return () => document.removeEventListener('mousedown', aoClicarFora);
  }, [aberto]);

  // Mede o campo para ancorar o dropdown no computador; refaz a medida se
  // a página rolar ou a janela mudar de tamanho com o painel aberto.
  useEffect(() => {
    if (!aberto || mobile) return;
    function medir() {
      if (containerRef.current) setAncora(containerRef.current.getBoundingClientRect());
    }
    medir();
    window.addEventListener('scroll', medir, true);
    window.addEventListener('resize', medir);
    return () => {
      window.removeEventListener('scroll', medir, true);
      window.removeEventListener('resize', medir);
    };
  }, [aberto, mobile]);

  useEffect(() => {
    if (!aberto || indiceAtivo < 0 || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-idx="${indiceAtivo}"]`);
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [indiceAtivo, aberto]);

  function abrir() {
    setBusca('');
    setAberto(true);
  }

  function fechar() {
    setAberto(false);
    setBusca('');
  }

  function escolher(nome) {
    onChange(nome);
    fechar();
  }

  function aoTeclar(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!aberto) { abrir(); return; }
      setIndiceAtivo((i) => Math.min(lista.length - 1 + (mostrarNova ? 1 : 0), i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndiceAtivo((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      if (aberto && indiceAtivo >= 0) {
        e.preventDefault();
        if (indiceAtivo < lista.length) escolher(lista[indiceAtivo]);
        else fechar();
      }
    } else if (e.key === 'Escape') {
      if (aberto) { e.preventDefault(); fechar(); }
    }
  }

  const total = (nomes || []).length;
  const escolhidaChave = chaveFornecedor(value);

  const painelConteudo = (
    <>
      {mobile && (
        <div className="fixed inset-0 bg-black/30 z-40 animate-fade-in" onClick={fechar} />
      )}
      <div
        ref={painelRef}
        style={mobile ? undefined : (ancora ? { top: ancora.bottom + 6, left: ancora.left, width: ancora.width } : { display: 'none' })}
        className={mobile
          ? 'fixed inset-x-0 bottom-0 z-50 rounded-t-2xl shadow-popover bg-white flex flex-col max-h-[75vh] animate-sheet-up'
          : 'fixed z-50 rounded-xl shadow-popover bg-white flex flex-col max-h-80 animate-scale-in'}
      >
        {mobile && (
          <div className="flex-shrink-0">
            <div className="flex justify-center pt-2 pb-1">
              <span className="w-10 h-1 rounded-full bg-stone-200" />
            </div>
            <div className="flex items-center justify-between px-4 pb-2 border-b border-stone-100">
              <p className="text-sm font-semibold text-stone-700">Distribuidora</p>
              <button type="button" onClick={fechar} className="eco-icon-btn -mr-1.5">
                <X size={16} />
              </button>
            </div>
            <div className="p-2 border-b border-stone-100">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-300" />
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  onKeyDown={aoTeclar}
                  placeholder="Procurar distribuidora…"
                  autoFocus
                  className="eco-input-sm pl-8 w-full"
                />
              </div>
            </div>
          </div>
        )}

        <div ref={listRef} className="overflow-y-auto flex-1">
          {lista.map((nome, idx) => {
            const ativo = idx === indiceAtivo;
            const marcada = escolhidaChave && chaveFornecedor(nome) === escolhidaChave;
            return (
              <button
                key={chaveFornecedor(nome)}
                type="button"
                data-idx={idx}
                onMouseEnter={() => setIndiceAtivo(idx)}
                onClick={() => escolher(nome)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 sm:py-2 text-left text-sm transition-colors duration-100 ${
                  ativo ? 'bg-green-50 text-green-800' : 'text-stone-700 hover:bg-stone-50'
                }`}
              >
                <span className="truncate">{nome}</span>
                {marcada && <Check size={14} className="flex-shrink-0 text-green-600" />}
              </button>
            );
          })}

          {lista.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-stone-400">
              {total === 0
                ? 'Nenhuma distribuidora cadastrada ainda — digite o nome.'
                : `Nenhuma distribuidora com "${String(termo).trim()}".`}
            </p>
          )}

          {mostrarNova && (
            <button
              type="button"
              data-idx={idxNova}
              onMouseEnter={() => setIndiceAtivo(idxNova)}
              onClick={() => escolher(digitado)}
              className={`w-full flex items-center gap-2 px-3 py-2.5 sm:py-2 text-left text-sm border-t border-dashed border-stone-200 transition-colors duration-100 ${
                indiceAtivo === idxNova ? 'bg-green-50 text-green-800' : 'text-green-700 hover:bg-green-50'
              }`}
            >
              <Plus size={14} /> Cadastrar nova: "{digitado}"
            </button>
          )}
        </div>

        {total > 0 && (
          <p className="flex-shrink-0 border-t border-stone-100 px-3 py-2 text-[11px] text-stone-400">
            {lista.length === total
              ? `${total} distribuidora${total === 1 ? '' : 's'} cadastrada${total === 1 ? '' : 's'}`
              : `${lista.length} de ${total} distribuidoras`}
          </p>
        )}
      </div>
    </>
  );

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-stretch gap-0">
        <input
          id={id}
          ref={inputRef}
          role="combobox"
          aria-expanded={aberto}
          aria-autocomplete="list"
          value={value}
          onChange={(e) => { onChange(upperInput(e.target.value)); if (!aberto) setAberto(true); }}
          onFocus={() => setAberto(true)}
          onKeyDown={aoTeclar}
          placeholder="Digite ou escolha a distribuidora"
          className="eco-input rounded-r-none border-r-0 flex-1 min-w-0"
          autoComplete="off"
        />
        {value ? (
          <button
            type="button"
            onClick={() => { onChange(''); inputRef.current?.focus(); }}
            className="px-2.5 border border-stone-200 rounded-r-lg bg-white text-stone-400 hover:text-stone-600 hover:bg-stone-50 transition-colors duration-150 flex-shrink-0"
            aria-label="Limpar distribuidora"
          >
            <X size={16} />
          </button>
        ) : (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => { if (aberto) fechar(); else { abrir(); inputRef.current?.focus(); } }}
            className="px-2.5 border border-stone-200 rounded-r-lg bg-white text-stone-400 hover:text-stone-600 hover:bg-stone-50 transition-colors duration-150 flex-shrink-0"
            aria-label="Ver todas as distribuidoras"
          >
            <ChevronDown size={16} className={`transition-transform duration-150 ${aberto ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      {aberto && createPortal(painelConteudo, document.body)}
    </div>
  );
}
