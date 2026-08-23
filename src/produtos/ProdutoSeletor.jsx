import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, Star, Clock, Plus, X } from 'lucide-react';
import { formatMoney } from '../domain';
import { selecionarSecoes } from './catalogoUtils';

// Seletor de produto/material reutilizável: um input de texto comum (então
// digitar continua funcionando exatamente como antes) mais um painel de
// catálogo que se adapta ao tamanho de tela — vira um "bottom sheet" grande
// e tocável no celular, e um dropdown ancorado no input no desktop, com
// navegação por teclado (setas/Enter/Esc). Nunca inventa itens: a lista vem
// inteira de `itens`, montada a partir de dados reais (ver catalogoUtils.js).
//
// O painel é renderizado num portal em document.body (posicionado com
// coordenadas de viewport calculadas na mão) em vez de ficar aninhado no
// próprio formulário. Isso evita um problema real de CSS: qualquer
// ancestral com uma animação de entrada (as classes animate-fade-in-up/
// scale-in do app, que terminam com um `transform` diferente de `none`)
// vira "containing block" dos filhos com position:fixed, quebrando o
// posicionamento do painel. Fora da árvore, o painel sempre se posiciona
// contra o viewport de verdade.
function usarLayoutMobile() {
  const consulta = '(max-width: 639px)';
  const [mobile, setMobile] = useState(() => window.matchMedia(consulta).matches);
  useEffect(() => {
    const mq = window.matchMedia(consulta);
    const handler = (e) => setMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return mobile;
}

export default function ProdutoSeletor({
  value,
  onChangeTexto,
  onSelecionar,
  itens,
  placeholder,
  categoriaLabel,
  id,
}) {
  const [aberto, setAberto] = useState(false);
  const [indiceAtivo, setIndiceAtivo] = useState(-1);
  const [ancora, setAncora] = useState(null);
  const containerRef = useRef(null);
  const painelRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const mobile = usarLayoutMobile();

  const { maisUtilizados, recentes, lista } = useMemo(
    () => selecionarSecoes(itens, value),
    [itens, value]
  );

  const existeExato = useMemo(
    () => itens.some((it) => it.nome.trim().toLowerCase() === value.trim().toLowerCase()),
    [itens, value]
  );
  const mostrarCadastrarNovo = value.trim().length > 0 && !existeExato;

  // Lista achatada na ordem de exibição — usada para navegação por teclado.
  const opcoes = useMemo(() => {
    const vistos = new Set();
    const flat = [];
    [...maisUtilizados, ...recentes, ...lista].forEach((it) => {
      if (vistos.has(it.chave)) return;
      vistos.add(it.chave);
      flat.push(it);
    });
    return flat;
  }, [maisUtilizados, recentes, lista]);

  useEffect(() => { setIndiceAtivo(-1); }, [value, aberto]);

  useEffect(() => {
    if (!aberto) return;
    function aoClicarFora(e) {
      if (containerRef.current?.contains(e.target)) return;
      if (painelRef.current?.contains(e.target)) return;
      setAberto(false);
    }
    document.addEventListener('mousedown', aoClicarFora);
    return () => document.removeEventListener('mousedown', aoClicarFora);
  }, [aberto]);

  // Mede a posição do campo para ancorar o dropdown no desktop; refaz a
  // medida se a página rolar ou a janela mudar de tamanho enquanto aberto.
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

  function selecionar(item) {
    onSelecionar(item);
    setAberto(false);
  }

  function aoTeclar(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!aberto) { setAberto(true); return; }
      setIndiceAtivo((i) => Math.min(opcoes.length - 1 + (mostrarCadastrarNovo ? 1 : 0), i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndiceAtivo((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      if (aberto && indiceAtivo >= 0) {
        e.preventDefault();
        if (indiceAtivo < opcoes.length) selecionar(opcoes[indiceAtivo]);
        else setAberto(false);
      }
    } else if (e.key === 'Escape') {
      if (aberto) { e.preventDefault(); setAberto(false); }
    }
  }

  function Secao({ titulo, Icon, itens: itensSecao, grupo }) {
    if (itensSecao.length === 0) return null;
    return (
      <div className="py-1.5">
        <p className="px-3 py-1 text-[11px] font-semibold text-stone-400 uppercase tracking-wide flex items-center gap-1">
          {Icon && <Icon size={11} />} {titulo}
        </p>
        {itensSecao.map((it) => {
          const idx = opcoes.findIndex((o) => o.chave === it.chave);
          const ativo = idx === indiceAtivo;
          return (
            <button
              key={`${grupo}-${it.chave}`}
              type="button"
              data-idx={idx}
              onMouseEnter={() => setIndiceAtivo(idx)}
              onClick={() => selecionar(it)}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 sm:py-2 text-left text-sm transition-colors duration-100 ${
                ativo ? 'bg-green-50 text-green-800' : 'text-stone-700 hover:bg-stone-50'
              }`}
            >
              <span className="truncate">{it.nome}</span>
              <span className="flex items-center gap-2 flex-shrink-0 text-xs text-stone-400">
                {it.unidade && <span>{it.unidade}</span>}
                {it.preco != null && <span className="text-stone-500 font-medium">{formatMoney(it.preco)}</span>}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  const idxCadastrar = opcoes.length;
  const semResultados = value.trim() && maisUtilizados.length === 0 && recentes.length === 0 && lista.length === 0;

  const painelConteudo = (
    <>
      {mobile && (
        <div
          className="fixed inset-0 bg-black/30 z-40 animate-fade-in"
          onClick={() => setAberto(false)}
        />
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
              <p className="text-sm font-semibold text-stone-700">{categoriaLabel || 'Selecionar item'}</p>
              <button type="button" onClick={() => setAberto(false)} className="eco-icon-btn -mr-1.5">
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        <div className="p-2 border-b border-stone-100 flex-shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-300" />
            <input
              value={value}
              onChange={(e) => onChangeTexto(e.target.value)}
              onKeyDown={aoTeclar}
              placeholder="Pesquisar produto…"
              autoFocus={mobile}
              className="eco-input-sm pl-8 w-full"
            />
          </div>
        </div>

        <div ref={listRef} className="overflow-y-auto flex-1">
          <Secao titulo="Mais utilizados" Icon={Star} itens={maisUtilizados} grupo="uso" />
          <Secao titulo="Utilizados recentemente" Icon={Clock} itens={recentes} grupo="recente" />
          <Secao titulo={categoriaLabel || 'Catálogo'} itens={lista} grupo="lista" />

          {semResultados && (
            <p className="px-3 py-6 text-center text-sm text-stone-400">Nenhum resultado para "{value.trim()}".</p>
          )}

          {mostrarCadastrarNovo && (
            <button
              type="button"
              data-idx={idxCadastrar}
              onMouseEnter={() => setIndiceAtivo(idxCadastrar)}
              onClick={() => setAberto(false)}
              className={`w-full flex items-center gap-2 px-3 py-2.5 sm:py-2 text-left text-sm border-t border-dashed border-stone-200 transition-colors duration-100 ${
                indiceAtivo === idxCadastrar ? 'bg-green-50 text-green-800' : 'text-green-700 hover:bg-green-50'
              }`}
            >
              <Plus size={14} /> Cadastrar novo: "{value.trim()}"
            </button>
          )}
        </div>
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
          onChange={(e) => { onChangeTexto(e.target.value); if (!aberto) setAberto(true); }}
          onFocus={() => setAberto(true)}
          onKeyDown={aoTeclar}
          placeholder={placeholder}
          className="eco-input rounded-r-none border-r-0 flex-1 min-w-0"
          autoComplete="off"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => { setAberto((v) => !v); inputRef.current?.focus(); }}
          className="px-2.5 border border-stone-200 rounded-r-lg bg-white text-stone-400 hover:text-stone-600 hover:bg-stone-50 transition-colors duration-150 flex-shrink-0"
          aria-label="Abrir catálogo de produtos"
        >
          <ChevronDown size={16} className={`transition-transform duration-150 ${aberto ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {aberto && createPortal(painelConteudo, document.body)}
    </div>
  );
}
