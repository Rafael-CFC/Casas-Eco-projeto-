import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error(
    'Faltam as variáveis VITE_SUPABASE_URL e/ou VITE_SUPABASE_ANON_KEY. ' +
    'Confira o arquivo .env (veja .env.example) ou as variáveis de ambiente configuradas no seu serviço de deploy.'
  );
}

export const supabase = createClient(url, anonKey);
