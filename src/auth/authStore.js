// Login de verdade, feito pelo servidor do Supabase.
//
// Antes a senha ficava escrita dentro do próprio site: qualquer pessoa que
// abrisse o código da página no navegador conseguia lê-la, e dava para
// pular a tela de login mexendo no armazenamento do navegador. Pior: como
// o site nunca fazia login no banco, a proteção do banco (RLS) não valia
// para nada — os dados ficavam ao alcance de quem soubesse o endereço.
//
// Agora quem confere a senha é o Supabase. Ele devolve um crachá temporário
// (token) que acompanha toda leitura e gravação; sem esse crachá o banco
// não entrega nem uma linha.
import { supabase } from '../supabaseClient';

// Mensagens do Supabase vêm em inglês — aqui viram português.
function traduzirErro(erro) {
  const m = String(erro?.message || '').toLowerCase();
  if (m.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (m.includes('email not confirmed')) return 'Este e-mail ainda não foi confirmado no Supabase.';
  if (m.includes('too many requests') || m.includes('rate limit')) {
    return 'Muitas tentativas seguidas. Espere um minuto e tente de novo.';
  }
  if (m.includes('failed to fetch') || m.includes('networkerror')) {
    return 'Sem conexão com o servidor. Confira a internet e tente de novo.';
  }
  if (m.includes('should be at least') || m.includes('password')) {
    return 'A senha precisa ter pelo menos 8 caracteres.';
  }
  if (m.includes('user not found')) return 'Não existe conta com esse e-mail.';
  return erro?.message || 'Não foi possível completar a operação.';
}

export async function entrar(email, senha) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: String(email || '').trim(),
    password: senha,
  });
  if (error) return { ok: false, erro: traduzirErro(error) };
  return { ok: true, sessao: data.session };
}

export async function sair() {
  await supabase.auth.signOut();
}

export async function sessaoAtual() {
  const { data } = await supabase.auth.getSession();
  return data?.session || null;
}

// Avisa quando a sessão muda — inclusive quando ela expira sozinha ou
// quando o acesso é revogado no Supabase. Aí a tela de login volta.
export function aoMudarSessao(callback) {
  const { data } = supabase.auth.onAuthStateChange((_evento, sessao) => callback(sessao));
  return () => data?.subscription?.unsubscribe();
}

export async function enviarRecuperacaoDeSenha(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(String(email || '').trim(), {
    redirectTo: window.location.origin,
  });
  if (error) return { ok: false, erro: traduzirErro(error) };
  return { ok: true };
}

export async function trocarSenha(novaSenha) {
  if (String(novaSenha || '').length < 8) {
    return { ok: false, erro: 'A senha precisa ter pelo menos 8 caracteres.' };
  }
  const { error } = await supabase.auth.updateUser({ password: novaSenha });
  if (error) return { ok: false, erro: traduzirErro(error) };
  return { ok: true };
}

// Quem é o dono e quem é funcionário. Quem manda de verdade é o banco (as
// políticas de acesso usam a MESMA função). Aqui a resposta serve só para
// montar a tela certa.
//
// Se a função ainda não existe no banco (o dono ainda não rodou o
// schema.sql novo), o site continua funcionando como antes — nesse caso o
// banco também ainda não está restringindo nada.
export async function papelDoUsuario() {
  try {
    const { data, error } = await supabase.rpc('papel_do_usuario');
    if (error) return 'dono';
    return data === 'funcionario' ? 'funcionario' : 'dono';
  } catch (e) {
    return 'dono';
  }
}
