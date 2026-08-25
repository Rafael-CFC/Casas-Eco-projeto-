import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Camera, Image as ImageIcon, X } from 'lucide-react';
import usarLayoutMobile from '../ui/usarLayoutMobile';

// Escolha da foto do boleto. No celular, abre um painel embaixo com duas
// opções (câmera / galeria) — no computador não existe essa escolha (não
// tem câmera na maioria das vezes), então abre direto o seletor de arquivo
// assim que `aberto` vira true, sem mostrar painel nenhum.
//
// O painel é renderizado num portal em document.body (mesma solução usada
// em ProdutoSeletor.jsx): o <main> do app tem uma animação de entrada que
// usa `transform`, o que vira "containing block" de filhos position:fixed
// — sem o portal, esse painel ficaria preso atrás do menu inferior fixo.
export default function SeletorFotoBoleto({ aberto, onFechar, onImagemSelecionada }) {
  const mobile = usarLayoutMobile();
  const camRef = useRef(null);
  const galRef = useRef(null);
  const desktopRef = useRef(null);

  useEffect(() => {
    if (aberto && !mobile && desktopRef.current) {
      desktopRef.current.click();
    }
  }, [aberto, mobile]);

  function aoEscolherArquivo(e) {
    const arquivo = e.target.files && e.target.files[0];
    e.target.value = '';
    if (arquivo) onImagemSelecionada(arquivo);
    onFechar();
  }

  const painel = (
    <>
      <div className="fixed inset-0 bg-black/30 z-40 animate-fade-in" onClick={onFechar} />
      <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl shadow-popover bg-white animate-sheet-up">
        <div className="flex justify-center pt-2 pb-1">
          <span className="w-10 h-1 rounded-full bg-stone-200" />
        </div>
        <div className="flex items-center justify-between px-4 pb-3 border-b border-stone-100">
          <p className="text-sm font-semibold text-stone-700">Foto do boleto</p>
          <button onClick={onFechar} className="eco-icon-btn -mr-1.5">
            <X size={16} />
          </button>
        </div>
        <div className="p-4 space-y-2 pb-28">
          <button onClick={() => camRef.current.click()} className="eco-btn-primary w-full py-3">
            <Camera size={18} /> Tirar foto
          </button>
          <button onClick={() => galRef.current.click()} className="eco-btn-secondary w-full py-3">
            <ImageIcon size={18} /> Escolher da galeria
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      <input ref={camRef} type="file" accept="image/*" capture="environment" onChange={aoEscolherArquivo} className="hidden" />
      <input ref={galRef} type="file" accept="image/*" onChange={aoEscolherArquivo} className="hidden" />
      <input ref={desktopRef} type="file" accept="image/*" onChange={aoEscolherArquivo} className="hidden" />

      {mobile && aberto && createPortal(painel, document.body)}
    </>
  );
}
