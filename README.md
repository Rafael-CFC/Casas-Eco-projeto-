# Casas Eco — Custo de Obra

Software de controle de custo de obra, com login protegido e dados compartilhados entre toda a equipe.

## Passo a passo para colocar no ar

Siga na ordem. Não precisa saber programar nem usar linha de comando — tudo é feito pelo site de cada serviço.

---

### 1. Criar o banco de dados (Supabase) — grátis

1. Acesse **https://supabase.com** e crie uma conta grátis.
2. Clique em **"New project"**. Dê um nome (ex: `casaseco`) e uma senha de banco de dados (guarde essa senha em local seguro, mas ela **não** é a senha que sua equipe vai usar para entrar no site — isso é só do banco de dados).
3. Espere uns 2 minutos o projeto ser criado.
4. No menu à esquerda, clique em **"SQL Editor"** → **"New query"**.
5. Abra o arquivo `schema.sql` (está junto com esses arquivos), copie todo o conteúdo, cole no editor e clique em **"Run"**.
   - Isso cria a "tabela" onde os dados do software vão ficar guardados, já protegida.
6. Ainda no Supabase, vá em **"Authentication"** → **"Users"** → **"Add user"** → **"Create new user"**.
   - Coloque um e-mail (pode ser genérico, tipo `equipe@casaseco.com.br`) e uma senha forte.
   - **Essa é a senha que toda a equipe vai usar para entrar no site.**
7. Vá em **"Settings"** (ícone de engrenagem) → **"API"**. Você vai precisar de dois valores nessa página:
   - **Project URL** (algo como `https://xxxxx.supabase.co`)
   - **anon public** key (uma chave longa)
   - Guarde os dois — vai usar no passo 3.

---

### 2. Colocar o código no GitHub

1. Acesse **https://github.com** e crie uma conta grátis (se ainda não tiver).
2. Clique no `+` no canto superior direito → **"New repository"**.
3. Dê um nome (ex: `casaseco-custo-obra`), marque como **Private** (recomendado, já que o código vai ter comentários internos) e clique em **"Create repository"**.
4. Na página do repositório vazio, clique no link **"uploading an existing file"**.
5. Arraste **todos** os arquivos e pastas deste projeto para a área de upload (menos a pasta `node_modules`, se existir — ela não deve ir).
6. Clique em **"Commit changes"**.

---

### 3. Publicar o site (Vercel) — grátis

1. Acesse **https://vercel.com** e crie uma conta grátis — escolha a opção de entrar **"with GitHub"**, assim já conecta os dois automaticamente.
2. Clique em **"Add New..."** → **"Project"**.
3. Escolha o repositório que você criou (`casaseco-custo-obra`) e clique em **"Import"**.
4. Antes de clicar em "Deploy", abra a seção **"Environment Variables"** e adicione as duas chaves que você guardou no passo 1:
   - `VITE_SUPABASE_URL` → cole a Project URL
   - `VITE_SUPABASE_ANON_KEY` → cole a anon public key
5. Clique em **"Deploy"**. Espere 1-2 minutos.
6. Pronto — a Vercel te dá um link (tipo `casaseco-custo-obra.vercel.app`). Esse é o link público. Qualquer pessoa que abrir vai ver a tela de login; só quem tiver o e-mail e senha que você criou no passo 1.6 consegue entrar.

---

## E se eu precisar mexer em algo depois?

Sempre que eu (Claude) fizer uma atualização no software, vou te mandar os arquivos atualizados aqui no chat. Você só precisa:
1. Ir no GitHub, no seu repositório, e subir os arquivos novos (mesmo processo do passo 2.4-2.6, substituindo os antigos).
2. A Vercel detecta a mudança automaticamente e atualiza o site sozinha em 1-2 minutos.

## E se eu quiser trocar a senha da equipe?

No Supabase → Authentication → Users → clique nos "..." do usuário → "Reset password" (ou apague e crie de novo).

## Sobre segurança

- Ninguém consegue acessar os dados sem estar logado — isso é garantido pelo próprio banco de dados (Supabase), não só pelo site.
- Hoje é uma senha única para toda a equipe. Se no futuro você quiser um login por pessoa (cada funcionário com seu e-mail), é só pedir — a estrutura já está pronta para isso, é só criar mais usuários no passo 1.6.
