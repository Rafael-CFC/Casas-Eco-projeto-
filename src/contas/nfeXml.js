// Leitura do XML da nota fiscal eletrônica (NF-e).
//
// Toda NF-e tem, dentro do próprio XML, a lista dos boletos daquela nota:
// é o bloco <cobr>, com uma <dup> (duplicata) por boleto — número, data de
// vencimento e valor. É exatamente o que o dono digita à mão na aba
// "Registrar". Aqui esse bloco é lido e devolvido pronto, para a tela
// mostrar e ele só conferir e marcar o que vai lançar.
//
// Funções puras: recebem o TEXTO do arquivo e devolvem objetos. Não gravam
// nada, não vão à rede e não decidem nada sozinhas — quem lança é sempre o
// dono, na tela. Um número errado vindo de um arquivo é tão ruim quanto um
// número errado digitado.
//
// O que NÃO dá para fazer aqui: baixar o XML sozinho da Receita. O
// download na SEFAZ exige o certificado digital da empresa (e-CNPJ), e
// certificado não pode ficar dentro de um site — quem tivesse o endereço
// teria o certificado junto. O arquivo continua vindo de fora (e-mail da
// distribuidora, portal dela, pen drive) e entra por aqui.

// ---- leitura do XML sem se preocupar com prefixo de namespace ----
//
// A maioria das notas vem com o namespace padrão (<dup>), mas tem emissor
// que manda com prefixo (<ns2:dup>). Comparar sempre pelo nome local faz
// os dois caírem no mesmo lugar.
function nomeLocal(el) {
  return String(el.localName || el.nodeName || '').replace(/^.*:/, '');
}

function filhos(el, nome) {
  if (!el) return [];
  return Array.from(el.children || []).filter((c) => nomeLocal(c) === nome);
}

function filho(el, nome) {
  return filhos(el, nome)[0] || null;
}

// Busca em profundidade — para quando o caminho exato varia de uma versão
// do layout para outra.
function descendentes(el, nome, achados = []) {
  if (!el) return achados;
  Array.from(el.children || []).forEach((c) => {
    if (nomeLocal(c) === nome) achados.push(c);
    descendentes(c, nome, achados);
  });
  return achados;
}

function descendente(el, nome) {
  return descendentes(el, nome)[0] || null;
}

function texto(el, nome) {
  const alvo = filho(el, nome) || descendente(el, nome);
  return alvo ? String(alvo.textContent || '').trim() : '';
}

export function soDigitos(v) {
  return String(v == null ? '' : v).replace(/\D+/g, '');
}

// Valor do XML da NF-e vem sempre com ponto decimal ("1500.00"). O
// replace da vírgula é só teimosia defensiva com arquivo remendado à mão.
function numero(v) {
  const n = Number(String(v == null ? '' : v).trim().replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

// Data do XML é AAAA-MM-DD (dVenc) ou AAAA-MM-DDThh:mm:ss-03:00 (dhEmi).
// Os 10 primeiros caracteres já são a data local do emissor — cortar aqui
// evita o `new Date()` devolver o dia anterior por causa de fuso.
function dataISO(v) {
  const d = String(v == null ? '' : v).trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : '';
}

export function formatarCNPJ(v) {
  const d = soDigitos(v);
  if (d.length !== 14) return v || '';
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

// ---- situação da nota ----
//
// A nota autorizada traz o protocolo (<protNFe>) com cStat 100. Vale a
// pena olhar: nota cancelada ou denegada não gera boleto para pagar, e
// lançar uma dessas é dinheiro saindo por engano.
function situacaoDaNota(proc) {
  const evento = descendente(proc, 'infEvento');
  if (evento && texto(evento, 'tpEvento') === '110111') {
    return { situacao: 'cancelada', motivo: 'Nota cancelada (evento de cancelamento no arquivo).' };
  }
  const prot = descendente(proc, 'infProt');
  if (!prot) return { situacao: 'sem_protocolo', motivo: '' };
  const cStat = texto(prot, 'cStat');
  const xMotivo = texto(prot, 'xMotivo');
  if (cStat === '100' || cStat === '150') return { situacao: 'autorizada', motivo: '' };
  if (cStat === '101' || cStat === '135' || cStat === '155') {
    return { situacao: 'cancelada', motivo: xMotivo || 'Nota cancelada.' };
  }
  return { situacao: 'nao_autorizada', motivo: xMotivo || `Situação ${cStat} na SEFAZ.` };
}

// ---- os boletos da nota ----
//
// Uma <dup> por boleto. Nota à vista simplesmente não tem <cobr> — e aí
// não há boleto nenhum para lançar, o que também é uma resposta.
function boletosDaNota(infNFe, chave) {
  const cobr = filho(infNFe, 'cobr');
  const dups = cobr ? filhos(cobr, 'dup') : [];
  return dups.map((dup, i) => {
    const num = texto(dup, 'nDup') || String(i + 1);
    return {
      id: `${chave || 'nota'}#${num}`,
      numero: num,
      ordem: i + 1,
      vencimento: dataISO(texto(dup, 'dVenc')),
      valor: numero(texto(dup, 'vDup')),
    };
  }).sort((a, b) => (a.vencimento || '9999').localeCompare(b.vencimento || '9999'));
}

function lerNota(infNFe, proc) {
  const chave = soDigitos(infNFe.getAttribute('Id') || '');
  const ide = filho(infNFe, 'ide');
  const emit = filho(infNFe, 'emit');
  const dest = filho(infNFe, 'dest');
  const icmsTot = descendente(filho(infNFe, 'total'), 'ICMSTot');

  const boletos = boletosDaNota(infNFe, chave);
  const valorNota = numero(texto(icmsTot, 'vNF'));
  const somaBoletos = boletos.reduce((a, b) => a + b.valor, 0);

  const { situacao, motivo } = situacaoDaNota(proc);

  return {
    chave,
    numero: texto(ide, 'nNF'),
    serie: texto(ide, 'serie'),
    modelo: texto(ide, 'mod'),
    emissao: dataISO(texto(ide, 'dhEmi') || texto(ide, 'dEmi')),
    emitente: {
      nome: texto(emit, 'xNome'),
      fantasia: texto(emit, 'xFant'),
      cnpj: texto(emit, 'CNPJ') || texto(emit, 'CPF'),
    },
    destinatario: {
      nome: texto(dest, 'xNome'),
      cnpj: texto(dest, 'CNPJ') || texto(dest, 'CPF'),
    },
    valorNota,
    somaBoletos,
    // Os dois números têm que bater. Quando não batem é porque a nota tem
    // entrada paga na hora, desconto ou frete cobrado à parte — não é erro,
    // mas é coisa que o dono precisa ver antes de lançar.
    somaDivergente: boletos.length > 0 && Math.abs(somaBoletos - valorNota) > 0.01,
    situacao,
    motivoSituacao: motivo,
    boletos,
  };
}

// ---- entrada principal ----
//
// Devolve sempre o mesmo formato: { arquivo, erro, notas }. Arquivo que
// não deu para ler vira uma linha de erro na tela em vez de derrubar a
// importação inteira — quem escolhe dez arquivos de uma vez não pode
// perder os nove bons por causa de um ruim.
export function lerNotasDoXml(conteudo, { nomeArquivo = '' } = {}) {
  const vazio = { arquivo: nomeArquivo, erro: '', notas: [] };
  const cru = String(conteudo == null ? '' : conteudo).replace(/^﻿/, '').trim();
  if (!cru) return { ...vazio, erro: 'Arquivo vazio.' };

  let doc = null;
  try {
    doc = new DOMParser().parseFromString(cru, 'application/xml');
  } catch {
    doc = null;
  }
  if (!doc || !doc.documentElement || doc.getElementsByTagName('parsererror').length > 0) {
    return { ...vazio, erro: 'Não é um XML válido — confira se o arquivo não veio pela metade.' };
  }

  const raiz = doc.documentElement;
  const infNFes = descendentes(raiz, 'infNFe');

  if (infNFes.length === 0) {
    if (descendente(raiz, 'infEvento')) {
      return { ...vazio, erro: 'É o XML de um evento da nota (cancelamento ou carta de correção), não da nota.' };
    }
    if (nomeLocal(raiz) === 'infCFe' || descendente(raiz, 'infCFe')) {
      return { ...vazio, erro: 'É um cupom fiscal (CF-e/SAT), que não tem boleto.' };
    }
    return { ...vazio, erro: 'Não achei nenhuma NF-e dentro desse arquivo.' };
  }

  const notas = infNFes.map((inf) => {
    // O protocolo fica fora da <NFe>, ao lado dela dentro do <nfeProc>.
    // Subindo até o avô, a nota certa fica com o protocolo dela mesmo
    // quando o arquivo traz várias notas juntas.
    const nfe = inf.parentNode;
    const proc = (nfe && nfe.parentNode && nomeLocal(nfe.parentNode) === 'nfeProc') ? nfe.parentNode : raiz;
    return { ...lerNota(inf, proc), arquivo: nomeArquivo };
  });

  return { ...vazio, notas };
}

// ---- o que já foi lançado ----

// Um boleto importado carrega de onde veio (chave da nota + número da
// duplicata). É por aí que o sistema reconhece o mesmo arquivo escolhido
// duas vezes — o que acontece direto, porque o XML chega por e-mail e por
// WhatsApp da mesma distribuidora.
export function contaJaLancada(contas, nota, boleto) {
  if (!nota.chave) return false;
  return (contas || []).some((c) => (
    c && c.chaveNfe === nota.chave && String(c.numeroDuplicata) === String(boleto.numero)
  ));
}

// Rede de segurança para o que foi digitado à mão antes de existir a
// importação: mesma distribuidora, mesmo valor e mesmo vencimento. Não
// bloqueia nada — só avisa, porque duas parcelas iguais no mesmo dia
// existem de verdade.
export function contaPareceRepetida(contas, nomeDistribuidora, boleto, chaveNome) {
  const alvo = chaveNome(nomeDistribuidora);
  if (!alvo || !boleto.vencimento) return false;
  return (contas || []).some((c) => (
    c
    && !c.chaveNfe
    && chaveNome(c.fornecedorNome || c.descricao || '') === alvo
    && c.vencimento === boleto.vencimento
    && Math.abs((Number(c.valor) || 0) - boleto.valor) < 0.01
  ));
}

// Casa o nome do emitente do XML com uma distribuidora que o sistema já
// conhece, para o boleto não entrar como uma segunda "ALBERTINA" escrita
// de outro jeito. Sem par na lista, fica o nome do XML mesmo.
export function distribuidoraDoEmitente(nota, nomesConhecidos, chaveNome) {
  const doXml = String(nota?.emitente?.nome || '').replace(/\s+/g, ' ').trim();
  const fantasia = String(nota?.emitente?.fantasia || '').replace(/\s+/g, ' ').trim();
  const lista = nomesConhecidos || [];
  const achar = (nome) => (nome ? lista.find((n) => chaveNome(n) === chaveNome(nome)) : null);
  return achar(doXml) || achar(fantasia) || doXml || fantasia || '';
}
