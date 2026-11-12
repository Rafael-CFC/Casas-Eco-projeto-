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

### Mão de obra — o que o pedreiro já recebeu

Dentro da obra, a aba **Mão de obra** não é compra de material: ela responde a uma
pergunta só — **quanto o pedreiro já recebeu e quando**. Por isso o formulário tem
três campos e mais nada:

1. **Quem recebeu** — campo de digitar e procurar. Escreva um pedaço do nome e a lista
   filtra; ao lado de cada nome aparece **quanto ele já recebeu nesta obra**, que é o
   número que se quer saber antes de pagar de novo. A lista junta quem já recebeu
   pagamento em qualquer obra e os montadores do crediário. Nome novo? Digite e clique
   em **"Usar este nome"**.
2. **Quanto recebeu (R$)** — o valor pago, direto. Sem quantidade, sem unidade e sem
   preço unitário: antes a tela pedia "5 diárias x R$ 150" e tratava o pedreiro como se
   fosse um produto comprado, com campo de fornecedor e tudo.
3. **Data do pagamento**.

Etapa e observação continuam ali, opcionais ("adiantamento da semana").

A lista embaixo virou um **extrato de pagamentos**: data, quem recebeu e valor pago, com
o total no pé. Pagamento antigo, lançado quando a tela pedia quantidade, continua certo —
o que aparece é o total, que é o que sempre foi somado no Financeiro e no resumo da obra.
Se você abrir um desses para editar, o valor volta pelo total.

Mão de obra também **saiu da tela de Materiais** e do grupo "Materiais comprados" da
busca: pagamento de gente não tem preço médio por unidade nem comparação entre
fornecedores. Procurando o nome do pedreiro na busca, ele agora aparece no grupo
**Mão de obra**, com o total já recebido, e o clique abre a obra já nessa aba.

### Madeira e a distribuidora (Albertina)

A madeira vem toda de uma distribuidora só. Quando você lança madeira numa obra, o campo
**Fornecedor** já vem preenchido com ela — aparece um aviso em verde embaixo do campo
dizendo que foi o sistema que preencheu. Com isso o gasto entra sozinho no **Financeiro**,
em "Fornecedores que mais geram custo", e nos relatórios por fornecedor.

O campo continua editável: se aquela compra foi em outro lugar, é só trocar na hora de
lançar, e o que você digitar à mão o sistema nunca apaga.

O que conta como madeira: **tudo o que for lançado na seção Madeiras da obra** (ver a seção
seguinte) e, nas outras seções, o que o sistema reconhece pela própria **tabela de madeiras
da loja** — os nomes dela (DECK, ASSOALHO, FORRO, RIPA, TABOA, PRANCHA, EUCALIPTO,
MOERÃO...), com ou sem complemento, e as bitolas soltas (5X10X3M, 10X20X4M...). Mão de obra
nunca conta: "MONTAGEM DO DECK" é serviço, não compra.

Em **Configurações → Madeiras** você pode:
- trocar o nome da distribuidora (ou deixar em branco, e aí o sistema não preenche nada);
- vincular de uma vez os lançamentos de madeira antigos que ficaram sem fornecedor — a tela
  mostra quantos são e quais, e só mexe nos que estão sem fornecedor anotado.

O crediário dos montadores não entra nessa conta: lá não é compra da distribuidora.

### Madeiras — a quarta seção da obra

Dentro da obra o gasto é lançado em **quatro seções**: **Mão de obra, Materiais Brutos,
Madeiras e Produtos da Loja**. Madeiras tem seção própria porque é quase sempre o maior
gasto da casa: misturada em "Produtos da Loja" ela inflava o total da loja e escondia o
resto — você olhava "Produtos da Loja" e via, na verdade, madeira.

Na tela da obra são quatro botões (dois em cima e dois embaixo no celular), cada um com o
total daquela seção. A seção aberta decide onde o lançamento entra, tem **orçamento
próprio** e lista só os lançamentos dela.

**A madeira que já estava lançada foi movida sozinha.** Na primeira vez que o sistema abriu
com a seção nova, todo lançamento de madeira que estava em Produtos da Loja (ou em Materiais
Brutos) passou para Madeiras, e um aviso verde disse quantos foram. **Só a seção mudou**:
valor, data, obra, etapa, fornecedor e observação continuam exatamente como estavam, e o
total da obra não se mexe — o dinheiro só trocou de prateleira. O mesmo vale para um backup
antigo que você restaure depois: ele entra e a madeira vai para o lugar certo.

**Na seção Madeiras, tudo que você lançar conta como madeira**, tenha o nome que tiver. Isso
resolve a compra que ninguém sabe nomear ("CARGA DO TELHADO", "RESTO DE MADEIRA"): lançada
ali, ela entra no total de Madeiras e já vem com a distribuidora preenchida.

**E se um item de nome amadeirado não for madeira?** "FORRO PVC" é o caso clássico. Lance
ele na seção que você quer (Produtos da Loja) e pronto: o sistema marca que a escolha foi
sua e **não mexe mais nele** — nem na próxima vez que abrir, nem nos relatórios. É o mesmo
caminho para corrigir um item que a mudança automática levou para Madeiras sem ser: abra o
lançamento no lápis, escolha a seção certa e salve.

Fora da obra, **Madeiras continua sendo um grupo nos relatórios** — Financeiro, Resumo da
obra (tela e PDF), Relatórios, Resumo do mês da home, resumo copiado para o WhatsApp e a
coluna "Categoria" dos CSVs. No Financeiro, a faixa **"Gasto por categoria"** são os quatro
cards (Madeiras, Produtos da Loja, Materiais Brutos e Mão de obra), na mesma ordem todo mês,
e o filtro **Categoria** tem as quatro opções.

**Orçamento por seção:** Madeiras nasce **sem orçamento definido** — ele nunca existiu
separado. Se você usava orçamento de "Produtos da Loja" contando a madeira junto, aquele
número agora é só da loja; defina o de Madeiras pelo botão "Definir orçamento para
Madeiras" na tela da obra.

**O catálogo da loja não mudou.** Produto de madeira que estava cadastrado no Catálogo
continua lá — o que mudou foi a seção em que o gasto da obra aparece.

### Lançar ficou rápido (e o que mudou na tela)

Lançar produto dentro da obra travava: a tela demorava a responder a cada letra digitada e o
item custava a aparecer depois do clique. Medimos com o catálogo do tamanho do seu (três mil
produtos) e mil e quinhentos lançamentos, num celular mediano:

| | antes | agora |
| :--- | ---: | ---: |
| cada letra digitada | ~400 ms | **~90 ms** |
| abrir a lista de produtos (1ª letra) | ~2,5 s | **~0,15 s** |
| do clique em Lançar até o item na tela | ~2,1 s | **~0,47 s** |
| dados enviados ao lançar de novo o mesmo item | 1 MB | **344 KB** |

As três causas eram estas, e o que mudou:

1. **A lista de produtos desenhava o catálogo inteiro.** Três mil linhas na tela a cada
   letra. Agora ela **mostra 60 por vez** e avisa embaixo: *"Mostrando 60 de 3.000 — digite
   mais do nome para achar o resto"*. Na prática não muda nada para quem usa: ninguém rola
   três mil linhas, quem procura digita.
2. **Digitar no formulário atualizava a tela inteira** (a lista de obras, os cartões, a
   tabela). Agora o formulário de lançamento é uma peça separada: digitar nele não mexe no
   resto da tela.
3. **O item só aparecia depois que o catálogo inteiro subia para o banco.** Eram duas
   gravações em fila, quase 700 KB na frente. Agora as duas vão juntas, e o item aparece na
   hora. E quando você lança de novo o mesmo produto **pelo mesmo preço**, o catálogo nem é
   regravado — não mudou nada nele.

Nada disso muda o que é salvo: os lançamentos, os preços e o histórico continuam iguais.

### O sistema reconhece o que você está lançando

Ao digitar o item na obra, aparece uma linha discreta embaixo do campo:

```
● Cimento · SC · material · já lançado 3×          trocar
  última compra R$ 45,50 em 02/10/2026 · ALBERTINA (+20% desde a primeira)
```

O que ela diz: a **categoria** reconhecida, a **unidade** sugerida (que já entra no campo),
se é **material ou serviço**, e **quanto você pagou da última vez** — com o aviso quando o
preço subiu. A bolinha é a confiança: **verde** o sistema tem certeza, **âmbar** achou
parecido, **cinza** não sabe.

**Quem responde, nesta ordem:**

1. **o que você já corrigiu** — sua correção vale mais que qualquer regra;
2. **o que você já lançou** com esse nome — se a areia sempre foi em CARRADA, continua em
   CARRADA, mesmo que a regra diga M³;
3. **a lista de palavras do sistema** — cimento, areia, brita, tijolo, telha, fio, tubo,
   madeira, prego, tinta, piso, porta, diesel, aluguel de equipamento, projeto, frete, e as
   profissões (pedreiro, servente, eletricista…);
4. **nada**: aí ele diz *"não reconheci este item"* e pede para você escolher.

**Ele aprende.** Clicando em **"trocar"** (ou **"escolher"**) você define a categoria certa.
Daí em diante aquele nome entra certo sozinho — e a linha passa a dizer *"você ensinou"*.
Nenhuma sugestão trava nada: todo campo continua editável.

Nada disso chama internet nem custa nada: é lista de palavras e o seu próprio histórico.

### Catálogo: o mesmo produto, em todas as obras

Na tela do **Catálogo**, clicando no nome do produto abre a ficha dele:

- **quanto custou em cada compra**, com data, obra e fornecedor;
- **última, média, menor e maior**, e quanto subiu ou caiu desde a primeira compra;
- **em que obras foi usado**, com quantidade e valor em cada uma;
- **favorito** (a estrela), para achar rápido o que se compra sempre.

A ficha junta o que está no cadastro com o que só existe nos lançamentos — areia, madeira,
material bruto digitado na mão. Pagamento de pedreiro não entra: não é item de catálogo.

**Produtos repetidos:** no alto da tela aparece um aviso quando dois nomes podem ser o mesmo
item ("CIMENTO CP-II 50KG" e "CIMENTO CPII 50 KG"). O sistema **nunca junta sozinho** — mostra
o par e você decide, porque juntar errado estraga preço e histórico. E ele **não acusa** coisas
diferentes de nome parecido: "TUBO PVC 100MM" e "TUBO PVC 50MM" nunca são apontados como
repetidos, porque os números não batem.

### Assistente Casas Eco — perguntar e receber o número

Tem uma área nova, **Assistente**, onde você pergunta em português e recebe a resposta com
os números das suas obras:

- *Quanto gastamos na obra do João?* → o total, quanto é do orçamento, e a quebra por
  categoria.
- *Qual categoria está consumindo mais dinheiro?* → a maior, com a fatia que ela
  representa e as outras embaixo.
- *Quais os materiais mais comprados neste mês?*
- *Qual obra está acima do orçamento?* e *qual tem risco de estourar?* (risco = passou de
  80% sem estar concluída).
- *Quanto gastamos com mão de obra?* → o total e quanto cada pessoa recebeu.
- *Preço médio do cimento* → média, última compra, e quanto subiu desde a primeira.
- *Quais materiais aumentaram de preço?*
- *Compare as obras finalizadas.*
- *Quanto tenho de contas a pagar?* → total, quantos boletos e quantos já venceram.

Dá para escrever do seu jeito ("quanto gastei na obra da Maria em março") — ele entende o
nome da obra, o mês e o produto citado.

**Ele não inventa.** Toda resposta é uma conta feita em cima dos seus lançamentos. Quando
não dá para responder, ele diz: *"Não achei essa obra pelo nome"*, *"Não entendi a
pergunta"*, *"Nenhuma obra tem orçamento definido"*. Nunca sai um número chutado.

Por baixo, entender a pergunta e calcular a resposta são duas coisas separadas. Hoje quem
entende é uma lista de palavras, e isso roda no próprio celular, sem internet e sem custo.
Se um dia ligarmos uma IA de verdade, ela entra **só na parte de entender** — a conta
continua sendo feita com os dados reais, que é o que garante que o número está certo.

### Colar lista — a compra inteira de uma vez

A listagem da madeireira vem com seis, dez, vinte linhas. Digitar item por item é onde o
tempo se perde e onde o número sai errado. Na tela da obra, do lado do botão de lançar,
tem **"Colar lista"**.

1. **Cole o texto do jeito que ele veio** — copiado da nota em PDF, do WhatsApp do vendedor
   ou digitado na mão. Uma linha por item. Clique em **"Ler lista"**.
2. O sistema separa **nome, quantidade, unidade e valor** de cada linha e mostra tudo numa
   lista de conferência. Cabeçalho, total, vendedor e forma de pagamento ele pula sozinho —
   e diz quantas linhas pulou, com um "ver quais" para você conferir que não sumiu nada seu.
3. **Em cima ficam a data, a distribuidora, a etapa e a observação**, valendo para a lista
   inteira: é uma compra só, não precisa repetir em cada item.
4. Confira, desmarque o que não quer, corrija o que o sistema leu torto — **todo campo é
   editável** — e clique em **"Lançar 6 itens"**. Entram todos de uma vez, na seção que
   estiver aberta.

**Os formatos que ele entende.** Os dois que aparecem na prática:

```
000350  EUCALIPTO ROLIÇO AUTOCLAVADO 18A22 3,00 MT  UN  5,00  90,00  0,00  450,00
5 eucalipto 18a22 3m 90,00
```

Na linha da nota impressa ele sabe que a primeira coluna é o **código do produto** (e joga
fora), que `UN` é a **unidade**, e que `5,00 90,00 ... 450,00` são quantidade, valor de cada
um e total — **e confere a multiplicação**: 5 × 90 = 450. Quando não fecha, a linha vem com
aviso em vez de entrar calada. Na linha escrita na mão, o número da frente é a quantidade. O
tamanho da peça ("3,00 MT") **continua no nome**, que é onde ele faz falta.

**A conferência da lista toda.** Quando o texto traz o total ("Valor dos produtos:
5.914,00"), o sistema compara com a soma do que leu e diz se bate. Lista que não fecha é
lista que foi lida errado — ou que tem desconto.

**Desconto:** se a lista traz um ("Valor descontos: 294,00"), ele avisa. Os itens entram
pelo **preço cheio**, porque o lançamento é quantidade × valor e não existe campo de
desconto — vale anotar na observação ("venda 15592, desconto de R$ 294,00"), que fica em
todos os itens daquela compra.

**Atenção à distribuidora:** na seção Madeiras o campo já vem com a distribuidora de sempre
(a das Configurações). Se a compra foi em outra — a Cargnin, por exemplo —, troque antes de
lançar, senão o gasto entra no nome errado no Financeiro.

Vale para Madeiras, Materiais Brutos e Produtos da Loja. Em Produtos da Loja os itens também
**entram no catálogo** sozinhos, como no lançamento de um item só. Mão de obra não tem o
botão: lá o lançamento é um pagamento (quem recebeu e quanto), não uma lista de compra.

### Ler nota — a nota inteira, e o aviso de nota repetida

Do lado de "Colar lista" tem agora **"Ler nota"**. É a mesma tela de conferência, só que
lendo a nota **inteira** em vez de só a lista de itens: ela tira do texto o **fornecedor**, a
**data de emissão**, o **número da nota/venda** e o **CNPJ**, além dos itens.

1. Cole o texto da nota — do e-mail da distribuidora, do PDF, do WhatsApp do vendedor — e
   clique em **"Ler nota"**.
2. Em cima aparece um quadro com o que a nota diz de si mesma: `Nota: nº 15592 · CNPJ
   01887828000176`, `Emissão: 23/10/2026`, `Fornecedor: MADEIREIRA IRMAOS CARGNIN LTDA`.
   Campo que ele **não** achou aparece dizendo isso — "data não encontrada", "número não
   encontrado" — em vez de vir com um palpite.
3. **A data e a distribuidora já vêm preenchidas** com o que a nota diz, e o número vai para
   a observação (`nota 15592`). Tudo editável, como sempre.
4. Confira e lance. Daí para frente os itens dessa compra ficam marcados com o número da
   nota.

**A distribuidora não vira duas.** A nota traz a razão social inteira ("MADEIREIRA IRMAOS
CARGNIN LTDA") e no seu sistema ela já existe como "MADEIREIRA CARGNIN". O sistema reconhece
que é a mesma e usa o nome que você já usa — senão o histórico da empresa racharia em dois.
A regra é estreita de propósito: "DEPOSITO SAO PEDRO" **não** casa com "DEPOSITO SAO JOSE".

**O aviso de nota repetida.** Lançar a mesma nota duas vezes dobra o gasto da obra, e é um
erro fácil de cometer (a nota chega no WhatsApp e depois em papel). Ao ler uma nota, o
sistema procura nos lançamentos e avisa:

- **Vermelho — "essa nota parece já estar lançada"**: o número da nota já aparece em
  lançamentos seus, ou já existe uma compra daquele fornecedor **no mesmo dia e com o mesmo
  total**.
- **Amarelo — "confira antes"**: mesma distribuidora e mesmo total, em data próxima (até 3
  dias). Aí pode ser outra compra de valor igual — o sistema avisa e deixa você decidir, em
  vez de barrar.

O aviso não impede o lançamento: quem decide é você.

### Ler a nota pela foto (precisa ser ligado)

O botão **"Tirar foto da nota"** existe na tela, e hoje ele vem **desligado**, dizendo o que
falta. Isso é de propósito, por dois motivos.

**Primeiro: a leitura de foto feita dentro do navegador não serve para dinheiro.** Testei
com as suas duas fotos reais. Na nota de papel da Cargnin a leitura saiu com 65% de
confiança e errou justamente os números: `4.104,00` virou `104,00`, `15592` virou `45592`,
`5.914,00` virou `917400`. Na foto da tela do PDV foi pior — 38% de confiança, a maioria dos
valores embaralhada. Um nome lido torto você corrige na conferência; um valor lido torto
entra no custo da obra parecendo certo. Então essa leitura **não foi para o sistema**.

**Segundo: a chave da IA não pode ficar no site.** O site é uma página aberta — qualquer
chave escrita nele fica à vista de quem abrir o código no navegador, e a fatura chega para
você. Por isso o site não fala com a IA direto: ele fala com um endereço **nosso**, onde a
chave fica do lado do servidor. Esse endereço já está escrito no repositório, em
`supabase/functions/ler-nota`, com o passo a passo no começo do arquivo:

1. `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...` (a chave fica **no servidor**);
2. `supabase functions deploy ler-nota`;
3. na Vercel, criar `VITE_IA_ENDPOINT = https://<projeto>.supabase.co/functions/v1/ler-nota`.

Enquanto o passo 3 não existir, o botão continua explicando que falta configurar — e colar o
texto segue funcionando.

**Quando ligado, o modelo só transcreve.** Ele devolve o texto do papel; quem separa os
itens, confere a multiplicação de cada linha e compara a soma com o total continua sendo o
código do sistema, o mesmo do "Colar lista". O modelo não decide número nenhum. Dígito que
ele não conseguir ler vem como `?`, para você ver e corrigir.

**O custo fica controlado:** só quem está logado consegue chamar (o crachá da sessão vai na
chamada e o Supabase confere antes), foto acima de 6 MB é recusada antes de virar gasto, a
espera tem limite de 45 segundos, e o esforço do modelo fica no mínimo — transcrever não
precisa de raciocínio longo, e é aí que o preço cresce. Cada leitura devolve quanto gastou.

### No celular — a tela presa no lugar

O sistema é usado principalmente no celular, e a tela **se ajeitava sozinha**: aproximava
ao tocar num campo, afastava ao abrir Contas, pulava ao rolar. Eram quatro coisas
diferentes, todas resolvidas:

- **Tocar num campo não dá mais zoom.** O iPhone aproximava a página sempre que o dedo
  tocava num campo com letra menor que 16px — e não voltava sozinho depois. Agora, **no
  celular**, todo campo do sistema tem letra de 16px, que é o tamanho que o aparelho
  aceita sem mexer na tela. No computador continua do tamanho de antes, porque lá o
  problema não existe.
- **A tela de Contas não afasta mais.** As cinco abas (Por dia, Registrar, Importar XML,
  Fixas do mês, Relatório) não cabiam numa linha só: a página inteira esticava para caber
  e o navegador respondia afastando tudo. Agora elas **quebram em duas linhas** e cada uma
  continua inteira, sem rolagem lateral escondendo as últimas.
- **Tocar duas vezes num botão não aproxima mais a tela**, e o botão responde na hora (o
  navegador esperava um terceiro de segundo para ver se vinha um segundo toque).
- **A altura acompanha a barra do navegador.** Quando ela some ao rolar, a tela não
  escorrega mais atrás dela.

Também sumiram dois incômodos menores: o quadrado cinza que piscava em cima de tudo que
era tocado, e a cor de "mouse em cima" que ficava **grudada** no botão depois do toque,
como se ele tivesse travado.

**O que mudou de hábito:** puxar a lista para baixo **não recarrega mais o site**. Isso era
o que fazia a tela esticar e voltar, e recarregar sem querer no meio de um lançamento é
perder o que estava na tela. Para forçar uma atualização (depois de uma mudança nova, por
exemplo), use o **botão de recarregar do próprio navegador**, ou feche e abra a aba.

O zoom com dois dedos continua funcionando normalmente — quem precisa aumentar para
enxergar melhor continua podendo.

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

   O campo é de **digitar e procurar**: escreva um pedaço do nome ("dou" acha
   "DOUTORA MADEIRAS") e a lista filtra na hora, sem acento e sem caixa alta para
   atrapalhar. Clicando na setinha, ela abre inteira, em ordem alfabética, com a
   contagem embaixo ("38 distribuidoras cadastradas") — assim dá para ver que
   nenhuma ficou de fora. Antes era uma lista fixa na ordem de cadastro: com o
   cadastro grande, achar uma distribuidora no meio dela virava rolagem no escuro
   e parecia que ela tinha sumido.

   A lista não é só o cadastro de fornecedores: entra também **quem já cobrou um
   boleto, quem está nas contas fixas e quem foi digitado num lançamento de obra**.
   Nome que ficou só na conta — boleto antigo, dado que voltou de um backup — antes
   não aparecia aqui.

   Distribuidora nova? Digite o nome e clique em **"Cadastrar nova"**: ela entra no
   cadastro sozinha quando os boletos são gravados.

2. **Preencha o valor e o vencimento do primeiro boleto.**
3. Clique em **"+ Mais um boleto"** para cada boleto que veio na nota. A linha nova
   já vem com o mesmo valor da anterior e o vencimento **dez dias depois**. Dez porque
   prazo curto é o que mais aparece — 10/20/30, quinzena, uma semana. Se o seu for
   outro, corrija a data ali mesmo.

   **Da terceira linha em diante o sistema copia o espaçamento que você usou.** Mudou
   o segundo boleto para sete dias depois do primeiro? O terceiro nasce sete dias
   depois do segundo, e assim por diante. Você acerta a data **uma vez** e o resto da
   nota sai no mesmo passo, sem voltar o calendário a cada linha.

   Antes a sugestão era sempre o mês seguinte. Para a nota de 30/60/90 estava certo,
   mas na maioria das notas o prazo é menor, e aí era preciso voltar o mês em cada
   boleto — que é justamente onde se erra a data.

   **O 30/60/90 continua funcionando igual:** basta pôr o segundo boleto no mesmo dia
   do mês seguinte, e o sistema entende que a nota é mensal — o terceiro cai no mesmo
   dia do mês seguinte, não "31 dias depois" (que iria escorregando um dia a cada
   linha). Quando o dia não existe no mês (dia 31 em fevereiro), a data cai no
   **último dia daquele mês** e volta para o dia certo no mês seguinte: 31/12, 31/01,
   28/02, 31/03, 30/04.
4. Embaixo aparece a conferência: **quantos boletos e o total da nota**. Confira com
   o papel na mão e clique em **"Registrar 3 boletos"**.

Deu para adicionar uma linha a mais sem querer? Ou ela fica em branco (linha em
branco é ignorada), ou clique no **×** do lado dela.

Depois de registrar, cada boleto vira **uma conta separada** na lista de baixo, com
seu próprio vencimento — some, marque como paga e apague um por um, como sempre. A
distribuidora continua escolhida, porque quase sempre vem outra nota da mesma logo
em seguida.

### Contas > Importar XML — os boletos direto da nota fiscal

Toda NF-e traz, **dentro do próprio arquivo XML**, a lista dos boletos daquela nota:
número, vencimento e valor de cada um. É a mesma coisa que estava sendo digitada à
mão na aba **Registrar**. Nesta aba o sistema lê o arquivo e monta a lista sozinho —
você só confere e lança.

**De onde vem o XML.** Do e-mail que a distribuidora manda junto com a nota, do portal
dela ou do WhatsApp do vendedor. É o arquivo terminado em `.xml` (o PDF da DANFE não
serve: ele é a foto da nota, não os dados dela). Veio dentro de um `.zip`? Descompacte
e escolha os `.xml` de dentro.

**Como usar:**

1. Abra **Contas > Importar XML** e clique em **"Escolher arquivos"**. Pode marcar
   vários de uma vez — no computador também dá para arrastar os arquivos para cima do
   quadro.
2. Cada nota vira um card: a distribuidora (tirada do emitente da nota), o número da
   nota, a data de emissão, o CNPJ e o valor total. Embaixo, um boleto por linha, já
   marcado.
3. **Confira e desmarque o que não for pagar** — nota devolvida, boleto que já foi
   acertado no pix. Só entra nas contas o que ficar marcado.
4. Clique em **"Lançar 3 boletos"**. Eles viram contas a pagar normais, uma por boleto,
   e aparecem na agenda **Por dia** como qualquer outra.

A distribuidora vem do XML, mas **casa com quem você já tem cadastrado**: se a nota diz
"ALBERTINA MADEIRAS LTDA" e no sistema já existe "Albertina Madeiras Ltda", os boletos
entram na que já existe, sem criar uma segunda Albertina. Nome que ainda não existe é
cadastrado na hora de lançar. E dá para trocar a distribuidora no card antes de lançar,
com o mesmo campo de busca da aba Registrar.

**O que o sistema confere antes de deixar lançar:**

* **Boleto que já foi lançado por aqui** aparece apagado, com a marca "já lançado", e
  não pode ser marcado de novo. Cada conta guarda a chave da nota e o número da
  duplicata de onde veio — é assim que o mesmo XML, escolhido de novo, não vira boleto
  em dobro.
* **Boleto igual digitado à mão** (mesma distribuidora, mesmo valor, mesmo dia) ganha o
  aviso "já existe igual". Só avisa, não bloqueia: duas parcelas iguais no mesmo dia
  existem de verdade.
* **Nota cancelada ou não autorizada** pela SEFAZ entra **desmarcada**, com o aviso em
  vermelho. Nota cancelada não gera boleto para pagar.
* **Nota emitida pela própria Casas Eco** (o CNPJ do emitente é o da empresa, que está
  em Configurações) entra desmarcada: aquilo é venda sua, dinheiro a **receber** —
  lançar ali criaria uma dívida que não existe.
* **Boletos que não somam o valor da nota** — costuma ser entrada paga na hora,
  desconto ou frete cobrado à parte. O aviso mostra as duas somas para você conferir.
* **Nota à vista**, sem boleto nenhum no XML, aparece com o aviso e sem linha para
  marcar.
* **Boleto sem data no XML** (acontece) vem com o campo de vencimento em branco: preencha
  ali mesmo e ele libera para marcar.

Arquivo que não dá para ler — XML pela metade, XML de evento (cancelamento, carta de
correção), cupom fiscal — vira uma linha de aviso no alto, e os outros arquivos da leva
continuam valendo.

**E baixar o XML sozinho, direto da Receita?** Isso o sistema não faz, e é de propósito.
Baixar nota na SEFAZ exige o **certificado digital da empresa (e-CNPJ)** em cada consulta
— e certificado guardado dentro de um site é certificado na mão de quem abrir o site.
Para buscar automático seria preciso um servidor separado, só para isso, guardando o
certificado e consultando a SEFAZ de tempos em tempos. Dá para fazer um dia; hoje o
arquivo chega pelo e-mail da distribuidora e entra por aqui, e o trabalho que sobrou é
conferir, não digitar.

### Contas > Fixas do mês — o que vence todo mês

Energia, água, aluguel, internet, salário: conta que vence todo mês, sempre no mesmo
dia. Antes era preciso digitar tudo de novo a cada mês. Agora você cadastra **uma vez**
e o sistema lembra.

**Cadastrar.** Aba **Contas > Fixas do mês**, botão **"Nova conta fixa"**:

- **Nome da conta** — ENERGIA ELÉTRICA, ALUGUEL DO GALPÃO.
- **Quem cobra** (opcional) — CEMIG, o nome do dono do galpão. Sai da mesma lista dos
  fornecedores. Deixando em branco, a conta aparece pelo próprio nome.
- **Valor de sempre** — é só o valor sugerido, para adiantar a digitação.
- **Dia do vencimento** — de 1 a 31.
- **Observação** (opcional) — "débito em conta no Sicoob", por exemplo.

**Dia 31 em mês que não tem 31** (fevereiro, abril, junho, setembro, novembro) cai no
último dia do mês, nunca no dia 1º do mês seguinte.

**Lançar.** Em cima fica o quadro do mês, com o que já foi lançado e o que ainda falta,
na ordem em que o dinheiro sai. Duas formas:

- **Uma de cada vez** (botão **Lançar** na linha): o sistema pergunta quanto veio, já
  com o valor de sempre preenchido. É o jeito da energia e da água, que mudam todo mês —
  você está com a fatura na mão, corrige o valor e confirma.
- **Todas de uma vez** (botão **"Lançar as N de setembro"**): entra tudo pelo valor de
  sempre. Serve para o mês em que nada mudou; o que veio diferente você corrige depois,
  na lista de contas.

O boleto lançado vira uma **conta a pagar normal**: aparece em Por dia, no Relatório,
nos avisos de vencimento e nos totais. Some, marque como paga e apague como qualquer
outra.

**Nada é lançado sozinho.** O sistema mostra o que falta e espera você confirmar — valor
de energia muda todo mês, e um número que ninguém conferiu erraria o total a pagar, que
é justamente o que você usa para se organizar. Enquanto houver conta fixa do mês sem
lançar, aparece um **aviso amarelo na tela de Início** dizendo quantas são e quanto dá.

**Pausar e apagar** mexem só no cadastro — os boletos já lançados continuam nas contas a
pagar. Pausar (botão de pause) serve para a conta que parou por um tempo e ainda vai
voltar; apagar tira de vez.

**Setas ‹ ›** em cima do quadro andam para o mês anterior e para o próximo, para
conferir o que já foi lançado ou adiantar o mês que vem.

O total de todas as contas fixas ativas aparece como **"Custo fixo do mês"** — é o que
sai mesmo num mês sem obra nenhuma.

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

### Obra — procurar um material e ver quanto foi gasto nele

Dentro da obra, a busca acima da lista de lançamentos agora **soma no pé da
lista** tudo o que ela achou. Digite `prego` e a última linha responde de uma vez:

```
Total de "prego" · 7 lançamentos     30 UN     média R$ 17,18     R$ 515,32
```

- **quanto de dinheiro** foi embora naquilo (a coluna Total);
- **quanto foi comprado**, somado por unidade;
- a **média por unidade** — o dinheiro dividido pela quantidade.

Sem nada digitado, a linha vira o **total da categoria** inteira.

Três cuidados para o número não mentir:

- **Quantidade não vira um número só.** Se a busca pegou coisas medidas de jeitos
  diferentes, aparece `30 UN · 20 SC` em vez de um "50" que não quer dizer nada.
- **A média só aparece quando a unidade é uma só.** Dividir dinheiro por unidades
  misturadas daria um número com cara de verdade e sem significado.
- **O total é só da categoria aberta.** Se o mesmo termo também apareceu em outra
  categoria da obra, uma linha amarela avisa quantos lançamentos são e quanto
  somam — assim ninguém lê "R$ 515,32" como tudo o que a obra gastou de prego.

A busca também passou a ignorar acento e a aceitar as palavras em qualquer ordem,
igual à do Catálogo: `cabeca dupla` acha `PREGO POLIDO 17X27 CABEÇA DUPLA`.

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
