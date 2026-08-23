import React, { useState, useEffect } from 'react';
import {
  Package, Plus, Trash2, Loader2, AlertCircle,
  ArrowLeft, Building2, HardHat, Mountain, Store,
  Upload, ArrowUpRight, ArrowDownRight, CheckCircle2, X, Pencil, Copy,
  Home, Users, Receipt, CalendarClock, Phone, FileText, Download,
} from 'lucide-react';
import { upperInput, normalizeProductName, normalizeUnit } from './textUtils';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-red-50 p-6">
          <div className="max-w-2xl mx-auto bg-white border-2 border-red-300 rounded-lg p-5">
            <p className="font-semibold text-red-700 mb-2">Deu um erro no software</p>
            <p className="text-sm text-stone-600 mb-3">Copia a mensagem abaixo e me manda no chat, assim eu acho e conserto exatamente o problema:</p>
            <pre className="text-xs bg-red-50 border border-red-200 rounded p-3 overflow-auto whitespace-pre-wrap">{String((this.state.error && this.state.error.stack) || this.state.error)}</pre>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function CustoObraAppBoundary() {
  return (
    <ErrorBoundary>
      <CustoObraApp />
    </ErrorBoundary>
  );
}


function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatDateBR(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function formatMoney(v) {
  const n = Number(v) || 0;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function parsePrecoBR(s) {
  if (s === null || s === undefined) return NaN;
  let t = String(s).trim().replace(/^R\$\s*/i, '');
  if (t.includes(',') && t.includes('.')) {
    t = t.replace(/\./g, '').replace(',', '.');
  } else if (t.includes(',')) {
    t = t.replace(',', '.');
  }
  return parseFloat(t);
}

function parseImportado(texto) {
  const linhas = texto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const itens = [];
  let invalidas = 0;
  linhas.forEach((linha, i) => {
    const sep = linha.includes(';') ? ';' : (linha.includes('\t') ? '\t' : ',');
    const partes = linha.split(sep).map((p) => p.trim().replace(/^"|"$/g, ''));
    if (partes.length < 2) { invalidas++; return; }
    const [nomeRaw, precoRaw, unidadeRaw] = partes;
    const preco = parsePrecoBR(precoRaw);
    // ignora possível linha de cabeçalho (primeira linha sem preço numérico)
    if (i === 0 && isNaN(preco)) return;
    if (!nomeRaw || isNaN(preco)) { invalidas++; return; }
    itens.push({ nome: normalizeProductName(nomeRaw), preco, unidade: normalizeUnit(unidadeRaw) || 'UN' });
  });
  return { itens, invalidas };
}

const CATEGORIAS = {
  mao_de_obra: { label: 'Mão de obra', icon: HardHat, cls: 'amber' },
  material_bruto: { label: 'Materiais Brutos', icon: Mountain, cls: 'orange' },
  produto_loja: { label: 'Produtos da Loja', icon: Store, cls: 'blue' },
};

const CLS = {
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', solid: 'bg-amber-600' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', solid: 'bg-orange-600' },
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', solid: 'bg-blue-600' },
};

const NAV_ITEMS = [
  { key: 'home', label: 'Início', icon: Home },
  { key: 'catalogo', label: 'Catálogo', icon: Package },
  { key: 'fornecedores', label: 'Fornecedores', icon: Users },
  { key: 'contas', label: 'Contas', icon: Receipt },
  { key: 'relatorios', label: 'Relatórios', icon: FileText },
];

function CustoObraApp() {
  const [obras, setObras] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [lancamentos, setLancamentos] = useState([]);
  const [etapas, setEtapas] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [contas, setContas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [dialogo, setDialogo] = useState(null); // { tipo: 'confirm'|'prompt', mensagem, valor, onConfirmar }

  function confirmar(mensagem, onConfirmar) {
    setDialogo({ tipo: 'confirm', mensagem, onConfirmar });
  }
  function perguntar(mensagem, valorInicial, onConfirmar) {
    setDialogo({ tipo: 'prompt', mensagem, valor: valorInicial || '', onConfirmar });
  }

  const [view, setView] = useState('home');
  const [obraAtivaId, setObraAtivaId] = useState(null);
  const [categoriaAtiva, setCategoriaAtiva] = useState('produto_loja');

  const [novaObraNome, setNovaObraNome] = useState('');
  const [novaObraOrcamento, setNovaObraOrcamento] = useState('');

  useEffect(() => {
    (async () => {
      if (!window.storage) {
        setErro('Este ambiente não oferece armazenamento persistente — os dados não serão salvos entre sessões.');
        setLoading(false);
        return;
      }
      try {
        const [o, p, l, et, fo, co] = await Promise.all([
          window.storage.get('obras', false).catch(() => null),
          window.storage.get('produtos', false).catch(() => null),
          window.storage.get('lancamentos', false).catch(() => null),
          window.storage.get('etapas', false).catch(() => null),
          window.storage.get('fornecedores', false).catch(() => null),
          window.storage.get('contas', false).catch(() => null),
        ]);

        // Migração não destrutiva: padroniza nome/unidade de produtos e
        // lançamentos já existentes para CAIXA ALTA, preservando id, preço,
        // estoque/histórico e relacionamentos. Só regrava no banco se algo
        // realmente mudou.
        const produtosCarregados = p ? JSON.parse(p.value) : [];
        const lancamentosCarregados = l ? JSON.parse(l.value) : [];

        const produtosNormalizados = produtosCarregados.map((prod) => {
          const nome = normalizeProductName(prod.nome);
          const unidade = normalizeUnit(prod.unidade) || prod.unidade;
          if (nome === prod.nome && unidade === prod.unidade) return prod;
          return { ...prod, nome, unidade };
        });
        const produtosMudaram = produtosNormalizados.some((prod, idx) => prod !== produtosCarregados[idx]);

        const lancamentosNormalizados = lancamentosCarregados.map((lanc) => {
          const descricao = normalizeProductName(lanc.descricao);
          const unidade = normalizeUnit(lanc.unidade) || lanc.unidade;
          if (descricao === lanc.descricao && unidade === lanc.unidade) return lanc;
          return { ...lanc, descricao, unidade };
        });
        const lancamentosMudaram = lancamentosNormalizados.some((lanc, idx) => lanc !== lancamentosCarregados[idx]);

        setObras(o ? JSON.parse(o.value) : []);
        setProdutos(produtosNormalizados);
        setLancamentos(lancamentosNormalizados);
        setEtapas(et ? JSON.parse(et.value) : []);
        setFornecedores(fo ? JSON.parse(fo.value) : []);
        setContas(co ? JSON.parse(co.value) : []);

        if (produtosMudaram) {
          window.storage.set('produtos', JSON.stringify(produtosNormalizados), false).catch(() => {});
        }
        if (lancamentosMudaram) {
          window.storage.set('lancamentos', JSON.stringify(lancamentosNormalizados), false).catch(() => {});
        }
      } catch (e) {
        setErro('Não foi possível carregar os dados salvos.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(''), 3500);
    return () => clearTimeout(t);
  }, [aviso]);

  async function persist(key, value, setter) {
    setter(value);
    if (!window.storage) {
      setErro('Este ambiente não oferece armazenamento persistente — os dados não serão salvos entre sessões.');
      return false;
    }
    try {
      await window.storage.set(key, JSON.stringify(value), false);
      return true;
    } catch (e) {
      setErro(`Não foi possível salvar: ${e && e.message ? e.message : 'erro desconhecido'}`);
      return false;
    }
  }

  const salvarObras = (l) => persist('obras', l, setObras);
  const salvarProdutos = (l) => persist('produtos', l, setProdutos);
  const salvarLancamentos = (l) => persist('lancamentos', l, setLancamentos);
  const salvarEtapas = (l) => persist('etapas', l, setEtapas);
  const salvarFornecedores = (l) => persist('fornecedores', l, setFornecedores);
  const salvarContas = (l) => persist('contas', l, setContas);

  async function criarObra(e) {
    if (e && e.preventDefault) e.preventDefault();
    const nome = novaObraNome.trim();
    if (!nome) return;
    const orcamento = novaObraOrcamento.trim() ? parsePrecoBR(novaObraOrcamento) : null;
    const nova = { id: crypto.randomUUID(), nome, criadoEm: todayISO(), orcamento: isNaN(orcamento) ? null : orcamento };
    const ok = await salvarObras([...obras, nova]);
    if (ok) {
      setAviso(`Obra "${nome}" criada.`);
      setNovaObraNome('');
      setNovaObraOrcamento('');
    }
  }

  function removerObra(id, nome) {
    confirmar(`Remover a obra "${nome}"? Todos os lançamentos dela serão apagados.`, () => {
      salvarObras(obras.filter((o) => o.id !== id));
      salvarLancamentos(lancamentos.filter((l) => l.obraId !== id));
      if (obraAtivaId === id) { setView('home'); setObraAtivaId(null); }
    });
  }

  function definirOrcamento(id) {
    const atual = obras.find((o) => o.id === id);
    perguntar('Orçamento previsto para esta obra (R$):', atual && atual.orcamento ? String(atual.orcamento) : '', (texto) => {
      const valor = texto.trim() === '' ? null : parsePrecoBR(texto);
      salvarObras(obras.map((o) => o.id === id ? { ...o, orcamento: (valor === null || isNaN(valor)) ? null : valor } : o));
    });
  }

  function definirOrcamentoCategoria(obraId, categoria) {
    const atual = obras.find((o) => o.id === obraId);
    const atualCat = atual && atual.orcamentoCategorias ? atual.orcamentoCategorias[categoria] : null;
    perguntar(`Orçamento previsto para "${CATEGORIAS[categoria].label}" nesta obra (R$):`, atualCat ? String(atualCat) : '', (texto) => {
      const valor = texto.trim() === '' ? null : parsePrecoBR(texto);
      salvarObras(obras.map((o) => {
        if (o.id !== obraId) return o;
        const orcamentoCategorias = { ...(o.orcamentoCategorias || {}) };
        orcamentoCategorias[categoria] = (valor === null || isNaN(valor)) ? null : valor;
        return { ...o, orcamentoCategorias };
      }));
    });
  }

  // ---- etapas da obra ----
  const [novaEtapaNome, setNovaEtapaNome] = useState('');
  const [novaEtapaOrcamento, setNovaEtapaOrcamento] = useState('');

  function criarEtapa(obraId) {
    const nome = novaEtapaNome.trim();
    if (!nome) return;
    const orcamento = novaEtapaOrcamento.trim() ? parsePrecoBR(novaEtapaOrcamento) : null;
    const nova = { id: crypto.randomUUID(), obraId, nome, orcamento: isNaN(orcamento) ? null : orcamento, criadoEm: todayISO() };
    salvarEtapas([...etapas, nova]);
    setNovaEtapaNome('');
    setNovaEtapaOrcamento('');
  }

  function removerEtapa(id, nome) {
    confirmar(`Remover a etapa "${nome}"? Os lançamentos ligados a ela continuam na obra, só perdem a etapa.`, () => {
      salvarEtapas(etapas.filter((et) => et.id !== id));
      salvarLancamentos(lancamentos.map((l) => l.etapaId === id ? { ...l, etapaId: null } : l));
    });
  }

  function totalEtapa(etapaId) {
    return lancamentos.filter((l) => l.etapaId === etapaId).reduce((a, l) => a + l.total, 0);
  }

  // ---- dashboard geral (todas as obras) ----
  function gastosNoPeriodo(dias) {
    const limite = new Date();
    limite.setDate(limite.getDate() - dias);
    const limiteISO = limite.toISOString().slice(0, 10);
    return lancamentos.filter((l) => l.data >= limiteISO).reduce((a, l) => a + l.total, 0);
  }

  function gerarAlertas() {
    const alertas = [];
    obras.forEach((o) => {
      const gasto = totalObra(o.id);
      if (o.orcamento) {
        const pct = (gasto / o.orcamento) * 100;
        if (pct >= 100) alertas.push({ tipo: 'red', texto: `"${o.nome}" já ultrapassou o orçamento total em ${formatMoney(gasto - o.orcamento)}.` });
        else if (pct >= 80) alertas.push({ tipo: 'yellow', texto: `"${o.nome}" já consumiu ${pct.toFixed(0)}% do orçamento total.` });
      }
      if (o.orcamentoCategorias) {
        Object.entries(o.orcamentoCategorias).forEach(([cat, valor]) => {
          if (!valor) return;
          const gastoCat = totalObraCategoria(o.id, cat);
          const pct = (gastoCat / valor) * 100;
          if (pct >= 100) alertas.push({ tipo: 'red', texto: `"${o.nome}": ${CATEGORIAS[cat].label} ultrapassou o orçamento em ${formatMoney(gastoCat - valor)}.` });
          else if (pct >= 80) alertas.push({ tipo: 'yellow', texto: `"${o.nome}": ${CATEGORIAS[cat].label} já consumiu ${pct.toFixed(0)}% do orçamento.` });
        });
      }
    });
    const vencidas = contas.filter((c) => c.status !== 'pago' && c.vencimento < todayISO());
    if (vencidas.length > 0) {
      alertas.unshift({ tipo: 'red', texto: `${vencidas.length} conta(s) vencida(s), totalizando ${formatMoney(vencidas.reduce((a, c) => a + c.valor, 0))}.` });
    }
    return alertas;
  }

  // ---- fornecedores ----
  function upsertFornecedor(lista, nome) {
    const existente = lista.find((f) => f.nome.toLowerCase() === nome.toLowerCase());
    if (existente) return lista;
    return [...lista, { id: crypto.randomUUID(), nome, telefone: '', categoria: '', observacoes: '', criadoEm: todayISO() }];
  }

  function estatisticasFornecedor(nome) {
    const compras = lancamentos.filter((l) => l.fornecedorNome && l.fornecedorNome.toLowerCase() === nome.toLowerCase());
    const total = compras.reduce((a, l) => a + l.total, 0);
    const obrasRelacionadas = [...new Set(compras.map((l) => {
      const o = obras.find((ob) => ob.id === l.obraId);
      return o ? o.nome : null;
    }).filter(Boolean))];
    const ultima = compras.length > 0 ? compras.reduce((a, l) => (l.data > a ? l.data : a), compras[0].data) : null;
    return { total, numero: compras.length, media: compras.length > 0 ? total / compras.length : 0, ultima, obrasRelacionadas };
  }

  function removerFornecedor(id, nome) {
    confirmar(`Remover "${nome}" do cadastro de fornecedores? O histórico de compras continua nos lançamentos.`, () => {
      salvarFornecedores(fornecedores.filter((f) => f.id !== id));
    });
  }

  function atualizarFornecedor(id, campos) {
    return salvarFornecedores(fornecedores.map((f) => f.id === id ? { ...f, ...campos } : f));
  }

  // ---- contas a pagar ----
  async function criarContas({ descricao, valor, vencimento, obraId, fornecedorNome, parcelas }) {
    const hoje = todayISO();
    const n = Math.max(1, parseInt(parcelas, 10) || 1);
    const grupoId = n > 1 ? crypto.randomUUID() : null;
    const novas = [];
    for (let i = 0; i < n; i++) {
      const dataVenc = new Date(vencimento + 'T00:00:00');
      dataVenc.setMonth(dataVenc.getMonth() + i);
      novas.push({
        id: crypto.randomUUID(),
        descricao: n > 1 ? `${descricao} (${i + 1}/${n})` : descricao,
        valor: n > 1 ? Math.round((valor / n) * 100) / 100 : valor,
        vencimento: dataVenc.toISOString().slice(0, 10),
        obraId: obraId || null,
        fornecedorNome: fornecedorNome || '',
        status: 'pendente',
        grupoParcelamento: grupoId,
        criadoEm: hoje,
      });
    }
    const ok = await salvarContas([...contas, ...novas]);
    if (!ok) return false;
    if (fornecedorNome && fornecedorNome.trim()) {
      salvarFornecedores(upsertFornecedor(fornecedores, fornecedorNome.trim()));
    }
    setAviso(n > 1 ? `${n} parcelas de "${descricao}" criadas.` : `Conta "${descricao}" criada.`);
    return true;
  }

  function marcarContaPaga(id) {
    salvarContas(contas.map((c) => c.id === id ? { ...c, status: c.status === 'pago' ? 'pendente' : 'pago' } : c));
  }

  function removerConta(id, descricao) {
    confirmar(`Remover a conta "${descricao}"?`, () => {
      salvarContas(contas.filter((c) => c.id !== id));
    });
  }

  function classificarConta(c) {
    if (c.status === 'pago') return 'pago';
    const hoje = todayISO();
    const em7 = new Date(); em7.setDate(em7.getDate() + 7);
    const em30 = new Date(); em30.setDate(em30.getDate() + 30);
    if (c.vencimento < hoje) return 'vencida';
    if (c.vencimento === hoje) return 'hoje';
    if (c.vencimento <= em7.toISOString().slice(0, 10)) return 'proximos7';
    if (c.vencimento <= em30.toISOString().slice(0, 10)) return 'proximos30';
    return 'futuro';
  }

  // ---- formulário: cadastro/edição de fornecedor ----
  const [fnNome, setFnNome] = useState('');
  const [fnTelefone, setFnTelefone] = useState('');
  const [fnCategoria, setFnCategoria] = useState('');

  async function cadastrarFornecedor() {
    setErro('');
    const nome = fnNome.trim();
    if (!nome) { setErro('Informe o nome do fornecedor.'); return; }
    const existente = fornecedores.find((f) => f.nome.toLowerCase() === nome.toLowerCase());
    let ok;
    if (existente) {
      ok = await atualizarFornecedor(existente.id, { telefone: fnTelefone.trim(), categoria: fnCategoria.trim() });
      if (ok) setAviso(`"${nome}" atualizado.`);
    } else {
      ok = await salvarFornecedores([...fornecedores, {
        id: crypto.randomUUID(), nome, telefone: fnTelefone.trim(), categoria: fnCategoria.trim(),
        observacoes: '', criadoEm: todayISO(),
      }]);
      if (ok) setAviso(`"${nome}" cadastrado.`);
    }
    if (ok) { setFnNome(''); setFnTelefone(''); setFnCategoria(''); }
  }

  // ---- formulário: nova conta a pagar ----
  const [ctDescricao, setCtDescricao] = useState('');
  const [ctValor, setCtValor] = useState('');
  const [ctVencimento, setCtVencimento] = useState(todayISO());
  const [ctObraId, setCtObraId] = useState('');
  const [ctFornecedor, setCtFornecedor] = useState('');
  const [ctParcelas, setCtParcelas] = useState('1');

  async function aoCriarConta() {
    setErro('');
    const descricao = ctDescricao.trim();
    const valor = parsePrecoBR(ctValor);
    if (!descricao) { setErro('Descreva a conta.'); return; }
    if (isNaN(valor) || valor <= 0) { setErro('Informe um valor válido.'); return; }
    if (!ctVencimento) { setErro('Informe a data de vencimento.'); return; }
    const ok = await criarContas({
      descricao, valor, vencimento: ctVencimento,
      obraId: ctObraId || null, fornecedorNome: ctFornecedor.trim(), parcelas: ctParcelas,
    });
    if (ok) {
      setCtDescricao(''); setCtValor(''); setCtVencimento(todayISO());
      setCtObraId(''); setCtFornecedor(''); setCtParcelas('1');
    }
  }

  function baixarCSV(nomeArquivo, linhas) {
    const csv = linhas.map((linha) =>
      linha.map((campo) => `"${String(campo == null ? '' : campo).replace(/"/g, '""')}"`).join(';')
    ).join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeArquivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setAviso(`"${nomeArquivo}" baixado.`);
  }

  function exportarObraCSV(obra) {
    const itens = lancamentos.filter((l) => l.obraId === obra.id);
    const linhas = [['Data', 'Categoria', 'Descrição', 'Etapa', 'Fornecedor', 'Quantidade', 'Unidade', 'Valor Unit.', 'Total', 'Observação']];
    itens.forEach((l) => {
      const et = etapas.find((e) => e.id === l.etapaId);
      linhas.push([
        formatDateBR(l.data), CATEGORIAS[l.categoria].label, l.descricao, et ? et.nome : '',
        l.fornecedorNome || '', l.quantidade, l.unidade, l.preco, l.total, l.observacao || '',
      ]);
    });
    baixarCSV(`${obra.nome.replace(/[^a-z0-9]+/gi, '-')}.csv`, linhas);
  }

  function exportarTudoCSV() {
    const linhas = [['Obra', 'Data', 'Categoria', 'Descrição', 'Etapa', 'Fornecedor', 'Quantidade', 'Unidade', 'Valor Unit.', 'Total', 'Observação']];
    lancamentos.forEach((l) => {
      const o = obras.find((ob) => ob.id === l.obraId);
      const et = etapas.find((e) => e.id === l.etapaId);
      linhas.push([
        o ? o.nome : '', formatDateBR(l.data), CATEGORIAS[l.categoria].label, l.descricao, et ? et.nome : '',
        l.fornecedorNome || '', l.quantidade, l.unidade, l.preco, l.total, l.observacao || '',
      ]);
    });
    baixarCSV('extrato-completo.csv', linhas);
  }

  function exportarContasCSV() {
    const linhas = [['Descrição', 'Valor', 'Vencimento', 'Status', 'Obra', 'Fornecedor']];
    contas.forEach((c) => {
      const o = c.obraId ? obras.find((ob) => ob.id === c.obraId) : null;
      linhas.push([c.descricao, c.valor, formatDateBR(c.vencimento), c.status === 'pago' ? 'Paga' : 'Pendente', o ? o.nome : '', c.fornecedorNome || '']);
    });
    baixarCSV('contas-a-pagar.csv', linhas);
  }

  function gastosPorCategoriaGeral() {
    return Object.entries(CATEGORIAS).map(([key, cat]) => ({
      label: cat.label,
      total: lancamentos.filter((l) => l.categoria === key).reduce((a, l) => a + l.total, 0),
    })).filter((c) => c.total > 0).sort((a, b) => b.total - a.total);
  }

  function gastosPorFornecedorGeral() {
    const porNome = {};
    lancamentos.forEach((l) => {
      if (!l.fornecedorNome) return;
      porNome[l.fornecedorNome] = (porNome[l.fornecedorNome] || 0) + l.total;
    });
    return Object.entries(porNome).map(([nome, total]) => ({ nome, total })).sort((a, b) => b.total - a.total);
  }

  async function copiarResumoObra(obra) {
    const itens = lancamentos.filter((l) => l.obraId === obra.id);
    let texto = `RESUMO DA OBRA: ${obra.nome}\n`;
    texto += `Desde: ${formatDateBR(obra.criadoEm)}\n`;
    if (obra.orcamento) texto += `Orçamento: ${formatMoney(obra.orcamento)}\n`;
    texto += `Total gasto: ${formatMoney(totalObra(obra.id))}\n\n`;
    Object.entries(CATEGORIAS).forEach(([key, cat]) => {
      const doGrupo = itens.filter((i) => i.categoria === key);
      if (doGrupo.length === 0) return;
      texto += `--- ${cat.label} (${formatMoney(totalObraCategoria(obra.id, key))}) ---\n`;
      doGrupo.forEach((i) => {
        texto += `${formatDateBR(i.data)} | ${i.descricao} | ${i.quantidade} ${i.unidade} x ${formatMoney(i.preco)} = ${formatMoney(i.total)}\n`;
      });
      texto += '\n';
    });
    try {
      await navigator.clipboard.writeText(texto);
      setAviso('Resumo copiado! Já pode colar num WhatsApp, e-mail etc.');
    } catch (e) {
      setErro('Não foi possível copiar automaticamente. Selecione e copie manualmente se precisar.');
    }
  }

  function totalObra(obraId) {
    return lancamentos.filter((l) => l.obraId === obraId).reduce((a, l) => a + l.total, 0);
  }

  function totalObraCategoria(obraId, categoria) {
    return lancamentos
      .filter((l) => l.obraId === obraId && l.categoria === categoria)
      .reduce((a, l) => a + l.total, 0);
  }

  function abrirObra(id) {
    setObraAtivaId(id);
    setCategoriaAtiva('produto_loja');
    setView('obra');
  }

  function removerLancamento(id) {
    salvarLancamentos(lancamentos.filter((l) => l.id !== id));
  }

  // ---- produtos ordenados por uso (mais lançados primeiro) ----
  function produtosOrdenadosPorUso() {
    const uso = {};
    lancamentos.forEach((l) => { if (l.produtoId) uso[l.produtoId] = (uso[l.produtoId] || 0) + 1; });
    return produtos.slice().sort((a, b) => {
      const ua = uso[a.id] || 0, ub = uso[b.id] || 0;
      if (ub !== ua) return ub - ua;
      return a.nome.localeCompare(b.nome);
    });
  }

  // ---- catálogo global de produtos da loja ----
  const [npNome, setNpNome] = useState('');
  const [npUnidade, setNpUnidade] = useState('UN');
  const [npPreco, setNpPreco] = useState('');
  const [npEditandoId, setNpEditandoId] = useState(null);

  function upsertProduto(lista, { nome, preco, unidade }, hoje) {
    const nomeNormalizado = normalizeProductName(nome);
    const unidadeNormalizada = normalizeUnit(unidade);
    const idx = lista.findIndex((p) => p.nome.toLowerCase() === nomeNormalizado.toLowerCase());
    if (idx >= 0) {
      const existente = lista[idx];
      const historico = [...(existente.historico || []), { preco: existente.preco, data: existente.atualizadoEm }];
      const copia = lista.slice();
      copia[idx] = { ...existente, preco, unidade: unidadeNormalizada || existente.unidade, atualizadoEm: hoje, historico };
      return copia;
    }
    return [...lista, {
      id: crypto.randomUUID(), nome: nomeNormalizado, unidade: unidadeNormalizada || 'UN', preco,
      criadoEm: hoje, atualizadoEm: hoje, historico: [],
    }];
  }

  function editarProduto(produto) {
    setNpEditandoId(produto.id);
    setNpNome(produto.nome);
    setNpUnidade(produto.unidade);
    setNpPreco(String(produto.preco));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelarEdicaoProduto() {
    setNpEditandoId(null);
    setNpNome(''); setNpUnidade('UN'); setNpPreco('');
  }

  async function cadastrarProduto(e) {
    if (e && e.preventDefault) e.preventDefault();
    setErro('');
    const nome = normalizeProductName(npNome);
    const unidade = normalizeUnit(npUnidade) || 'UN';
    const preco = parsePrecoBR(npPreco);
    if (!nome || isNaN(preco) || preco < 0) {
      setErro('Preencha o nome e um preço válido para o produto.');
      return;
    }
    const hoje = todayISO();

    if (npEditandoId) {
      // edição de um produto existente (permite até renomear, sem duplicar)
      const duplicado = produtos.find((p) => p.id !== npEditandoId && p.nome.toLowerCase() === nome.toLowerCase());
      if (duplicado) {
        setErro(`Já existe um produto chamado "${nome}" no catálogo.`);
        return;
      }
      const original = produtos.find((p) => p.id === npEditandoId);
      const historico = original && original.preco !== preco
        ? [...(original.historico || []), { preco: original.preco, data: original.atualizadoEm }]
        : (original ? original.historico || [] : []);
      const ok = await salvarProdutos(produtos.map((p) => p.id === npEditandoId
        ? { ...p, nome, unidade, preco, atualizadoEm: hoje, historico }
        : p));
      if (ok) {
        setAviso(`"${nome}" atualizado.`);
        cancelarEdicaoProduto();
      }
      return;
    }

    const ok = await salvarProdutos(upsertProduto(produtos, { nome, preco, unidade }, hoje));
    if (ok) {
      setAviso(`"${nome}" salvo no catálogo.`);
      setNpNome(''); setNpPreco('');
    }
  }

  function removerProduto(id, nome) {
    confirmar(`Remover "${nome}" do catálogo?`, () => {
      salvarProdutos(produtos.filter((p) => p.id !== id));
      if (npEditandoId === id) cancelarEdicaoProduto();
    });
  }

  // ---- importação do PDV ----
  const [importAberto, setImportAberto] = useState(false);
  const [importTexto, setImportTexto] = useState('');
  const [importPreview, setImportPreview] = useState(null);

  function analisarImportacao() {
    setErro('');
    const { itens, invalidas } = parseImportado(importTexto);
    if (itens.length === 0) {
      setErro('Não encontrei nenhum produto válido no texto/arquivo. Formato esperado: nome, preço (uma linha por produto).');
      setImportPreview(null);
      return;
    }
    const novos = [];
    const atualizados = [];
    itens.forEach((it) => {
      const existente = produtos.find((p) => p.nome.toLowerCase() === it.nome.toLowerCase());
      if (existente) atualizados.push({ ...it, precoAntigo: existente.preco });
      else novos.push(it);
    });
    setImportPreview({ itens, novos, atualizados, invalidas });
  }

  function handleArquivoImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setImportTexto(String(ev.target.result || ''));
    reader.onerror = () => setErro('Não foi possível ler o arquivo.');
    reader.readAsText(file, 'utf-8');
  }

  function confirmarImportacao() {
    if (!importPreview) return;
    const hoje = todayISO();
    let lista = produtos.slice();
    importPreview.itens.forEach((it) => { lista = upsertProduto(lista, it, hoje); });
    salvarProdutos(lista);
    setAviso(`Importação concluída: ${importPreview.novos.length} novo(s), ${importPreview.atualizados.length} atualizado(s).`);
    setImportPreview(null);
    setImportTexto('');
    setImportAberto(false);
  }

  // ---- lançamento dentro de uma obra ----
  const [ldDescricao, setLdDescricao] = useState('');
  const [ldQuantidade, setLdQuantidade] = useState('1');
  const [ldUnidade, setLdUnidade] = useState('UN');
  const [ldPreco, setLdPreco] = useState('');
  const [ldData, setLdData] = useState(todayISO());
  const [ldObservacao, setLdObservacao] = useState('');
  const [ldEtapaId, setLdEtapaId] = useState('');
  const [ldFornecedor, setLdFornecedor] = useState('');
  const [editandoId, setEditandoId] = useState(null);
  const [buscaLancamento, setBuscaLancamento] = useState('');

  function resetFormLancamento() {
    setLdDescricao(''); setLdQuantidade('1'); setLdUnidade('UN');
    setLdPreco(''); setLdData(todayISO());
    setLdObservacao(''); setLdEtapaId(''); setLdFornecedor(''); setEditandoId(null);
  }

  function aoDigitarProdutoLoja(valor) {
    const nome = upperInput(valor);
    setLdDescricao(nome);
    const p = produtos.find((x) => x.nome.toLowerCase() === nome.trim().toLowerCase());
    if (p) { setLdPreco(String(p.preco)); setLdUnidade(p.unidade); }
  }

  function editarLancamento(item) {
    setCategoriaAtiva(item.categoria);
    setEditandoId(item.id);
    setLdDescricao(item.descricao);
    setLdQuantidade(String(item.quantidade));
    setLdUnidade(item.unidade);
    setLdPreco(String(item.preco));
    setLdData(item.data);
    setLdObservacao(item.observacao || '');
    setLdEtapaId(item.etapaId || '');
    setLdFornecedor(item.fornecedorNome || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function lancar(e) {
    if (e && e.preventDefault) e.preventDefault();
    setErro('');
    const quantidade = parsePrecoBR(ldQuantidade);
    const preco = parsePrecoBR(ldPreco);
    const nome = normalizeProductName(ldDescricao);
    const unidade = normalizeUnit(ldUnidade) || 'UN';

    if (!nome) { setErro('Descreva o item.'); return; }
    if (isNaN(quantidade) || quantidade <= 0) { setErro('Informe uma quantidade válida.'); return; }
    if (isNaN(preco) || preco < 0) { setErro('Informe um valor válido.'); return; }

    const hoje = ldData || todayISO();
    let produtoId = null;

    // categoria "produto da loja": salva/atualiza automaticamente no catálogo, como uma planilha
    if (categoriaAtiva === 'produto_loja') {
      const novaListaProdutos = upsertProduto(produtos, { nome, preco, unidade }, hoje);
      const okProduto = await salvarProdutos(novaListaProdutos);
      if (!okProduto) return;
      const encontrado = novaListaProdutos.find((p) => p.nome.toLowerCase() === nome.toLowerCase());
      produtoId = encontrado ? encontrado.id : null;
    }

    const fornecedorNome = ldFornecedor.trim();
    if (fornecedorNome) {
      salvarFornecedores(upsertFornecedor(fornecedores, fornecedorNome));
    }

    const item = {
      id: editandoId || crypto.randomUUID(),
      obraId: obraAtivaId,
      categoria: categoriaAtiva,
      produtoId,
      descricao: nome,
      unidade,
      quantidade, preco, total: quantidade * preco,
      data: hoje,
      observacao: ldObservacao.trim(),
      etapaId: ldEtapaId || null,
      fornecedorNome,
    };

    let ok;
    if (editandoId) {
      ok = await salvarLancamentos(lancamentos.map((l) => l.id === editandoId ? item : l));
      if (ok) setAviso(`"${item.descricao}" atualizado.`);
    } else {
      ok = await salvarLancamentos([item, ...lancamentos]);
      if (ok) setAviso(`"${item.descricao}" lançado.`);
    }

    if (ok) resetFormLancamento();
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-emerald-50">
        <Loader2 className="animate-spin text-green-700" size={28} />
      </div>
    );
  }

  const obraAtiva = obras.find((o) => o.id === obraAtivaId);
  const produtosOrdenados = produtosOrdenadosPorUso();

  return (
    <div className="min-h-screen bg-emerald-50 text-stone-800">
      <header className="border-b border-green-100 bg-white sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center justify-between gap-2">
          <button
            onClick={() => { setView('home'); setObraAtivaId(null); }}
            className="flex items-center gap-2 flex-shrink-0"
          >
            <span className="w-10 h-10 rounded-full bg-green-700 flex items-center justify-center flex-shrink-0">
              <Building2 size={20} className="text-white" />
            </span>
            <span className="flex flex-col leading-tight border-l border-stone-200 pl-2 ml-1">
              <span className="font-bold text-green-800 text-sm tracking-tight">CASAS ECO</span>
              <span className="text-xs text-stone-400">Custo de Obra</span>
            </span>
          </button>
          <div className="hidden sm:flex items-center gap-2">
            <span className={`flex items-center gap-1 text-xs mr-1 ${window.storage ? 'text-green-600' : 'text-red-500'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${window.storage ? 'bg-green-500' : 'bg-red-500'}`}></span>
              {window.storage ? 'Salvamento ativo' : 'Salvamento indisponível'}
            </span>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  onClick={() => setView(item.key)}
                  className={`text-sm px-3 py-1.5 rounded border flex items-center gap-1.5 ${
                    view === item.key ? 'bg-green-700 text-white border-green-700' : 'border-stone-300 text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  <Icon size={14} /> {item.label}
                </button>
              );
            })}
          </div>
          <span className="sm:hidden inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: window.storage ? '#22c55e' : '#ef4444' }}></span>
        </div>
      </header>

      {/* barra de navegação fixa embaixo, só no celular */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 flex z-20">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const ativo = view === item.key;
          return (
            <button
              key={item.key}
              onClick={() => { setView(item.key); if (item.key === 'home') setObraAtivaId(null); }}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-xs ${ativo ? 'text-green-700' : 'text-stone-400'}`}
            >
              <Icon size={18} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {aviso && (
        <div className="max-w-5xl mx-auto px-4 pt-3">
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-800 text-sm px-3 py-2 rounded">
            <CheckCircle2 size={16} /> {aviso}
          </div>
        </div>
      )}

      <main className="max-w-5xl mx-auto px-4 py-6 pb-24 sm:pb-6">
        {erro && (
          <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded">
            <AlertCircle size={16} /> {erro}
          </div>
        )}

        {/* ---------------- HOME: lista de obras ---------------- */}
        {view === 'home' && (
          <div className="space-y-6">
            {obras.length > 0 && (() => {
              const totalOrcado = obras.reduce((a, o) => a + (o.orcamento || 0), 0);
              const totalGastoGeral = obras.reduce((a, o) => a + totalObra(o.id), 0);
              const alertas = gerarAlertas();
              const hoje = todayISO();
              const em7 = new Date(); em7.setDate(em7.getDate() + 7);
              const em7ISO = em7.toISOString().slice(0, 10);
              const contasVencidas = contas.filter((c) => c.status !== 'pago' && c.vencimento < hoje);
              const contasProx7 = contas.filter((c) => c.status !== 'pago' && c.vencimento >= hoje && c.vencimento <= em7ISO);
              return (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-white border border-stone-200 rounded-lg p-3">
                      <p className="text-xs text-stone-500">Orçamento total</p>
                      <p className="text-lg font-semibold text-stone-900">{totalOrcado > 0 ? formatMoney(totalOrcado) : '—'}</p>
                    </div>
                    <div className="bg-white border border-stone-200 rounded-lg p-3">
                      <p className="text-xs text-stone-500">Gasto total</p>
                      <p className="text-lg font-semibold text-green-800">{formatMoney(totalGastoGeral)}</p>
                    </div>
                    <div className="bg-white border border-stone-200 rounded-lg p-3">
                      <p className="text-xs text-stone-500">Saldo</p>
                      <p className={`text-lg font-semibold ${totalOrcado - totalGastoGeral < 0 ? 'text-red-600' : 'text-stone-900'}`}>
                        {totalOrcado > 0 ? formatMoney(totalOrcado - totalGastoGeral) : '—'}
                      </p>
                    </div>
                    <div className="bg-white border border-stone-200 rounded-lg p-3">
                      <p className="text-xs text-stone-500">Obras ativas</p>
                      <p className="text-lg font-semibold text-stone-900">{obras.length}</p>
                    </div>
                    <div className="bg-white border border-stone-200 rounded-lg p-3">
                      <p className="text-xs text-stone-500">Gasto no mês</p>
                      <p className="text-lg font-semibold text-stone-900">{formatMoney(gastosNoPeriodo(30))}</p>
                    </div>
                    <div className="bg-white border border-stone-200 rounded-lg p-3">
                      <p className="text-xs text-stone-500">Gasto na semana</p>
                      <p className="text-lg font-semibold text-stone-900">{formatMoney(gastosNoPeriodo(7))}</p>
                    </div>
                    <div className="bg-white border border-stone-200 rounded-lg p-3">
                      <p className="text-xs text-stone-500">Contas vencidas</p>
                      <p className={`text-lg font-semibold ${contasVencidas.length > 0 ? 'text-red-600' : 'text-stone-900'}`}>{contasVencidas.length}</p>
                    </div>
                    <div className="bg-white border border-stone-200 rounded-lg p-3">
                      <p className="text-xs text-stone-500">Contas em 7 dias</p>
                      <p className="text-lg font-semibold text-stone-900">{contasProx7.length}</p>
                    </div>
                  </div>
                  {alertas.length > 0 && (
                    <div className="space-y-1.5">
                      {alertas.map((a, i) => (
                        <div key={i} className={`text-sm px-3 py-2 rounded border flex items-center gap-2 ${
                          a.tipo === 'red' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-amber-50 border-amber-200 text-amber-700'
                        }`}>
                          <AlertCircle size={14} className="flex-shrink-0" /> {a.texto}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="bg-white border border-stone-200 rounded-lg p-4 flex flex-col sm:flex-row flex-wrap gap-3 items-end">
              <div className="w-full sm:flex-1 min-w-0">
                <label className="text-xs text-stone-500 block mb-1">Nova obra</label>
                <input
                  value={novaObraNome}
                  onChange={(e) => setNovaObraNome(e.target.value)}
                  placeholder="Ex: Residencial Vista Alegre"
                  className="w-full border border-stone-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>
              <div className="w-full sm:w-40">
                <label className="text-xs text-stone-500 block mb-1">Orçamento (opcional)</label>
                <input
                  value={novaObraOrcamento}
                  onChange={(e) => setNovaObraOrcamento(e.target.value)}
                  placeholder="0,00"
                  inputMode="decimal"
                  className="w-full border border-stone-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>
              <button type="button" onClick={criarObra} className="w-full sm:w-auto bg-green-700 text-white text-sm px-4 py-2 rounded hover:bg-green-800 flex items-center justify-center gap-1.5">
                <Plus size={15} /> Criar obra
              </button>
            </div>

            {obras.length === 0 ? (
              <p className="text-center text-stone-400 py-10">Nenhuma obra cadastrada. Crie a primeira acima.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {obras.map((o) => {
                  const gasto = totalObra(o.id);
                  const pct = o.orcamento ? Math.min(100, (gasto / o.orcamento) * 100) : null;
                  return (
                    <div key={o.id} className="bg-white border border-stone-200 rounded-lg p-4 hover:border-green-300 transition-colors">
                      <button onClick={() => abrirObra(o.id)} className="w-full text-left">
                        <p className="font-semibold text-stone-900">{o.nome}</p>
                        <p className="text-xs text-stone-400 mb-3">desde {formatDateBR(o.criadoEm)}</p>
                        <p className="text-2xl font-semibold text-green-800 mb-1">{formatMoney(gasto)}</p>
                        {o.orcamento ? (
                          <div className="mb-3">
                            <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                              <div className={`h-full ${pct >= 100 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${pct}%` }}></div>
                            </div>
                            <p className="text-xs text-stone-400 mt-1">{pct.toFixed(0)}% de {formatMoney(o.orcamento)}</p>
                          </div>
                        ) : (
                          <p className="text-xs text-stone-300 mb-3">sem orçamento definido</p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(CATEGORIAS).map(([key, cat]) => {
                            const Icon = cat.icon;
                            const c = CLS[cat.cls];
                            return (
                              <span key={key} className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${c.bg} ${c.text} border ${c.border}`}>
                                <Icon size={12} /> {formatMoney(totalObraCategoria(o.id, key))}
                              </span>
                            );
                          })}
                        </div>
                      </button>
                      <div className="flex items-center gap-3 mt-3">
                        <button onClick={() => definirOrcamento(o.id)} className="text-xs text-stone-400 hover:text-green-700 flex items-center gap-1">
                          <Pencil size={12} /> {o.orcamento ? 'Editar orçamento' : 'Definir orçamento'}
                        </button>
                        <button onClick={() => removerObra(o.id, o.nome)} className="text-xs text-stone-400 hover:text-red-600 flex items-center gap-1">
                          <Trash2 size={12} /> Remover obra
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ---------------- CATÁLOGO DE PRODUTOS (global) ---------------- */}
        {view === 'catalogo' && (
          <div className="space-y-6">
            <button onClick={() => setView('home')} className="text-sm text-stone-500 hover:text-stone-800 flex items-center gap-1">
              <ArrowLeft size={14} /> Voltar
            </button>

            <div className="bg-white border-2 border-green-200 rounded-lg p-4">
              <button
                onClick={() => setImportAberto((v) => !v)}
                className="text-sm font-semibold text-white bg-green-700 hover:bg-green-800 px-3 py-2 rounded flex items-center gap-1.5"
              >
                <Upload size={15} /> Importar produtos do PDV
              </button>

              {importAberto && (
                <div className="mt-4 space-y-3">
                  <p className="text-xs text-stone-500">
                    Exporte a lista do seu sistema PDV como CSV ou texto (uma linha por produto: <span className="font-mono">nome, preço</span>, opcionalmente uma 3ª coluna com a unidade) e envie o arquivo, ou cole o conteúdo abaixo.
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="text-sm px-3 py-1.5 rounded border border-stone-300 hover:bg-stone-50 cursor-pointer flex items-center gap-1.5">
                      <Upload size={14} /> Escolher arquivo
                      <input type="file" accept=".csv,.txt" onChange={handleArquivoImport} className="hidden" />
                    </label>
                    <span className="text-xs text-stone-400">ou cole abaixo</span>
                  </div>
                  <textarea
                    value={importTexto}
                    onChange={(e) => setImportTexto(e.target.value)}
                    rows={5}
                    placeholder={'Cimento CP-II 50kg, 34.90, saco\nAreia média, 65.00, m³\nVergalhão 3/8, 28.50, un'}
                    className="w-full border border-stone-300 rounded px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={analisarImportacao}
                      disabled={!importTexto.trim()}
                      className="bg-stone-800 text-white text-sm px-3 py-1.5 rounded hover:bg-stone-700 disabled:opacity-40"
                    >
                      Analisar
                    </button>
                    {importPreview && (
                      <button
                        onClick={() => { setImportPreview(null); setImportTexto(''); setImportAberto(false); }}
                        className="text-sm px-3 py-1.5 rounded border border-stone-300 text-stone-600 hover:bg-stone-50 flex items-center gap-1"
                      >
                        <X size={14} /> Cancelar
                      </button>
                    )}
                  </div>

                  {importPreview && (
                    <div className="border border-stone-200 rounded-lg p-3 bg-stone-50 space-y-2">
                      <p className="text-sm text-stone-700">
                        <strong>{importPreview.novos.length}</strong> produto(s) novo(s) e{' '}
                        <strong>{importPreview.atualizados.length}</strong> com preço atualizado
                        {importPreview.invalidas > 0 && <> — {importPreview.invalidas} linha(s) ignorada(s)</>}.
                      </p>
                      <div className="max-h-40 overflow-y-auto text-xs space-y-1">
                        {importPreview.atualizados.slice(0, 20).map((it, i) => (
                          <div key={'a' + i} className="flex justify-between text-stone-600">
                            <span>{it.nome}</span>
                            <span>{formatMoney(it.precoAntigo)} → <strong>{formatMoney(it.preco)}</strong></span>
                          </div>
                        ))}
                        {importPreview.novos.slice(0, 20).map((it, i) => (
                          <div key={'n' + i} className="flex justify-between text-green-700">
                            <span>{it.nome} <span className="text-xs uppercase">novo</span></span>
                            <span>{formatMoney(it.preco)}</span>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={confirmarImportacao}
                        className="bg-green-700 text-white text-sm px-3 py-1.5 rounded hover:bg-green-800 flex items-center gap-1.5"
                      >
                        <CheckCircle2 size={14} /> Confirmar importação
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="bg-white border border-stone-200 rounded-lg p-4 flex flex-col sm:flex-row flex-wrap gap-3 items-end">
              <div className="w-full sm:flex-1 min-w-0">
                <label className="text-xs text-stone-500 block mb-1">Produto</label>
                <input
                  value={npNome}
                  onChange={(e) => setNpNome(upperInput(e.target.value))}
                  placeholder="Ex: Cimento CP-II 50kg"
                  list="lista-produtos-existentes"
                  className="w-full border border-stone-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
                <datalist id="lista-produtos-existentes">
                  {produtos.map((p) => <option key={p.id} value={p.nome} />)}
                </datalist>
              </div>
              <div className="w-full sm:w-28">
                <label className="text-xs text-stone-500 block mb-1">Unidade</label>
                <input value={npUnidade} onChange={(e) => setNpUnidade(upperInput(e.target.value))} placeholder="UN, SACO, M³..."
                  className="w-full border border-stone-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
              </div>
              <div className="w-full sm:w-32">
                <label className="text-xs text-stone-500 block mb-1">Preço (R$)</label>
                <input value={npPreco} onChange={(e) => setNpPreco(e.target.value)} placeholder="0,00" inputMode="decimal"
                  className="w-full border border-stone-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
              </div>
              <button type="button" onClick={cadastrarProduto} className="w-full sm:w-auto bg-green-700 text-white text-sm px-4 py-2 rounded hover:bg-green-800 flex items-center justify-center gap-1.5">
                <Plus size={15} /> {npEditandoId ? 'Salvar edição' : 'Salvar'}
              </button>
              {npEditandoId && (
                <button type="button" onClick={cancelarEdicaoProduto} className="w-full sm:w-auto text-sm px-4 py-2 rounded border border-stone-300 text-stone-600 hover:bg-stone-50">
                  Cancelar
                </button>
              )}
            </div>

            <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-stone-100 text-stone-500 text-xs uppercase">
                  <tr>
                    <th className="text-left px-3 py-2">Produto</th>
                    <th className="text-left px-3 py-2">Unidade</th>
                    <th className="text-right px-3 py-2">Preço atual</th>
                    <th className="text-left px-3 py-2">Atualizado em</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {produtos.length === 0 && (
                    <tr><td colSpan={5} className="px-3 py-6 text-center text-stone-400">Nenhum produto cadastrado ainda.</td></tr>
                  )}
                  {produtos.slice().sort((a, b) => a.nome.localeCompare(b.nome)).map((p) => {
                    const anterior = p.historico && p.historico.length > 0 ? p.historico[p.historico.length - 1] : null;
                    const variacao = anterior && anterior.preco > 0 ? ((p.preco - anterior.preco) / anterior.preco) * 100 : null;
                    return (
                      <tr key={p.id} className="border-t border-stone-100">
                        <td className="px-3 py-2">{p.nome}</td>
                        <td className="px-3 py-2 text-stone-500">{p.unidade}</td>
                        <td className="px-3 py-2 text-right">
                          <div className="font-medium">{formatMoney(p.preco)}</div>
                          {variacao !== null && Math.abs(variacao) >= 0.5 && (
                            <div className={`text-xs flex items-center justify-end gap-0.5 ${variacao > 0 ? 'text-red-500' : 'text-green-600'}`}>
                              {variacao > 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                              {Math.abs(variacao).toFixed(0)}%
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-stone-500">{formatDateBR(p.atualizadoEm)}</td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          <button onClick={() => editarProduto(p)} className="text-stone-400 hover:text-green-700 mr-2" title="Editar produto">
                            <Pencil size={15} />
                          </button>
                          <button onClick={() => removerProduto(p.id, p.nome)} className="text-stone-400 hover:text-red-600" title="Remover produto">
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ---------------- FORNECEDORES ---------------- */}
        {view === 'fornecedores' && (() => {
          const nomeExistente = fornecedores.find((f) => f.nome.toLowerCase() === fnNome.trim().toLowerCase());
          return (
            <div className="space-y-6">
              <div className="bg-white border border-stone-200 rounded-lg p-4 flex flex-col sm:flex-row flex-wrap gap-3 items-end">
                <div className="w-full sm:flex-1 min-w-0">
                  <label className="text-xs text-stone-500 block mb-1">Fornecedor</label>
                  <input value={fnNome} onChange={(e) => setFnNome(e.target.value)} placeholder="Ex: Depósito São José"
                    list="lista-fornecedores-cadastro"
                    className="w-full border border-stone-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                  <datalist id="lista-fornecedores-cadastro">
                    {fornecedores.map((f) => <option key={f.id} value={f.nome} />)}
                  </datalist>
                </div>
                <div className="w-full sm:w-40">
                  <label className="text-xs text-stone-500 block mb-1">Telefone</label>
                  <input value={fnTelefone} onChange={(e) => setFnTelefone(e.target.value)} placeholder="(00) 00000-0000"
                    className="w-full border border-stone-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                </div>
                <div className="w-full sm:w-40">
                  <label className="text-xs text-stone-500 block mb-1">Categoria</label>
                  <input value={fnCategoria} onChange={(e) => setFnCategoria(e.target.value)} placeholder="Ex: Materiais"
                    className="w-full border border-stone-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                </div>
                <button type="button" onClick={cadastrarFornecedor} className="w-full sm:w-auto bg-green-700 text-white text-sm px-4 py-2 rounded hover:bg-green-800 flex items-center justify-center gap-1.5">
                  <Plus size={15} /> {nomeExistente ? 'Atualizar' : 'Salvar'}
                </button>
              </div>

              {fornecedores.length === 0 ? (
                <p className="text-center text-stone-400 py-10">Nenhum fornecedor cadastrado ainda. Eles também entram aqui sozinhos quando você digita o nome num lançamento.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {fornecedores.slice().sort((a, b) => a.nome.localeCompare(b.nome)).map((f) => {
                    const stats = estatisticasFornecedor(f.nome);
                    return (
                      <div key={f.id} className="bg-white border border-stone-200 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-stone-900">{f.nome}</p>
                            {(f.telefone || f.categoria) && (
                              <p className="text-xs text-stone-400 flex items-center gap-2 mt-0.5">
                                {f.telefone && <span className="flex items-center gap-1"><Phone size={11} /> {f.telefone}</span>}
                                {f.categoria && <span>{f.categoria}</span>}
                              </p>
                            )}
                          </div>
                          <button onClick={() => removerFornecedor(f.id, f.nome)} className="text-stone-400 hover:text-red-600" title="Remover fornecedor">
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                          <div>
                            <p className="text-xs text-stone-400">Total comprado</p>
                            <p className="font-medium text-stone-800">{formatMoney(stats.total)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-stone-400">Nº de compras</p>
                            <p className="font-medium text-stone-800">{stats.numero}</p>
                          </div>
                          <div>
                            <p className="text-xs text-stone-400">Última compra</p>
                            <p className="font-medium text-stone-800">{stats.ultima ? formatDateBR(stats.ultima) : '—'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-stone-400">Obras</p>
                            <p className="font-medium text-stone-800">{stats.obrasRelacionadas.length > 0 ? stats.obrasRelacionadas.join(', ') : '—'}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* ---------------- CONTAS A PAGAR ---------------- */}
        {view === 'contas' && (() => {
          const grupos = {
            vencida: { label: 'Vencidas', cls: 'text-red-700 bg-red-50 border-red-200' },
            hoje: { label: 'Vencem hoje', cls: 'text-amber-700 bg-amber-50 border-amber-200' },
            proximos7: { label: 'Próximos 7 dias', cls: 'text-stone-700 bg-stone-50 border-stone-200' },
            proximos30: { label: 'Próximos 30 dias', cls: 'text-stone-700 bg-stone-50 border-stone-200' },
            futuro: { label: 'Mais adiante', cls: 'text-stone-700 bg-stone-50 border-stone-200' },
            pago: { label: 'Pagas', cls: 'text-green-700 bg-green-50 border-green-200' },
          };
          const contasPorGrupo = {};
          Object.keys(grupos).forEach((g) => { contasPorGrupo[g] = []; });
          contas.forEach((c) => { contasPorGrupo[classificarConta(c)].push(c); });

          return (
            <div className="space-y-6">
              <div className="bg-white border border-stone-200 rounded-lg p-4 flex flex-col sm:flex-row flex-wrap gap-3 items-end">
                <div className="w-full sm:flex-1 min-w-0">
                  <label className="text-xs text-stone-500 block mb-1">Descrição</label>
                  <input value={ctDescricao} onChange={(e) => setCtDescricao(e.target.value)} placeholder="Ex: Aluguel do andaime"
                    className="w-full border border-stone-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                </div>
                <div className="w-full sm:w-32">
                  <label className="text-xs text-stone-500 block mb-1">Valor total (R$)</label>
                  <input value={ctValor} onChange={(e) => setCtValor(e.target.value)} placeholder="0,00" inputMode="decimal"
                    className="w-full border border-stone-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                </div>
                <div className="w-full sm:w-40">
                  <label className="text-xs text-stone-500 block mb-1">1º vencimento</label>
                  <input type="date" value={ctVencimento} onChange={(e) => setCtVencimento(e.target.value)}
                    className="w-full border border-stone-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                </div>
                <div className="w-full sm:w-40">
                  <label className="text-xs text-stone-500 block mb-1">Obra (opcional)</label>
                  <select value={ctObraId} onChange={(e) => setCtObraId(e.target.value)}
                    className="w-full border border-stone-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
                    <option value="">Nenhuma</option>
                    {obras.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
                  </select>
                </div>
                <div className="w-full sm:w-40">
                  <label className="text-xs text-stone-500 block mb-1">Fornecedor (opcional)</label>
                  <input value={ctFornecedor} onChange={(e) => setCtFornecedor(e.target.value)} placeholder="Nome"
                    list="lista-fornecedores-conta"
                    className="w-full border border-stone-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                  <datalist id="lista-fornecedores-conta">
                    {fornecedores.map((f) => <option key={f.id} value={f.nome} />)}
                  </datalist>
                </div>
                <div className="w-full sm:w-28">
                  <label className="text-xs text-stone-500 block mb-1">Parcelas</label>
                  <input value={ctParcelas} onChange={(e) => setCtParcelas(e.target.value)} placeholder="1" inputMode="numeric"
                    className="w-full border border-stone-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                </div>
                <button type="button" onClick={aoCriarConta} className="w-full sm:w-auto bg-green-700 text-white text-sm px-4 py-2 rounded hover:bg-green-800 flex items-center justify-center gap-1.5">
                  <Plus size={15} /> Criar conta
                </button>
              </div>

              {contas.length === 0 ? (
                <p className="text-center text-stone-400 py-10">Nenhuma conta cadastrada ainda.</p>
              ) : (
                Object.entries(grupos).map(([key, g]) => {
                  const lista = contasPorGrupo[key];
                  if (lista.length === 0) return null;
                  const totalGrupo = lista.reduce((a, c) => a + c.valor, 0);
                  return (
                    <div key={key}>
                      <div className={`text-sm font-medium px-3 py-1.5 rounded-t border ${g.cls} flex justify-between`}>
                        <span>{g.label} ({lista.length})</span>
                        <span>{formatMoney(totalGrupo)}</span>
                      </div>
                      <div className="bg-white border border-t-0 border-stone-200 rounded-b-lg overflow-hidden">
                        {lista.map((c) => {
                          const obraNome = c.obraId ? (obras.find((o) => o.id === c.obraId) || {}).nome : null;
                          return (
                            <div key={c.id} className="px-3 py-2 border-t border-stone-100 first:border-t-0 flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <p className={`text-sm ${c.status === 'pago' ? 'line-through text-stone-400' : 'text-stone-800'}`}>{c.descricao}</p>
                                <p className="text-xs text-stone-400">
                                  vence {formatDateBR(c.vencimento)}
                                  {obraNome && ` · ${obraNome}`}
                                  {c.fornecedorNome && ` · ${c.fornecedorNome}`}
                                </p>
                              </div>
                              <div className="flex items-center gap-3 flex-shrink-0">
                                <span className="text-sm font-medium">{formatMoney(c.valor)}</span>
                                <button onClick={() => marcarContaPaga(c.id)} className={`text-xs px-2 py-1 rounded border ${c.status === 'pago' ? 'border-stone-300 text-stone-500' : 'border-green-300 text-green-700 hover:bg-green-50'}`}>
                                  {c.status === 'pago' ? 'Reabrir' : 'Marcar paga'}
                                </button>
                                <button onClick={() => removerConta(c.id, c.descricao)} className="text-stone-400 hover:text-red-600">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          );
        })()}

        {/* ---------------- RELATÓRIOS ---------------- */}
        {view === 'relatorios' && (() => {
          const porCategoria = gastosPorCategoriaGeral();
          const porFornecedor = gastosPorFornecedorGeral();
          const totalGeral = lancamentos.reduce((a, l) => a + l.total, 0);
          return (
            <div className="space-y-6">
              <div className="bg-white border border-stone-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-stone-700 mb-3">Exportar dados</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={exportarTudoCSV} className="text-sm px-3 py-1.5 rounded border border-stone-300 text-stone-600 hover:bg-stone-50 flex items-center gap-1.5">
                    <Download size={14} /> Extrato completo (CSV)
                  </button>
                  <button onClick={exportarContasCSV} className="text-sm px-3 py-1.5 rounded border border-stone-300 text-stone-600 hover:bg-stone-50 flex items-center gap-1.5">
                    <Download size={14} /> Contas a pagar (CSV)
                  </button>
                </div>
                {obras.length > 0 && (
                  <>
                    <p className="text-xs text-stone-500 mt-4 mb-2">Exportar uma obra específica:</p>
                    <div className="flex flex-wrap gap-2">
                      {obras.map((o) => (
                        <button key={o.id} onClick={() => exportarObraCSV(o)} className="text-xs px-2.5 py-1 rounded border border-stone-300 text-stone-600 hover:bg-stone-50 flex items-center gap-1">
                          <Download size={12} /> {o.nome}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                <p className="text-xs text-stone-400 mt-3">Os arquivos CSV abrem direto no Excel, Google Sheets ou similar.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white border border-stone-200 rounded-lg p-4">
                  <p className="text-sm font-semibold text-stone-700 mb-3">Gastos por categoria</p>
                  {porCategoria.length === 0 ? (
                    <p className="text-xs text-stone-400">Sem lançamentos ainda.</p>
                  ) : (
                    <div className="space-y-2">
                      {porCategoria.map((c) => (
                        <div key={c.label}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-stone-600">{c.label}</span>
                            <span className="font-medium text-stone-800">{formatMoney(c.total)}</span>
                          </div>
                          <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                            <div className="h-full bg-green-600" style={{ width: `${totalGeral > 0 ? (c.total / totalGeral) * 100 : 0}%` }}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white border border-stone-200 rounded-lg p-4">
                  <p className="text-sm font-semibold text-stone-700 mb-3">Gastos por fornecedor</p>
                  {porFornecedor.length === 0 ? (
                    <p className="text-xs text-stone-400">Nenhum lançamento com fornecedor informado ainda.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {porFornecedor.slice(0, 8).map((f) => (
                        <div key={f.nome} className="flex justify-between text-sm">
                          <span className="text-stone-600">{f.nome}</span>
                          <span className="font-medium text-stone-800">{formatMoney(f.total)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* ---------------- DETALHE DA OBRA ---------------- */}
        {view === 'obra' && obraAtiva && (
          <div className="space-y-6">
            <button onClick={() => { setView('home'); setObraAtivaId(null); }} className="text-sm text-stone-500 hover:text-stone-800 flex items-center gap-1">
              <ArrowLeft size={14} /> Todas as obras
            </button>

            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-xl font-semibold text-stone-900">{obraAtiva.nome}</h2>
                <p className="text-xs text-stone-400">desde {formatDateBR(obraAtiva.criadoEm)}</p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => exportarObraCSV(obraAtiva)} className="text-sm px-3 py-1.5 rounded border border-stone-300 text-stone-600 hover:bg-stone-50 flex items-center gap-1.5">
                  <Download size={14} /> CSV
                </button>
                <button onClick={() => copiarResumoObra(obraAtiva)} className="text-sm px-3 py-1.5 rounded border border-stone-300 text-stone-600 hover:bg-stone-50 flex items-center gap-1.5">
                  <Copy size={14} /> Copiar resumo
                </button>
                <div className="text-right">
                  <p className="text-xs text-stone-500">Total da obra</p>
                  <p className="text-xl font-semibold text-green-800">{formatMoney(totalObra(obraAtiva.id))}</p>
                </div>
              </div>
            </div>

            {obraAtiva.orcamento ? (
              <div className="bg-white border border-stone-200 rounded-lg p-3">
                <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${totalObra(obraAtiva.id) >= obraAtiva.orcamento ? 'bg-red-500' : 'bg-green-500'}`}
                    style={{ width: `${Math.min(100, (totalObra(obraAtiva.id) / obraAtiva.orcamento) * 100)}%` }}
                  ></div>
                </div>
                <p className="text-xs text-stone-500 mt-1.5">
                  {formatMoney(totalObra(obraAtiva.id))} de {formatMoney(obraAtiva.orcamento)} orçados
                  {' — '}
                  {totalObra(obraAtiva.id) > obraAtiva.orcamento
                    ? `estourou em ${formatMoney(totalObra(obraAtiva.id) - obraAtiva.orcamento)}`
                    : `restam ${formatMoney(obraAtiva.orcamento - totalObra(obraAtiva.id))}`}
                  {' · '}
                  <button onClick={() => definirOrcamento(obraAtiva.id)} className="underline hover:text-green-700">editar</button>
                </p>
              </div>
            ) : (
              <button onClick={() => definirOrcamento(obraAtiva.id)} className="text-xs text-stone-400 hover:text-green-700 flex items-center gap-1">
                <Pencil size={12} /> Definir orçamento para esta obra
              </button>
            )}

            <nav className="flex gap-2">
              {Object.entries(CATEGORIAS).map(([key, cat]) => {
                const Icon = cat.icon;
                const c = CLS[cat.cls];
                const ativo = categoriaAtiva === key;
                return (
                  <button
                    key={key}
                    onClick={() => { setCategoriaAtiva(key); resetFormLancamento(); }}
                    className={`flex-1 text-sm px-3 py-2 rounded-lg border flex items-center justify-center gap-1.5 ${
                      ativo ? `${c.solid} text-white border-transparent` : `bg-white ${c.text} ${c.border}`
                    }`}
                  >
                    <Icon size={15} /> {cat.label}
                    <span className="ml-1 opacity-80">{formatMoney(totalObraCategoria(obraAtiva.id, key))}</span>
                  </button>
                );
              })}
            </nav>

            {(() => {
              const orcCat = obraAtiva.orcamentoCategorias ? obraAtiva.orcamentoCategorias[categoriaAtiva] : null;
              const gastoCat = totalObraCategoria(obraAtiva.id, categoriaAtiva);
              return (
                <div className="bg-white border border-stone-200 rounded-lg p-3">
                  {orcCat ? (
                    <>
                      <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${gastoCat >= orcCat ? 'bg-red-500' : 'bg-green-500'}`}
                          style={{ width: `${Math.min(100, (gastoCat / orcCat) * 100)}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-stone-500 mt-1.5">
                        Orçamento de {CATEGORIAS[categoriaAtiva].label}: {formatMoney(gastoCat)} de {formatMoney(orcCat)}
                        {' · '}
                        <button onClick={() => definirOrcamentoCategoria(obraAtiva.id, categoriaAtiva)} className="underline hover:text-green-700">editar</button>
                      </p>
                    </>
                  ) : (
                    <button onClick={() => definirOrcamentoCategoria(obraAtiva.id, categoriaAtiva)} className="text-xs text-stone-400 hover:text-green-700 flex items-center gap-1">
                      <Pencil size={12} /> Definir orçamento para {CATEGORIAS[categoriaAtiva].label}
                    </button>
                  )}
                </div>
              );
            })()}

            {/* ---- Etapas da obra ---- */}
            <div className="bg-white border border-stone-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-stone-700 mb-3">Etapas da obra</p>
              <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-end mb-4">
                <div className="w-full sm:flex-1 min-w-0">
                  <label className="text-xs text-stone-500 block mb-1">Nome da etapa</label>
                  <input value={novaEtapaNome} onChange={(e) => setNovaEtapaNome(e.target.value)} placeholder="Ex: Fundação, Alvenaria, Cobertura..."
                    className="w-full border border-stone-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                </div>
                <div className="w-full sm:w-40">
                  <label className="text-xs text-stone-500 block mb-1">Orçamento (opcional)</label>
                  <input value={novaEtapaOrcamento} onChange={(e) => setNovaEtapaOrcamento(e.target.value)} placeholder="0,00" inputMode="decimal"
                    className="w-full border border-stone-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                </div>
                <button type="button" onClick={() => criarEtapa(obraAtiva.id)} className="w-full sm:w-auto bg-stone-800 text-white text-sm px-4 py-2 rounded hover:bg-stone-700 flex items-center justify-center gap-1.5">
                  <Plus size={15} /> Adicionar etapa
                </button>
              </div>

              {etapas.filter((et) => et.obraId === obraAtiva.id).length === 0 ? (
                <p className="text-xs text-stone-400">Nenhuma etapa criada ainda. Etapas ajudam a saber onde o dinheiro está indo dentro da obra (fundação, alvenaria, cobertura...).</p>
              ) : (
                <div className="space-y-2">
                  {etapas.filter((et) => et.obraId === obraAtiva.id).map((et) => {
                    const gasto = totalEtapa(et.id);
                    const pct = et.orcamento ? Math.min(100, (gasto / et.orcamento) * 100) : null;
                    return (
                      <div key={et.id} className="border border-stone-100 rounded p-2.5">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-stone-800">{et.nome}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-stone-600">{formatMoney(gasto)}{et.orcamento ? ` / ${formatMoney(et.orcamento)}` : ''}</p>
                            <button onClick={() => removerEtapa(et.id, et.nome)} className="text-stone-400 hover:text-red-600">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        {et.orcamento && (
                          <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden mt-1.5">
                            <div className={`h-full ${pct >= 100 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${pct}%` }}></div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-white border border-stone-200 rounded-lg p-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 items-end">
              {categoriaAtiva === 'produto_loja' ? (
                <div className="col-span-2 sm:col-span-4 lg:col-span-2">
                  <label className="text-xs text-stone-500 block mb-1">Produto</label>
                  <input
                    value={ldDescricao}
                    onChange={(e) => aoDigitarProdutoLoja(e.target.value)}
                    placeholder="Digite o nome — se já existir, o preço vem sozinho"
                    list="lista-produtos-lancamento"
                    className="w-full border border-stone-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                  <datalist id="lista-produtos-lancamento">
                    {produtosOrdenados.map((p) => <option key={p.id} value={p.nome} />)}
                  </datalist>
                </div>
              ) : (
                <div className="col-span-2 sm:col-span-4 lg:col-span-2">
                  <label className="text-xs text-stone-500 block mb-1">Descrição</label>
                  <input
                    value={ldDescricao}
                    onChange={(e) => setLdDescricao(upperInput(e.target.value))}
                    placeholder={categoriaAtiva === 'mao_de_obra' ? 'Ex: Pedreiro - diária' : 'Ex: Areia lavada'}
                    className="w-full border border-stone-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                </div>
              )}
              <div className="col-span-1">
                <label className="text-xs text-stone-500 block mb-1">Qtd.</label>
                <input value={ldQuantidade} onChange={(e) => setLdQuantidade(e.target.value)} inputMode="decimal"
                  className="w-full border border-stone-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
              </div>
              <div className="col-span-1">
                <label className="text-xs text-stone-500 block mb-1">Unid.</label>
                <input value={ldUnidade} onChange={(e) => setLdUnidade(upperInput(e.target.value))} placeholder="UN, M³..."
                  className="w-full border border-stone-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
              </div>
              <div className="col-span-1">
                <label className="text-xs text-stone-500 block mb-1">Valor (R$)</label>
                <input value={ldPreco} onChange={(e) => setLdPreco(e.target.value)} placeholder="0,00" inputMode="decimal"
                  className="w-full border border-stone-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
              </div>
              <div className="col-span-1">
                <label className="text-xs text-stone-500 block mb-1">Data</label>
                <input type="date" value={ldData} onChange={(e) => setLdData(e.target.value)}
                  className="w-full border border-stone-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
              </div>
              {etapas.filter((et) => et.obraId === obraAtiva.id).length > 0 && (
                <div className="col-span-1">
                  <label className="text-xs text-stone-500 block mb-1">Etapa (opc.)</label>
                  <select value={ldEtapaId} onChange={(e) => setLdEtapaId(e.target.value)}
                    className="w-full border border-stone-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
                    <option value="">Nenhuma</option>
                    {etapas.filter((et) => et.obraId === obraAtiva.id).map((et) => (
                      <option key={et.id} value={et.id}>{et.nome}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="col-span-2 sm:col-span-2 lg:col-span-2">
                <label className="text-xs text-stone-500 block mb-1">Fornecedor (opcional)</label>
                <input value={ldFornecedor} onChange={(e) => setLdFornecedor(e.target.value)} placeholder="Ex: Depósito São José"
                  list="lista-fornecedores-lancamento"
                  className="w-full border border-stone-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                <datalist id="lista-fornecedores-lancamento">
                  {fornecedores.map((f) => <option key={f.id} value={f.nome} />)}
                </datalist>
              </div>
              <div className="col-span-2 sm:col-span-2 lg:col-span-2">
                <label className="text-xs text-stone-500 block mb-1">Observação (opcional)</label>
                <input value={ldObservacao} onChange={(e) => setLdObservacao(e.target.value)} placeholder="Ex: comprado em outra loja"
                  className="w-full border border-stone-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
              </div>
              <div className="col-span-2 sm:col-span-4 lg:col-span-2 flex gap-2">
                <button type="button" onClick={lancar} className={`flex-1 text-white text-sm px-4 py-2 rounded flex items-center justify-center gap-1.5 ${CLS[CATEGORIAS[categoriaAtiva].cls].solid} hover:opacity-90`}>
                  <Plus size={15} /> {editandoId ? 'Salvar edição' : 'Lançar'}
                </button>
                {editandoId && (
                  <button type="button" onClick={resetFormLancamento} className="flex-1 text-sm px-4 py-2 rounded border border-stone-300 text-stone-600 hover:bg-stone-50">
                    Cancelar
                  </button>
                )}
              </div>
            </div>
            {categoriaAtiva === 'produto_loja' && produtos.length === 0 && (
              <p className="text-xs text-stone-400 -mt-3">Ainda não tem produto cadastrado — pode digitar o nome, a unidade e o preço aqui mesmo que ele já entra no catálogo sozinho.</p>
            )}

            {(() => {
              const listaFiltrada = lancamentos
                .filter((l) => l.obraId === obraAtiva.id && l.categoria === categoriaAtiva)
                .filter((l) => {
                  const q = buscaLancamento.trim().toLowerCase();
                  if (!q) return true;
                  return l.descricao.toLowerCase().includes(q)
                    || (l.fornecedorNome || '').toLowerCase().includes(q)
                    || (l.observacao || '').toLowerCase().includes(q);
                });
              return (
                <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
                  <div className="p-2 border-b border-stone-100">
                    <input
                      value={buscaLancamento}
                      onChange={(e) => setBuscaLancamento(e.target.value)}
                      placeholder="Buscar por descrição, fornecedor ou observação..."
                      className="w-full border border-stone-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                    />
                  </div>
                  <table className="w-full text-sm">
                    <thead className="bg-stone-100 text-stone-500 text-xs uppercase">
                      <tr>
                        <th className="text-left px-3 py-2">Data</th>
                        <th className="text-left px-3 py-2">Descrição</th>
                        <th className="text-right px-3 py-2">Qtd.</th>
                        <th className="text-right px-3 py-2">Valor unit.</th>
                        <th className="text-right px-3 py-2">Total</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {listaFiltrada.length === 0 && (
                        <tr><td colSpan={6} className="px-3 py-6 text-center text-stone-400">
                          {buscaLancamento ? 'Nada encontrado para essa busca.' : 'Nenhum lançamento nesta categoria ainda.'}
                        </td></tr>
                      )}
                      {listaFiltrada.map((l) => (
                        <tr key={l.id} className="border-t border-stone-100">
                          <td className="px-3 py-2 text-stone-500">{formatDateBR(l.data)}</td>
                          <td className="px-3 py-2">
                            {l.descricao}
                            {l.etapaId && (() => {
                              const et = etapas.find((x) => x.id === l.etapaId);
                              return et ? <div className="text-xs text-green-700">📍 {et.nome}</div> : null;
                            })()}
                            {l.fornecedorNome && <div className="text-xs text-stone-500">🏪 {l.fornecedorNome}</div>}
                            {l.observacao && <div className="text-xs text-stone-400 italic">{l.observacao}</div>}
                          </td>
                          <td className="px-3 py-2 text-right">{l.quantidade} {l.unidade}</td>
                          <td className="px-3 py-2 text-right">{formatMoney(l.preco)}</td>
                          <td className="px-3 py-2 text-right font-medium">{formatMoney(l.total)}</td>
                          <td className="px-3 py-2 text-right whitespace-nowrap">
                            <button onClick={() => editarLancamento(l)} className="text-stone-400 hover:text-green-700 mr-2" title="Editar">
                              <Pencil size={15} />
                            </button>
                            <button onClick={() => removerLancamento(l.id)} className="text-stone-400 hover:text-red-600" title="Remover">
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        )}
      </main>

      {dialogo && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-5 w-full max-w-sm">
            <p className="text-sm text-stone-700 mb-4">{dialogo.mensagem}</p>
            {dialogo.tipo === 'prompt' && (
              <input
                autoFocus
                value={dialogo.valor}
                onChange={(e) => setDialogo({ ...dialogo, valor: e.target.value })}
                onKeyDown={(e) => { if (e.key === 'Enter') { dialogo.onConfirmar(dialogo.valor); setDialogo(null); } }}
                placeholder="0,00"
                inputMode="decimal"
                className="w-full border border-stone-300 rounded px-2 py-1.5 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => setDialogo(null)} className="text-sm px-3 py-1.5 rounded border border-stone-300 text-stone-600 hover:bg-stone-50">
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (dialogo.tipo === 'prompt') dialogo.onConfirmar(dialogo.valor);
                  else dialogo.onConfirmar();
                  setDialogo(null);
                }}
                className="text-sm px-3 py-1.5 rounded bg-green-700 text-white hover:bg-green-800"
              >
                {dialogo.tipo === 'prompt' ? 'Salvar' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
