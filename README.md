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
6. Pronto — a Vercel te dá um link (tipo `casaseco-custo-obra.vercel.app`). Esse é o link público. Quem abrir só vê a tela de login; sem e-mail e senha não passa dali, e o banco de dados também não entrega nada.

---

## Como usar as telas principais

### Madeira e a distribuidora (Albertina)

A madeira vem toda de uma distribuidora só. Quando você lança madeira numa obra, o campo
**Fornecedor** já vem preenchido com ela — aparece um aviso em verde embaixo do campo
dizendo que foi o sistema que preencheu. Com isso o gasto entra sozinho no **Financeiro**,
em "Fornecedores que mais geram custo", e nos relatórios por fornecedor.

O campo continua editável: se aquela compra foi em outro lugar, é só trocar na hora de
lançar, e o que você digitar à mão o sistema nunca apaga.

O que conta como madeira sai da própria **tabela de madeiras da loja** — os nomes dela
(DECK, ASSOALHO, FORRO, RIPA, TABOA, PRANCHA, EUCALIPTO, MOERÃO...), com ou sem complemento,
e as bitolas soltas (5X10X3M, 10X20X4M...). Mão de obra nunca conta: "MONTAGEM DO DECK"
é serviço, não compra.

Em **Configurações → Madeiras** você pode:
- trocar o nome da distribuidora (ou deixar em branco, e aí o sistema não preenche nada);
- vincular de uma vez os lançamentos de madeira antigos que ficaram sem fornecedor — a tela
  mostra quantos são e quais, e só mexe nos que estão sem fornecedor anotado.

O crediário dos montadores não entra nessa conta: lá não é compra da distribuidora.

### Modo escuro

O site abre no **modo escuro**. Para trocar, use o seletor **Escuro / Claro / Automático**:

- no computador, no rodapé da barra lateral (embaixo, perto de "Senha" e "Sair");
- no celular, dentro do botão **Mais**;
- na tela do funcionário (só orçamento de madeiras), no botãozinho de lua/sol lá em cima.

**Automático** segue o ajuste do próprio aparelho: se o celular entra no modo noturno à
noite, o site acompanha sozinho.

A escolha fica guardada no aparelho, não na conta — dá para deixar o celular escuro e o
computador claro, e cada pessoa da equipe escolhe o seu. Os PDFs (orçamento, contrato,
extrato do crediário, relatórios) continuam sempre claros, que é como se imprime.

Para quem for mexer no código: as cores de todo o sistema saem das variáveis no começo do
`src/index.css` (`:root` é o tema claro, `.dark` é o escuro). Mudar a cara do sistema é
mexer ali, num lugar só.

### Madeiras (antigo "Vender")

O botão que se chamava **Vender** agora se chama **Madeiras** — a tela é a tabela
de preços das madeiras e o orçamento em PDF para o cliente, e por enquanto só
madeira entra ali. No celular ele fica fixo na barra de baixo, logo depois do
Início, para não precisar procurar dentro do "Mais". O **Financeiro** saiu da barra
de baixo e continua no botão **Mais** (é tela de gráfico, melhor no computador).

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

### Iniciar obra — o contrato assina num dia, a obra começa em outro

Cadastrar a obra (ou gerar o contrato) **não** é começar a obra. Por isso a obra nasce
como **AGUARDANDO INÍCIO** e não conta dia nenhum ainda.

No dia em que o pessoal entrar na obra de verdade, abra a obra (ou o cartão dela no
Início) e clique em **Iniciar obra**. Informe a data em que a obra começou — pode ser
hoje, um dia atrás ou uma data já marcada para a semana que vem — e, se quiser, uma
observação. A partir daí a obra passa a mostrar **"X dias de obra"** em todo lugar: no
cartão do Início, no cabeçalho da obra, no resumo final e no PDF.

- Errou a data? **Corrigir data de início**, dentro da obra, ajusta quando quiser.
- Marcou por engano? No mesmo lugar tem **Desfazer início da obra** — a obra volta
  para "aguardando início" e nenhum lançamento é apagado.
- Os filtros do Início agora são **Todas / Aguardando início / Em andamento /
  Concluídas**, cada um com o número de obras do lado. As obras que já existiam antes
  desta novidade aparecem em "Aguardando início" até você informar a data real delas —
  nada foi apagado e o sistema não inventa uma data que ninguém confirmou.

A duração no resumo final e no PDF passa a contar do início real. Quando a obra nunca
teve início registrado, aparece a data do cadastro com a marca `(cadastro)`, para
ninguém confundir uma coisa com a outra.

### Parcelas do contrato — quanto o cliente já pagou e quanto falta

Dentro do contrato, em **Parcelas a receber**, cada parcela mostra o que já foi pago e
o que ainda falta. Tem dois jeitos de lançar:

- **Recebeu tudo de uma vez:** clique no ✓ verde na linha da parcela. Ela fica quitada
  na hora, com a data de hoje.
- **Recebeu só uma parte:** clique em **Receber**. Abre a janela do recebimento, já com
  o valor que falta preenchido — troque pelo valor que o cliente pagou de verdade,
  escolha a data e, se ajudar, escreva de onde veio ("PIX", "entrada em dinheiro").

A parcela recebida pela metade fica com a tarja **PARCIAL** e uma barrinha mostrando o
quanto já entrou. Em cima da lista ficam os três números que interessam: **Total**,
**Recebido** e **Falta receber**, mais a porcentagem recebida e quantas parcelas já
foram quitadas.

Lançou errado? Abra a parcela em **Receber** (ou **Recebimentos**, se já estiver
quitada) e apague o recebimento na lixeirinha — o valor volta a contar como a receber.

Esses números aparecem também na tela da obra (bloco "Contrato e recebimentos"), na
lista de contratos e na exportação **parcelas-a-receber.csv**, que agora traz as
colunas *Valor pago* e *Falta receber*. Os avisos de parcela em atraso passam a somar
só o que falta: se o cliente já pagou metade, só a outra metade está atrasada.

Quem já tinha parcelas marcadas como recebidas antes desta novidade não perde nada —
elas continuam recebidas, valendo pelo valor cheio na data que estava gravada.

### Contas a pagar — a nota que veio com vários boletos

Nota fiscal de distribuidora quase nunca vem com um boleto só. Na aba **Contas >
Registrar** o formulário é o da **nota inteira**:

1. **Escolha a distribuidora uma vez só**, lá em cima. Ela vale para todos os
   boletos daquela nota — não precisa repetir a cada boleto.
2. **Preencha o valor e o vencimento do primeiro boleto.**
3. Clique em **"+ Mais um boleto"** para cada boleto que veio na nota. A linha nova
   já vem com o mesmo valor da anterior e o vencimento 30 dias depois (é o
   30/60/90 de sempre) — se o seu for diferente, é só corrigir na hora.
4. Embaixo aparece a conferência: **quantos boletos e o total da nota**. Confira com
   o papel na mão e clique em **"Registrar 3 boletos"**.

Deu para adicionar uma linha a mais sem querer? Ou ela fica em branco (linha em
branco é ignorada), ou clique no **×** do lado dela.

Depois de registrar, cada boleto vira **uma conta separada** na lista de baixo, com
seu próprio vencimento — some, marque como paga e apague um por um, como sempre. A
distribuidora continua escolhida, porque quase sempre vem outra nota da mesma logo
em seguida.

### Contas > Por dia — o que vence hoje, amanhã e nos próximos dias

Na aba **Contas > Por dia** os boletos aparecem **um dia de cada vez**, começando
por hoje: hoje, amanhã, depois de amanhã, e assim por diante. Cada dia vem com o
**nome da semana na frente** — "Segunda-feira 01/09", "Terça-feira 02/09" — que é
como a semana é falada no dia a dia ("na quinta vence a Albertina").

- Em cima, quatro números: **vence hoje**, **vence amanhã**, **o total do período**
  e **o que já venceu e continua em aberto**.
- Dá para ver **7, 15 ou 30 dias** — o botãozinho fica no canto de cima.
- **Dias sem boleto nenhum aparecem assim mesmo**, escritos "nada vence". Saber que
  na terça não vence nada é informação; sumir com o dia deixaria dúvida. Se preferir
  a lista curta, marque **"Mostrar só os dias que têm boleto"**.
- **Sábado e domingo vêm marcados**, porque boleto que vence no fim de semana quase
  sempre precisa ser resolvido antes.
- O que **já venceu** fica num bloco vermelho em cima, separado dos dias. O dia
  daqueles boletos já passou — misturar com o de hoje esconderia o atraso.
- As contas **já pagas ficam de fora** por padrão; marque **"Mostrar também as já
  pagas"** para conferir o que já foi quitado no período.
- O botão **Paga** funciona direto daí, sem precisar voltar para a lista da aba
  Registrar.

Só entram boletos com vencimento anotado.

### Obras — quanto o cliente já pagou e quanto falta

Cada cartão da lista de obras mostra agora **duas contas separadas**, que nunca se
misturam:

- em cima, em verde grande, o **gasto** da obra (custo: material, mão de obra,
  produtos da loja) e quanto isso representa do orçamento;
- embaixo, **quanto o cliente já pagou** e **quanto falta receber**, com a barra de
  quanto por cento do contrato já entrou e quantas parcelas foram quitadas.

O valor pago sai das **parcelas do contrato** daquela obra. Se alguma parcela está
atrasada, o "falta" aparece em vermelho e o aviso diz quantas. Obra sem contrato
com parcelas mostra "sem contrato com parcelas" — o sistema não inventa recebimento
que ninguém registrou.

### Contrato fechado que ficou sem obra

Ao gerar um contrato, a obra do cliente nasce junto. Se por algum motivo ela não
existir — a obra foi apagada, ou o vínculo se perdeu —, aparece um **aviso amarelo
no topo da tela de Início**, com o nome do cliente e um botão **"Criar obra"**. Um
clique e a obra volta, com cliente, endereço e orçamento vindos do próprio contrato.

Antes esse caso ficava mudo: o contrato guardava o número de uma obra que não
existia mais, o sistema entendia isso como "já tem obra" e nunca mais criava — nem
apertando "Gerar contrato" de novo. Agora a pergunta é "essa obra existe?", então
gerar outra vez também conserta, e apagar uma obra desfaz o vínculo em vez de
deixá-lo pendurado.

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
  - `funcionario` — só a tela de orçamento de madeiras. Não consegue ler obras, contratos, contas nem lançamentos, e isso é bloqueado no banco, não só na tela.
- Conta nova sem configuração vale como `funcionario`. É de propósito: ninguém nasce enxergando tudo por engano.
