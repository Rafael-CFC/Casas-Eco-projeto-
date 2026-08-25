# Casas Eco — Custo de Obra

Software de controle de custo de obra, com login por pessoa e dados guardados num banco de dados protegido.

## Passo a passo para colocar no ar

Siga na ordem. Não precisa saber programar nem usar linha de comando — tudo é feito pelo site de cada serviço.

---

### 1. Criar o banco de dados (Supabase) — grátis

1. Acesse **https://supabase.com** e crie uma conta grátis.
2. Clique em **"New project"**. Dê um nome (ex: `casaseco`) e uma senha de banco de dados (guarde essa senha em local seguro, mas ela **não** é a senha que sua equipe vai usar para entrar no site — isso é só do banco de dados).
3. Espere uns 2 minutos o projeto ser criado.
4. Vá em **"Authentication"** → **"Users"** → **"Add user"** → **"Create new user"**.
   - Use **o seu e-mail** e uma senha forte. Marque **"Auto Confirm User"**.
   - Essa vai ser a sua conta de dono do sistema.
   - Se quiser dar acesso ao funcionário das madeiras, crie **outro** usuário aqui, com o e-mail dele.
5. No menu à esquerda, clique em **"SQL Editor"** → **"New query"**.
6. Abra o arquivo `schema.sql`, copie todo o conteúdo e cole no editor.
   - **Antes de rodar**, procure o passo 5 dentro do arquivo e troque
     `TROQUE-AQUI-PELO-SEU-EMAIL@exemplo.com` pelo e-mail que você acabou de criar.
   - Clique em **"Run"**. Se você esquecer de trocar o e-mail, o script para sozinho
     sem alterar nada e explica o que faltou.
   - No fim aparece uma tabelinha com quem tem acesso a quê. Confira se o seu e-mail
     aparece como `dono`.
7. Rode também o `schema-boletos.sql`, do mesmo jeito (esse não precisa de nenhuma troca).
8. Vá em **"Settings"** (ícone de engrenagem) → **"API"**. Você vai precisar de dois valores nessa página:
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
6. Pronto — a Vercel te dá um link (tipo `casaseco-custo-obra.vercel.app`). Esse é o link público. Quem abrir só vê a tela de login; sem e-mail e senha não passa dali, e o banco de dados também não entrega nada.

---

## Como usar as telas principais

### Catálogo — pesquisar produto

Na tela **Catálogo** tem uma barra de pesquisa acima da lista. Digite parte do nome
(ou a unidade) e a lista filtra na hora — sem acento funciona igual (`moerao` acha
`MOERÃO`) e a ordem das palavras não importa (`cimento 50` acha `CIMENTO CP-II 50KG`).
Ao lado fica o **Ordenar por**: nome, atualizado recentemente, ou preço (maior/menor).
Embaixo da tabela aparece quantos produtos foram encontrados.

### Crediário — o que os montadores pegam

A tela **Crediário** é a caderneta dos montadores (Messias, Berlanda e quem mais
pegar produto na loja).

**Isso não é venda.** É só anotação interna, para descontar depois na mão de obra.
Nada do crediário vira nota fiscal, imposto, faturamento ou custo de obra: não
aparece no Financeiro, nem nos relatórios, nem no resumo das obras. Os dados ficam
guardados separados de todo o resto do sistema.

Como funciona no dia a dia:

1. **Cadastre o montador** uma vez (botão "Novo montador"): nome, apelido, telefone.
2. **Quando ele levar produto**, abra o cartão dele e clique em **Retirada**. Escolha
   os produtos (a lista traz o catálogo da loja mais a tabela de madeiras), a
   quantidade e o valor — o valor já vem preenchido pelo cadastro e dá para mudar.
   Pode marcar de qual obra é e deixar uma observação.
3. **Quando seu pai descontar o valor na mão de obra**, clique em **Acerto** e
   registre quanto foi descontado. O sistema já sugere o saldo inteiro, mas aceita
   desconto parcial. Também aceita "pago em dinheiro" ou "PIX" quando for o caso.
4. O **saldo** de cada montador é sempre "o que ele pegou menos o que já foi
   descontado". Verde = em dia, amarelo = ainda tem valor a descontar.

Para conferir com o montador: dentro do extrato dele tem **Extrato em PDF** (sai
carimbado como documento interno, sem valor fiscal, com linha para as duas
assinaturas) e **Copiar para WhatsApp** (cola o extrato como texto).

Tudo isso entra no backup normal do sistema (botão de backup em Relatórios).

## E se eu precisar mexer em algo depois?

Sempre que eu (Claude) fizer uma atualização no software, vou te mandar os arquivos atualizados aqui no chat. Você só precisa:
1. Ir no GitHub, no seu repositório, e subir os arquivos novos (mesmo processo do passo 2.4-2.6, substituindo os antigos).
2. A Vercel detecta a mudança automaticamente e atualiza o site sozinha em 1-2 minutos.

## Contas e senhas

**Trocar a sua própria senha:** dentro do sistema, botão **Senha** (na barra lateral no computador, ou no menu **Mais** no celular).

**Esqueceu a senha:** na tela de login, **"Esqueci minha senha"** — chega um link por e-mail.

**Criar mais uma conta:** Supabase → Authentication → Users → Add user. Toda conta nova entra como **funcionário**.

**Promover alguém a dono:** Supabase → SQL Editor, e rode:

```sql
insert into public.perfis (user_id, nome, papel)
select id, email, 'dono' from auth.users where lower(email) = lower('email-da-pessoa@exemplo.com')
on conflict (user_id) do update set papel = 'dono';
```

**Tirar o acesso de alguém:** Supabase → Authentication → Users → "..." → Delete user. O acesso cai na hora.

## Sobre segurança

- **A senha é conferida pelo servidor**, não pelo site. Não existe senha escrita dentro do código, e não dá para pular a tela de login mexendo no navegador.
- **O banco de dados também exige o login.** Cada leitura e cada gravação carrega um crachá temporário; sem ele o banco não devolve uma linha sequer, nem para quem souber o endereço do projeto.
- A chave `VITE_SUPABASE_ANON_KEY` é pública de propósito e sozinha não abre nada — quem protege são as regras de acesso do banco (RLS), criadas pelo `schema.sql`.
- **Dois níveis de acesso:**
  - `dono` — enxerga e mexe em tudo.
  - `funcionario` — só a tela de orçamento de madeiras. Não consegue ler obras, contratos, boletos nem lançamentos, e isso é bloqueado no banco, não só na tela.
- Conta nova sem configuração vale como `funcionario`. É de propósito: ninguém nasce enxergando tudo por engano.
