// TEXTO REAL do contrato e do memorial da Casas Eco, transcrito dos
// documentos usados hoje pela empresa. É este o modelo que sai no PDF.
//
// Os trechos que mudam de obra para obra estão marcados com {{...}} e são
// preenchidos pelo formulário. Todo o resto é fixo e sai igual em todos os
// contratos — que é exatamente como a empresa trabalha.
//
// Cada bloco tem:
//   chave    – identificador interno
//   rotulo   – nome do bloco na tela de edição
//   texto    – o conteúdo (com os marcadores)
//   variavel – true quando o bloco contém algo que muda por obra
//
// Trecho entre ** ** sai em NEGRITO no PDF e na tela — é assim que o
// documento original destaca a razão social, o CNPJ e o nome/CPF das
// partes.

export const BLOCOS_CONTRATO = [
  {
    chave: 'partes',
    rotulo: 'Abertura — identificação das partes',
    variavel: true,
    texto:
`Pelo presente instrumento particular de compra e venda, de um lado como **CONTRATADA**: a empresa **{{CONTRATADA_RAZAO_SOCIAL}}**
**CNPJ {{CONTRATADA_CNPJ}}** com sede {{CONTRATADA_ENDERECO}} neste ato representado pelo procurador **{{CONTRATADA_REPRESENTANTE}} CPF {{CONTRATADA_CPF}}**; e de outro lado como **CONTRATANTE {{CLIENTE_NOME}} CPF {{CLIENTE_CPF}} endereço : {{CLIENTE_ENDERECO}} .**`,
  },
  {
    chave: 'clausula_primeira',
    rotulo: 'CLÁUSULA PRIMEIRA — objeto (descrição da casa)',
    variavel: true,
    texto:
`CLAUSULA PRIMEIRA: O objeto do presente contrato é {{DESCRICAO_OBRA}} conforme projeto assinado pelas partes. Sistema construtivo de painel pregado com paredes de 2,2cm externa duplada em forro interno, acordo com proposta de negócio apresentada no projeto, previamente acordado e em anexo devidamente assinado pelas partes contratantes o qual passa a fazer parte integrante do presente contrato, ficando a ele vinculado para todos os efeitos legais e jurídicos.`,
  },
  {
    chave: 'paragrafo_primeiro',
    rotulo: 'Parágrafo Primeiro — início e prazo da obra',
    variavel: true,
    texto:
`Parágrafo Primeiro: A obra está programada para iniciar {{INICIO_OBRA}} ou assim que sair o alvará de obras , entrega das madeiras está programada para até 20 dias do início da obra ou quando se fizer necessario. Prazo de entrega da obra {{PRAZO_ENTREGA}} dias após o início. (poderá ser descontados desse prazo os dias de chuva).`,
  },
  {
    chave: 'paragrafo_segundo_p1',
    rotulo: 'Parágrafo Segundo — alteração de materiais',
    variavel: false,
    texto:
`Parágrafo Segundo: Fica estabelecido que qualquer alteração de materiais a serem utilizados, não poderá ser realizada sem antes consulta à CONTRATADA até a entrega das madeiras. Fica proibido a empreita de serviços extras direto com o prestador de serviço sob pena de perda da garantia de serviços prestados.`,
  },
  {
    chave: 'clausula_segunda',
    rotulo: 'CLÁUSULA SEGUNDA — valor total',
    variavel: true,
    texto:
`CLÁUSULA SEGUNDA: Pelo objeto do presente contrato o CONTRATANTE pagará à CONTRATADA, a quantia previamente acertada de {{VALOR_TOTAL}} ({{VALOR_TOTAL_EXTENSO}}) pelas casa.`,
  },
  {
    chave: 'itens_inclusos',
    rotulo: 'O que está incluso (lista com marcadores)',
    variavel: false,
    lista: true,
    texto:
`Fundação em bloco estrutural com sapatas e ferragens armadas, alvenaria com tijolos 9 furos, e reboco liso. Kit madeira que consiste em: estrutura de 5x10, paredes 22mm com manta termica, cinta mentos, vigas, barrotes, forros, meia-cana, rodapés, portas em madeira, caixilhos, e quaisquer outras madeiras necessárias para a execução do corpo da casa. O kit será preparado conforme o projeto anexado e memorial descritivo, aberturas em madeira de eucalipto vermelho linha prime conforme projeto. Telhas de barro.
Mão de Obra completa da execução da casa conforme o projeto
Acabamentos em geral`,
  },
  {
    chave: 'tabela_parcelas',
    rotulo: 'Tabela de parcelas',
    variavel: true,
    tabelaParcelas: true,
    texto: '{{TABELA_PARCELAS}}',
  },
  {
    chave: 'obs_pagamento',
    rotulo: 'Observação — forma de pagamento e dados bancários',
    variavel: false,
    texto:
`Obs.: Os pagamentos poderão ser feitos através de crédito bancário na conta da CONTRATADA na agência:3074, conta corrente 1461508 sicoob via chave pix casasecomt@gmail.com ou de outra forma contra recibo emitido pela CONTRATADA.`,
  },
  {
    chave: 'paragrafo_alvara',
    rotulo: 'Parágrafo segundo — suspensão por aprovação de alvará',
    variavel: false,
    texto:
`Paragrafo segundo – Suspensao por aprovação de alvará : Caso a obra dependa de aprovação de alvará de projeto e/ou expedição de alvará de construção junto ao órgão municipal competente , o prazo previsto no paragrafo primeiro somente terá inicio após a liberação do alvará e liberação formal para inicio da obra .O período compreendido entre assinatura do contrato e a expedição do alvará não sera computado no prazo contratual de execução, não gerando ônus ou penalidades a contratada. As partes reconhecem que aprovação de projetos perante ao poder publico e ato administrativo de competência exclusiva do órgão municipal , fora do controle da contratada .`,
  },
  {
    chave: 'paragrafo_alteracao_materiais',
    rotulo: 'Parágrafo terceiro — alteração de materiais',
    variavel: false,
    texto:
`Paragrafo terceiro – Alteraçao de materiais :Qualquer alteração de materiais especificados no projeto e memorial descritivo somente poderá ser realizado mediante acordo por escrito entre as partes , ate a data de entrega do kit madeiras . Alteraçoes solicitadas após esse prazo poderão implicar em acréscimo de prazo e/ou valor a ser nogociados entre as partes formalizados por aditivos contratual.`,
  },
  {
    chave: 'paragrafo_reajuste',
    rotulo: 'Parágrafo quarto — reajuste anual (INCC-M)',
    variavel: false,
    texto:
`Paragrafo quarto – O valor contratual sera reajustado anualmente , caso a obra ultrapasse 12 (doze) meses por qualquer motivo alheio a vontade da contratada, com base na variação do índice nacional da construção civil (INCC-M),apurado e divulgado pela Fundaçao Getulio Vargas (FGV), ou pelo índice oficial que vier a substitui-lo. O reajuste incidira sobre o saldo devedor remanescente.`,
  },
  {
    chave: 'variacao_extraordinaria',
    rotulo: 'Variação extraordinária de materiais',
    variavel: false,
    texto:
`Variaçao extraordinária de materiais : Caso haja variação superior a 10%(dez por cento)no custo de quaisquer materiais essenciais ao objeto contratual (kit madeiras, aberturas,materiais em geral e congêneres)devida mente comprovadas por notas fiscais,tabela de fornecedores ou índice setorial oficial (por ex., cub/sinduscon/sinapi ou incc),em relação aos preços vigentes na data de assinatura deste contrato, a contratada terá direito ao reequilíbrio econômico financeiro do contrato, proporcional ao impacto verificado no custo total da obra .`,
  },
  {
    chave: 'procedimento_reequilibrio',
    rotulo: 'Procedimento para reequilíbrio',
    variavel: false,
    texto:
`Procedimento para reequilíbrio: A contratada notificara o contratante por escrito, apresentando demonstrativo fundamentado da variação de custos. As partes terão prazo de 15(quinze) dias para negociar e formalizar o reequilíbrio por meio de aditivo contratual.`,
  },
  {
    chave: 'vistoria',
    rotulo: 'Vistoria da obra',
    variavel: false,
    texto:
`O CONTRATANTE deverá vistoriá-la, verificando a regularidade e o funcionamento de todos os seus itens e equipamentos, de acordo com o descrito no projeto da obra, declinado na cláusula primeira.`,
  },
  {
    chave: 'clausula_quarta',
    rotulo: 'CLÁUSULA QUARTA — responsabilidade pelos materiais',
    variavel: false,
    texto:
`CLÁUSULA QUARTA: A CONTRATADA fica responsável pela quantidade e regularidade dos materiais que compõe o bem objeto deste contrato, cabendo ao CONTRATANTE indicar quaisquer irregularidades ou vícios verificados nos mesmos, devendo fazê-lo até cento e cinquenta dias a contar da data de assinatura do Termo de Entrega e Recebimento da Obra, de acordo com o que dispõe no Artigo 26, inciso da lei 8.8079/90 do Código de Defesa do Consumidor.`,
  },
  {
    chave: 'clausula_quinta',
    rotulo: 'CLÁUSULA QUINTA — manutenção das pinturas',
    variavel: false,
    texto:
`CLÁUSULA QUINTA: Fica o CONTRATANTE responsável pela manutenção das pinturas da obra, com material adequado, toda vez que se fizer necessário, dependendo das condições climáticas do local da obra, ou a cada dois anos no máximo.`,
  },
  {
    chave: 'clausula_sexta',
    rotulo: 'CLÁUSULA SEXTA — desistência do negócio',
    variavel: false,
    texto:
`CLÁUSULA SEXTA: Caso o CONTRATANTE por qualquer motivo que seja desistir do negócio antes do pagamento integral do valor ajustado na cláusula segunda retro, e o material de madeira, portas e janelas já estejam preparados, perderá em favor da CONTRATADA o total da importância que já lhe tiver sido paga, sem direito a qualquer indenização, ficando a CONTRATADA totalmente desobrigada de lhe entregar o material objeto do presente ajuste, tendo em vista a desistência unilateral do CONTRATANTE. Ficando a CONTRATADA obrigada as mesma penalidades caso desista do contrato.`,
  },
  {
    chave: 'clausula_setima',
    rotulo: 'CLÁUSULA SÉTIMA — prazo de pagamento',
    variavel: false,
    texto:
`CLÁUSULA SÉTIMA ; os pagamentos deverão ser realizados no máximo em 48 hs após o término de cada parcela .
Obs: no caso de pagamentos em cheque, a quitação total da obra ou de suas respectivas etapas, se dão na compensação total dos mesmos.`,
  },
  {
    chave: 'clausula_oitava',
    rotulo: 'CLÁUSULA OITAVA — garantia',
    variavel: false,
    texto:
`CLÁUSULA OITAVA: A CONTRATADA fornece ao CONTRATANTE uma garantia
Com relação às madeiras utilizadas para a confecção dos componentes do Kit madeiramento, que se refere à incidência de insetos xilófagos e fungos, a garantia é de quinze anos.`,
  },
  {
    chave: 'clausula_nona',
    rotulo: 'CLÁUSULA NONA — foro',
    variavel: false,
    texto:
`CLÁUSULA NONA: Fica eleito o foro da comarca de Imbituba - SC, para dirimir quaisquer pendências que se originem do presente instrumento.
E por estarem justos e acordados, as partes assinam o presente instrumento particular de compra e venda em duas vias de igual teor e forma, na presença de duas testemunhas.`,
  },
];

export const BLOCOS_MEMORIAL = [
  {
    chave: 'abertura',
    rotulo: 'Abertura — vínculo com o contrato',
    variavel: true,
    texto:
`Este Memorial Descritivo faz parte do Contrato Particular de Compra e Venda firmado em {{DATA_CONTRATO_EXTENSO}}, entre **{{CONTRATADA_RAZAO_SOCIAL}}** e **{{CLIENTE_NOME}}** .`,
  },
  {
    chave: 'fundacao', rotulo: 'FUNDAÇÃO', titulo: 'FUNDAÇÃO', variavel: false,
    texto: `Sera executada em radier com 40 cm da parte mais alta do terreno com sapatas ,brocas e ferragens armadas conforme projeto , contrapiso com malha pop 20x20 .`,
  },
  {
    chave: 'paredes_alvenaria', rotulo: 'PAREDES DE ALVENARIA', titulo: 'PAREDES DE ALVENARIA', variavel: false,
    texto: `Paredes em tijolos 9 furos, Reboco externo e interno.`,
  },
  {
    chave: 'paredes_madeira', rotulo: 'PAREDES DE MADEIRA', titulo: 'PAREDES DE MADEIRA', variavel: false,
    texto: `Em madeira maciça de pinus tratado em autoclave com paredes na bitola de 2,2 mm de espessura no sentido horizontal com pé direito de 2,60 metros de altura. Sistema construtivo de painel com parede dupla em forro com revestimento térmico acústico (lan de pet). pregado (PREGOS GALVANIZADOS),estrutura de 5x10 colocados a cada 50cm um do outro.`,
  },
  {
    chave: 'cobertura', rotulo: 'COBERTURA', titulo: 'COBERTURA', variavel: false,
    texto: `Em pinos em autoclave caibros de 6x12 e vigas de 10x20, com beirais de 60 cm de largura para telhas ecológicas endure verde , cobertura banheiro em laje .`,
  },
  {
    chave: 'forracao', rotulo: 'FORRAÇÃO DO TETO E BEIRAL', titulo: 'FORRAÇÃO DO TETO E BEIRAL', variavel: false,
    texto: `Forro em madeira, acompanha a inclinação do telhado no banheiro forro sera a nivel.`,
  },
  {
    chave: 'aberturas', rotulo: 'ABERTURAS', titulo: 'ABERTURAS', variavel: false,
    texto: `Aberturas em madeira de eucalipto vermelho linha prime .Portas internas e externa em angelin. Sem veneziana .`,
  },
  {
    chave: 'ferragens', rotulo: 'FERRAGENS', titulo: 'FERRAGENS', variavel: false,
    texto: `Fornecidas nas esquadrias pela fábrica mencionada. As demais serão fornecidas pela CONTRATADA, sendo da marca pado ou similar .Pregos galvanizados a fogo.`,
  },
  {
    chave: 'hidraulica', rotulo: 'INSTALAÇÕES HIDRÁULICAS', titulo: 'INSTALAÇÕES HIDRÁULICAS', variavel: false,
    texto: `Rede de água fria ,e tubos e conexões da marca fortelev ou amanco. Sendo que as torneiras de bwc são da marca deca tipo bica baixa convencional no custo de R$100,00 cada. Sera executada rede de agua quente para o banheiro.`,
  },
  {
    chave: 'eletrica', rotulo: 'INSTALAÇÕES ELÉTRICAS', titulo: 'INSTALAÇÕES ELÉTRICAS', variavel: false,
    texto: `Fiação da marca corfio ou similar, distribuída em um ponto de luz por ambiente internos e externos ,dois pontos de tomada dupla por ambiente sala/cozinha e quarto. Banheiro um ponto de luz e um ponto de tomadas. Sendo que na necessidade de pontos extras fica o custo adicional de R$180,00 por ponto. Na necessidade de ponto para energia solar sera deixado a espera .`,
  },
  {
    chave: 'loucas', rotulo: 'LOUÇAS DE BANHEIRO', titulo: 'LOUÇAS DE BANHEIRO', variavel: false,
    texto: `Bacia sanitária com caixa acoplada no valor de até R$450,00 reais e lavatório com coluna da marca DECA convencional no valor de até R$200,00.`,
  },
  {
    chave: 'pisos', rotulo: 'PISOS E AZULEJOS', titulo: 'PISOS E AZULEJOS', variavel: false,
    texto: `Serão fornecidos pela CONTRATADA para banheiros e ambientes do pavimento térreo. O preço máximo de R$ 35,00 (trinta e cinco reais) o metro quadrado instalado em linha reta. Caso o CONTRATANTE deseje optar pela compra de material mais caro, tipo porcelanato, tozetos, ou decorativos, pagará somente a diferença do valor do produto, incluindo mão de obra excedente .`,
  },
  {
    chave: 'observacoes', rotulo: 'Observações finais', variavel: false,
    texto:
`Observação: Todos os materiais poderão ser alterados de acordo com a preferência do CONTRATANTE, na condição da compatibilidade com o projeto e padrões de execução, e pagamento da diferença em relação aos materiais padrão contratados.
lembramos que as ligações externas ( esgoto, agua e luz )serão executadas após o final da obra ficando o custo do material e mão de obra por conta do contratante.

Quaisquer alterações de materiais ou execuções acima relatadas poderão ser feitas a qualquer momento, desde que em comum acordo entre as partes.

Lembramos também que qualquer material não constante no memorial descritivo é de responsabilidade do contratante como por exemplos, calhas e rufos, vidros e pintura; caçamba para retirada de entulhos bem como gastos com taxas e liberações na prefeitura. Assim como água e luz para execução da obra.`,
  },
];

// Etapas das parcelas, na ordem que a empresa usa.
export const ETAPAS_PARCELAS = [
  'Contrato',
  'Início da Obra',
  'Término fundação',
  'Descarga da madeira',
  'Cobertura',
  'Aberturas',
  'Chaves',
];

// Dados da Casas Eco já preenchidos (podem ser alterados em Configurações).
export const CONTRATADA_PADRAO = {
  razaoSocial: 'Casas Eco Material de construção e madeireira LTDA.',
  cnpj: '23.626.220/0001-20',
  endereco: 'SC 434 Km 10, Campo Duna - Garopaba SC',
  cidade: 'Imbituba',
  estado: 'SC',
  representante: 'Luiz Guilherme Fenianos',
  cpfRepresentante: '023.205.789-35',
  telefone: '',
  email: 'casasecomt@gmail.com',
  dadosBancarios: 'Agência 3074, conta corrente 1461508 Sicoob — PIX casasecomt@gmail.com',
};
