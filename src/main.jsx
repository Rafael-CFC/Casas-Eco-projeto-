import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './storageAdapter'; // prepara o window.storage antes de tudo
import App from './App.jsx';
import Login from './Login.jsx';

function Root() {
  const [autenticado, setAutenticado] = useState(() => {
    try {
      return localStorage.getItem('casaseco-autenticado') === 'sim';
    } catch (e) {
      return false;
    }
  });

  if (!autenticado) {
    return <Login onLogin={() => setAutenticado(true)} />;
  }

  return (
    <>
      <App />
      <button
        onClick={() => {
          try { localStorage.removeItem('casaseco-autenticado'); } catch (e) {}
          setAutenticado(false);
        }}
        className="fixed z-[60] bg-white border border-stone-300 text-stone-500 text-xs px-2.5 py-1.5 rounded shadow-sm hover:bg-stone-50"
        style={{ bottom: '76px', right: '12px' }}
      >
        Sair
      </button>
    </>
  );
}

createRoot(document.getElementById('root')).render(<Root />);
