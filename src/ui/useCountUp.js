import { useEffect, useRef, useState } from 'react';

const prefereReduzirMovimento = () =>
  typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Anima um número de 0 (ou do valor anterior) até `valor` em `duracao`ms.
// Usado só nos indicadores do dashboard — puramente visual, não afeta
// nenhum cálculo. Retorna o valor já formatado por `formatar`.
export default function useCountUp(valor, { duracao = 600, formatar } = {}) {
  const [exibido, setExibido] = useState(valor);
  const anteriorRef = useRef(valor);
  const frameRef = useRef(null);

  useEffect(() => {
    const de = anteriorRef.current;
    const para = Number.isFinite(valor) ? valor : 0;
    if (prefereReduzirMovimento() || de === para) {
      setExibido(para);
      anteriorRef.current = para;
      return;
    }
    const inicio = performance.now();
    function passo(agora) {
      const t = Math.min(1, (agora - inicio) / duracao);
      const facilitado = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setExibido(de + (para - de) * facilitado);
      if (t < 1) {
        frameRef.current = requestAnimationFrame(passo);
      } else {
        anteriorRef.current = para;
      }
    }
    frameRef.current = requestAnimationFrame(passo);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor, duracao]);

  return formatar ? formatar(exibido) : exibido;
}
