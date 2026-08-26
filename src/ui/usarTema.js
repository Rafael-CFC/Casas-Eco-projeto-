import { useSyncExternalStore } from 'react';
import { assinarTema, definirTema, ehEscuro, temaAtivo } from './temaStore';

// Tema escolhido ('escuro' | 'claro' | 'sistema') e a função de trocar.
// Todos os componentes que usam este hook ficam em sincronia: trocar o
// tema num lugar atualiza os botões de tema de todas as telas abertas.
export default function usarTema() {
  const tema = useSyncExternalStore(assinarTema, temaAtivo, temaAtivo);
  return [tema, definirTema];
}

// Só a resposta prática: "a tela está escura agora?". Usado por quem
// precisa escolher cor no JavaScript (os gráficos, que são desenhados em
// SVG e não pegam a cor pelo CSS).
export function usarEstaEscuro() {
  const [tema] = usarTema();
  return ehEscuro(tema);
}
