-- Rode esse script inteiro no Supabase: menu "SQL Editor" > "New query" > colar > "Run"

create table if not exists app_data (
  key text primary key,
  value text not null,
  updated_at timestamptz default now()
);

-- Ativa a proteção: sem isso, qualquer pessoa na internet poderia ler/editar os dados
alter table app_data enable row level security;

-- Só quem estiver logado (com a senha da equipe) pode ler os dados
create policy "usuarios logados podem ler"
  on app_data for select
  using (auth.role() = 'authenticated');

-- Só quem estiver logado pode criar dados novos
create policy "usuarios logados podem inserir"
  on app_data for insert
  with check (auth.role() = 'authenticated');

-- Só quem estiver logado pode atualizar dados existentes
create policy "usuarios logados podem atualizar"
  on app_data for update
  using (auth.role() = 'authenticated');

-- Só quem estiver logado pode apagar
create policy "usuarios logados podem apagar"
  on app_data for delete
  using (auth.role() = 'authenticated');
