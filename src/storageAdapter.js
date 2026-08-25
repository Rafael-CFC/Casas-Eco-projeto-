// Este arquivo faz o software (que foi criado usando o armazenamento
// próprio do Claude) conversar com um banco de dados de verdade (Supabase),
// sem precisar mexer no restante do código do software.
//
// Todas as "obras", "produtos", "lançamentos" etc. ficam guardados numa
// única tabela `app_data`, uma linha por tipo de dado — o mesmo formato
// que o software já espera.

import { supabase } from './supabaseClient';

// O banco só aceita leitura e gravação de quem está logado, e só da conta
// marcada como dona do sistema. Quando ele recusa, a mensagem que chega é
// técnica e em inglês — aqui ela vira algo que dá para agir em cima.
function explicarErro(error) {
  const m = String(error?.message || '').toLowerCase();
  const codigo = String(error?.code || '');
  if (codigo === '42501' || m.includes('row-level security') || m.includes('violates row-level')) {
    return 'Sua conta não tem permissão para gravar. No Supabase, confira se o seu e-mail está marcado como "dono" (passo 5 do schema.sql).';
  }
  if (m.includes('jwt') || m.includes('token') || String(error?.status) === '401') {
    return 'Sua sessão expirou. Saia e entre de novo.';
  }
  if (m.includes('failed to fetch') || m.includes('networkerror')) {
    return 'Sem conexão com o servidor. O que você digitou continua na tela.';
  }
  return error?.message || 'erro desconhecido do banco de dados';
}

window.storage = {
  async get(key) {
    const { data, error } = await supabase
      .from('app_data')
      .select('value')
      .eq('key', key)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error(`chave "${key}" ainda não existe`);
    return { key, value: data.value, shared: true };
  },

  async set(key, value) {
    const { error } = await supabase
      .from('app_data')
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });

    if (error) {
      console.error('Erro ao salvar no Supabase:', error);
      throw new Error(explicarErro(error));
    }
    return { key, value, shared: true };
  },

  async delete(key) {
    const { error } = await supabase.from('app_data').delete().eq('key', key);
    if (error) return null;
    return { key, deleted: true, shared: true };
  },

  async list(prefix) {
    let query = supabase.from('app_data').select('key');
    if (prefix) query = query.like('key', `${prefix}%`);
    const { data, error } = await query;
    if (error) throw error;
    return { keys: (data || []).map((r) => r.key), prefix, shared: true };
  },
};
