-- Rode esse script inteiro no Supabase, DEPOIS de já ter rodado o schema.sql
-- original. Menu "SQL Editor" > "New query" > colar > "Run".
--
-- Isso cria um espaço de armazenamento de arquivos ("bucket") para guardar
-- as fotos dos boletos, com a mesma proteção que os outros dados já têm:
-- só quem estiver logado consegue ver/enviar/apagar as fotos.

insert into storage.buckets (id, name, public)
values ('boletos', 'boletos', false)
on conflict (id) do nothing;

-- Só quem estiver logado pode ver as fotos dos boletos
create policy "usuarios logados podem ler fotos de boletos"
  on storage.objects for select
  using (bucket_id = 'boletos' and auth.role() = 'authenticated');

-- Só quem estiver logado pode enviar fotos novas
create policy "usuarios logados podem enviar fotos de boletos"
  on storage.objects for insert
  with check (bucket_id = 'boletos' and auth.role() = 'authenticated');

-- Só quem estiver logado pode substituir uma foto
create policy "usuarios logados podem atualizar fotos de boletos"
  on storage.objects for update
  using (bucket_id = 'boletos' and auth.role() = 'authenticated');

-- Só quem estiver logado pode apagar uma foto
create policy "usuarios logados podem apagar fotos de boletos"
  on storage.objects for delete
  using (bucket_id = 'boletos' and auth.role() = 'authenticated');
