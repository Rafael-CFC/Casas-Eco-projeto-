import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './storageAdapter'; // prepara o window.storage antes de tudo
import { supabase } from './supabaseClient';
import App from './App.jsx';
import Login from './Login.jsx';

function Root() {
  const [session, setSession] = useState(undefined); // undefined = ainda carregando

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, novaSession) => {
      setSession(novaSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-emerald-50 text-stone-400 text-sm">
        Carregando...
      </div>
    );
  }

  if (!session) {
    return <Login onLogin={setSession} />;
  }

  return (
    <>
      <App />
      <button
        onClick={() => supabase.auth.signOut()}
        className="fixed z-[60] bg-white border border-stone-300 text-stone-500 text-xs px-2.5 py-1.5 rounded shadow-sm hover:bg-stone-50"
        style={{ bottom: '76px', right: '12px' }}
      >
        Sair
      </button>
    </>
  );
}

createRoot(document.getElementById('root')).render(<Root />);
