-- =====================================================================
--  BANCO DE DADOS DO SISTEMA CASAS ECO
--
--  Onde rodar: Supabase > menu "SQL Editor" > "New query" > colar tudo
--  > "Run".
--
--  Pode rodar quantas vezes quiser: o script se corrige sozinho, não
--  apaga nenhum dado e não desfaz nada que já esteja certo.
--
--  ⚠️  ANTES DE RODAR, VÁ ATÉ O PASSO 5 E TROQUE O E-MAIL PELO SEU.
--      Se você não fizer isso o script para no meio de propósito, sem
--      alterar nada, e avisa o que faltou. Isso é proposital: sem um
--      dono marcado, ninguém conseguiria abrir os dados.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1) A tabela onde tudo é guardado (obras, lançamentos, contratos...)
-- ---------------------------------------------------------------------
create table if not exists public.app_data (
  key        text primary key,
  value      text not null,
  updated_at timestamptz default now()
);


-- ---------------------------------------------------------------------
-- 2) Quem é quem
--
--    'dono'        = enxerga e mexe em tudo
--    'funcionario' = só a tela de orçamento de madeiras, que nem toca no
--                    banco. Ele não consegue ler obras, contratos,
--                    boletos nem lançamentos — nem pelo site, nem por
--                    fora dele.
--
--    Conta sem linha aqui vale como 'funcionario'. É de propósito: uma
--    conta nova nunca nasce enxergando tudo por engano.
-- ---------------------------------------------------------------------
create table if not exists public.perfis (
  user_id   uuid primary key references auth.users (id) on delete cascade,
  nome      text,
  papel     text not null default 'funcionario' check (papel in ('dono', 'funcionario')),
  criado_em timestamptz default now()
);

alter table public.perfis enable row level security;

drop policy if exists "cada um le o proprio perfil" on public.perfis;
create policy "cada um le o proprio perfil"
  on public.perfis for select
  to authenticated
  using (user_id = auth.uid());


-- ---------------------------------------------------------------------
-- 3) A função que responde "essa pessoa é o dono?"
--
--    É ela que as regras de acesso consultam. O site também pergunta a
--    mesma coisa, só para saber qual tela montar — mas quem decide o que
--    pode ser lido é sempre o banco.
-- ---------------------------------------------------------------------
create or replace function public.papel_do_usuario()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select papel from public.perfis where user_id = auth.uid()),
    'funcionario'
  );
$$;

revoke all on function public.papel_do_usuario() from public;
grant execute on function public.papel_do_usuario() to authenticated;


-- ---------------------------------------------------------------------
-- 4) A tranca dos dados
--
--    Sem estar logado não se lê nem uma linha. A chave pública que fica
--    dentro do site ("anon") sozinha não abre nada.
-- ---------------------------------------------------------------------
alter table public.app_data enable row level security;

-- tira as regras antigas (a versão anterior liberava para qualquer
-- pessoa logada, sem separar dono de funcionário)
drop policy if exists "usuarios logados podem ler"       on public.app_data;
drop policy if exists "usuarios logados podem inserir"   on public.app_data;
drop policy if exists "usuarios logados podem atualizar" on public.app_data;
drop policy if exists "usuarios logados podem apagar"    on public.app_data;
drop policy if exists "dono le os dados"       on public.app_data;
drop policy if exists "dono grava dados"       on public.app_data;
drop policy if exists "dono atualiza os dados" on public.app_data;
drop policy if exists "dono apaga os dados"    on public.app_data;

create policy "dono le os dados"
  on public.app_data for select
  to authenticated
  using (public.papel_do_usuario() = 'dono');

create policy "dono grava dados"
  on public.app_data for insert
  to authenticated
  with check (public.papel_do_usuario() = 'dono');

create policy "dono atualiza os dados"
  on public.app_data for update
  to authenticated
  using (public.papel_do_usuario() = 'dono')
  with check (public.papel_do_usuario() = 'dono');

create policy "dono apaga os dados"
  on public.app_data for delete
  to authenticated
  using (public.papel_do_usuario() = 'dono');


-- ---------------------------------------------------------------------
-- 5) ⚠️  TROQUE O E-MAIL ABAIXO PELO SEU  ⚠️
--
--    Tem que ser exatamente o e-mail da conta que você criou em
--    Authentication > Users. É essa conta que vira a dona do sistema.
--
--    Para dar acesso de dono a mais alguém depois, é só rodar este
--    mesmo trecho de novo com o outro e-mail.
-- ---------------------------------------------------------------------
insert into public.perfis (user_id, nome, papel)
select id, coalesce(raw_user_meta_data ->> 'name', email), 'dono'
  from auth.users
 where lower(email) = lower('TROQUE-AQUI-PELO-SEU-EMAIL@exemplo.com')
    on conflict (user_id) do update set papel = 'dono';


-- ---------------------------------------------------------------------
-- 6) Trava de segurança: se ninguém virou dono, nada disso vale
--
--    O script inteiro é desfeito e o banco continua exatamente como
--    estava. Corrija o e-mail do passo 5 e rode de novo.
-- ---------------------------------------------------------------------
do $$
declare quantos int;
begin
  select count(*) into quantos from public.perfis where papel = 'dono';
  if quantos = 0 then
    raise exception using message =
      'Nenhuma conta foi marcada como DONO. Volte no passo 5, troque ' ||
      'TROQUE-AQUI-PELO-SEU-EMAIL@exemplo.com pelo e-mail que você criou em ' ||
      'Authentication > Users, e rode o script de novo. Nada foi alterado.';
  end if;
end $$;


-- ---------------------------------------------------------------------
-- 7) Conferência — quem tem acesso a quê
--
--    Roda junto e mostra o resultado ali embaixo. Confira se o seu
--    e-mail aparece como "dono".
-- ---------------------------------------------------------------------
select u.email,
       coalesce(p.papel, 'funcionario') as papel,
       u.last_sign_in_at as ultimo_acesso
  from auth.users u
  left join public.perfis p on p.user_id = u.id
 order by coalesce(p.papel, 'funcionario'), u.email;
