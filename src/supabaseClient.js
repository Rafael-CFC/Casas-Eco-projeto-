import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error(
    'Faltam as variáveis VITE_SUPABASE_URL e/ou VITE_SUPABASE_ANON_KEY. ' +
    'Confira o arquivo .env (veja .env.example) ou as variáveis de ambiente configuradas no seu serviço de deploy.'
  );
}

// A chave "anon" é pública de propósito — ela sozinha não abre nada. Quem
// protege os dados é a política de acesso do banco (RLS), que só libera
// leitura e gravação para quem está logado de verdade.
export const supabase = createClient(url, anonKey, {
  auth: {
    // mantém o login entre visitas e renova o token sozinho antes de vencer
    persistSession: true,
    autoRefreshToken: true,
    // necessário para o link de "esqueci minha senha" abrir já reconhecido
    detectSessionInUrl: true,
    storageKey: 'casaseco-sessao',
  },
});
