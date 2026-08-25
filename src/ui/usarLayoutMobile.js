import { useEffect, useState } from 'react';

// Hook compartilhado: diz se a tela está no tamanho "celular" (< 640px,
// mesmo breakpoint `sm` do Tailwind usado em todo o app). Extraído de
// ProdutoSeletor.jsx pra ser reaproveitado por outras telas com
// comportamento diferente em mobile/desktop (ex.: módulo de Boletos).
export default function usarLayoutMobile() {
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
