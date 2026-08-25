-- =====================================================================
--  FOTOS DOS BOLETOS
--
--  Rode DEPOIS do schema.sql. Supabase > "SQL Editor" > "New query" >
--  colar > "Run". Pode rodar mais de uma vez sem problema.
--
--  Cria o espaço de arquivos ("bucket") das fotos de boleto com a mesma
--  tranca dos outros dados: fechado para a internet e liberado só para a
--  conta do dono.
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('boletos', 'boletos', false)
on conflict (id) do update set public = false;

-- tira as regras antigas (liberavam para qualquer conta logada,
-- inclusive a do funcionário)
drop policy if exists "usuarios logados podem ler fotos de boletos"      on storage.objects;
drop policy if exists "usuarios logados podem enviar fotos de boletos"   on storage.objects;
drop policy if exists "usuarios logados podem atualizar fotos de boletos" on storage.objects;
drop policy if exists "usuarios logados podem apagar fotos de boletos"   on storage.objects;
drop policy if exists "dono le fotos de boletos"       on storage.objects;
drop policy if exists "dono envia fotos de boletos"    on storage.objects;
drop policy if exists "dono atualiza fotos de boletos" on storage.objects;
drop policy if exists "dono apaga fotos de boletos"    on storage.objects;

create policy "dono le fotos de boletos"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'boletos' and public.papel_do_usuario() = 'dono');

create policy "dono envia fotos de boletos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'boletos' and public.papel_do_usuario() = 'dono');

create policy "dono atualiza fotos de boletos"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'boletos' and public.papel_do_usuario() = 'dono');

create policy "dono apaga fotos de boletos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'boletos' and public.papel_do_usuario() = 'dono');
