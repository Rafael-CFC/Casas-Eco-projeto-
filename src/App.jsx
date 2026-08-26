import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Package, Plus, Trash2, AlertCircle,
  ArrowLeft,
  Upload, ArrowUpRight, ArrowDownRight, CheckCircle2, X, Pencil, Copy,
  Home, Users, Receipt, FileText, Download, LayoutDashboard,
  ChevronsLeft, ChevronsRight, ShieldCheck, Lock, RotateCcw, ClipboardCheck,
  FileSignature, Settings, MoreHorizontal, Wallet, Boxes, Search, NotebookPen, Trees,
  LogOut, KeyRound,
} from 'lucide-react';
import { upperInput, normalizeProductName, normalizeUnit } from './textUtils';
import { todayISO, formatDateBR, formatMoney, parsePrecoBR, CATEGORIAS, CLS } from './domain';
import FinanceiroDashboard from './dashboard/FinanceiroDashboard';
import ToastStack from './ui/Toast';
import TrocarSenha from './auth/TrocarSenha';
import { sair } from './auth/authStore';
import { DashboardSkeleton } from './ui/Skeleton';
import SeletorTema from './ui/SeletorTema';
import FinalizarObraModal from './obra/FinalizarObraModal';
import SucessoFinalizacaoModal from './obra/SucessoFinalizacaoModal';
import ResumoFinalObra from './obra/ResumoFinalObra';
import ProdutoSeletor from './produtos/ProdutoSeletor';
import { catalogoPorCategoria, filtrarOrdenarProdutos, ORDENS_CATALOGO } from './produtos/catalogoUtils';
import { ehMadeira, fornecedorDasMadeiras, madeirasSemFornecedor, vincularMadeirasAoFornecedor } from './produtos/madeiras';
import OrcamentoVenda from './venda/OrcamentoVenda';
import Contratos from './contratos/Contratos';
import Configuracoes from './config/Configuracoes';
import { normalizarConfiguracao, configuracaoVazia } from './config/configStore';
import { resumoParcelasDaObra, resumoParcelas } from './contratos/contratosStore';
import Crediario from './crediario/Crediario';
import { catalogoParaRetirada } from './crediario/crediarioCalc';
import { CATALOGO_VENDA } from './venda/catalogoVenda';
import Materiais from './analise/Materiais';
import BuscaGlobal from './analise/BuscaGlobal';
import { resumoDoMes, rankingMateriais, estatisticasMaterial } from './analise/analiseCalc';

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

export default function CustoObraAppBoundary({ usuario }) {
  return (
    <ErrorBoundary>
      <CustoObraApp usuario={usuario} />
    </ErrorBoundary>
  );
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

// `primario` marca os itens que aparecem direto na barra de baixo do
// celular; os demais ficam no botão "Mais". No computador a barra lateral
// mostra todos, sempre nesta ordem.
//
// `ordemMobile` decide a ordem só da barra do celular: "Madeiras" fica
// logo depois de "Início" porque é a tela que mais se abre no balcão,
// pelo celular, e antes ela ficava escondida dentro do "Mais". O
// Financeiro saiu da barra (continua no "Mais"): é tela de gráfico, de
// olhar no computador.
const NAV_ITEMS = [
  { key: 'home', label: 'Início', icon: Home, primario: true, ordemMobile: 1 },
  { key: 'financeiro', label: 'Financeiro', icon: LayoutDashboard },
  { key: 'contratos', label: 'Contratos', icon: FileSignature, primario: true, ordemMobile: 4 },
  { key: 'catalogo', label: 'Catálogo', icon: Package },
  { key: 'crediario', label: 'Crediário', icon: NotebookPen },
  { key: 'materiais', label: 'Materiais', icon: Boxes },
  { key: 'fornecedores', label: 'Fornecedores', icon: Users },
  { key: 'contas', label: 'Contas', icon: Receipt, primario: true, ordemMobile: 3 },
  { key: 'venda', label: 'Madeiras', icon: Trees, primario: true, ordemMobile: 2 },
  { key: 'relatorios', label: 'Relatórios', icon: FileText },
  { key: 'configuracoes', label: 'Configurações', icon: Settings },
];

const PAGINA_META = {
  home: { titulo: 'Início', subtitulo: 'Visão geral de todas as obras' },
  financeiro: { titulo: 'Financeiro', subtitulo: 'Indicadores, gráficos e alertas de custo' },
  catalogo: { titulo: 'Catálogo', subtitulo: 'Produtos e preços cadastrados' },
  crediario: { titulo: 'Crediário dos montadores', subtitulo: 'Anotação do que cada um pegou — não é venda, não gera nota nem imposto' },
  materiais: { titulo: 'Materiais', subtitulo: 'Preço médio, histórico e comparação entre fornecedores' },
  fornecedores: { titulo: 'Fornecedores', subtitulo: 'Cadastro e histórico de compras' },
  contas: { titulo: 'Contas a pagar', subtitulo: 'Distribuidora, valor e vencimento' },
  contratos: { titulo: 'Contratos', subtitulo: 'Contratos, memoriais e parcelas a receber' },
  venda: { titulo: 'Madeiras', subtitulo: 'Tabela de preços das madeiras e orçamento em PDF' },
  relatorios: { titulo: 'Relatórios', subtitulo: 'Exportações e resumos gerais' },
  configuracoes: { titulo: 'Configurações', subtitulo: 'Dados da empresa e modelos de contrato/memorial' },
};

function CustoObraApp({ usuario }) {
  const [obras, setObras] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [lancamentos, setLancamentos] = useState([]);
  const [etapas, setEtapas] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [contas, setContas] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [montadores, setMontadores] = useState([]);
  const [crediario, setCrediario] = useState([]);
  const [configuracao, setConfiguracao] = useState(configuracaoVazia);
  const [menuMaisAberto, setMenuMaisAberto] = useState(false);
  const [trocandoSenha, setTrocandoSenha] = useState(false);
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [materialFoco, setMaterialFoco] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [dialogo, setDialogo] = useState(null); // { tipo: 'confirm'|'prompt', mensagem, valor, onConfirmar }

  const backupInputRef = useRef(null);
  const [ultimoBackup, setUltimoBackup] = useState(() => {
    try { return localStorage.getItem('casaseco-ultimo-backup') || null; } catch (e) { return null; }
  });

  function confirmar(mensagem, onConfirmar) {
    setDialogo({ tipo: 'confirm', mensagem, onConfirmar });
  }
  function perguntar(mensagem, valorInicial, onConfirmar) {
    setDialogo({ tipo: 'prompt', mensagem, valor: valorInicial || '', onConfirmar });
  }

  const [sidebarColapsada, setSidebarColapsada] = useState(() => {
    try { return localStorage.getItem('casaseco-sidebar-colapsada') === '1'; } catch (e) { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem('casaseco-sidebar-colapsada', sidebarColapsada ? '1' : '0'); } catch (e) { /* ignora */ }
  }, [sidebarColapsada]);

  const [view, setView] = useState('home');
  const [obraAtivaId, setObraAtivaId] = useState(null);
  const [categoriaAtiva, setCategoriaAtiva] = useState('produto_loja');
  const [filtroObras, setFiltroObras] = useState('todas'); // 'todas' | 'andamento' | 'concluidas'

  const [novaObraNome, setNovaObraNome] = useState('');
  const [novaObraOrcamento, setNovaObraOrcamento] = useState('');
  const [novaObraCliente, setNovaObraCliente] = useState('');
  const [novaObraEndereco, setNovaObraEndereco] = useState('');

  const [modalFinalizarId, setModalFinalizarId] = useState(null);
  const [sucessoFinalizacaoId, setSucessoFinalizacaoId] = useState(null);

  useEffect(() => {
    (async () => {
      if (!window.storage) {
        setErro('Este ambiente não oferece armazenamento persistente — os dados não serão salvos entre sessões.');
        setLoading(false);
        return;
      }
      try {
        const [o, p, l, et, fo, co, bo, ct, cl, cf, mt, cr] = await Promise.all([
          window.storage.get('obras', false).catch(() => null),
          window.storage.get('produtos', false).catch(() => null),
          window.storage.get('lancamentos', false).catch(() => null),
          window.storage.get('etapas', false).catch(() => null),
          window.storage.get('fornecedores', false).catch(() => null),
          window.storage.get('contas', false).catch(() => null),
          window.storage.get('contratos', false).catch(() => null),
          window.storage.get('clientes', false).catch(() => null),
          window.storage.get('configuracao', false).catch(() => null),
          window.storage.get('montadores', false).catch(() => null),
          window.storage.get('crediario', false).catch(() => null),
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
        setContratos(ct ? JSON.parse(ct.value) : []);
        setClientes(cl ? JSON.parse(cl.value) : []);
        setConfiguracao(normalizarConfiguracao(cf ? JSON.parse(cf.value) : null));
        setMontadores(mt ? JSON.parse(mt.value) : []);
        setCrediario(cr ? JSON.parse(cr.value) : []);

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

  useEffect(() => {
    if (!erro) return;
    const t = setTimeout(() => setErro(''), 5500);
    return () => clearTimeout(t);
  }, [erro]);

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
  const salvarContratos = (l) => persist('contratos', l, setContratos);
  const salvarClientes = (l) => persist('clientes', l, setClientes);
  const salvarConfiguracao = (c) => persist('configuracao', c, setConfiguracao);
  // O crediário mora em duas chaves próprias, separadas de `lancamentos`:
  // é anotação interna, não custo de obra nem venda.
  const salvarMontadores = (l) => persist('montadores', l, setMontadores);
  const salvarCrediario = (l) => persist('crediario', l, setCrediario);

  async function criarObra(e) {
    if (e && e.preventDefault) e.preventDefault();
    const nome = novaObraNome.trim();
    if (!nome) return;
    const orcamento = novaObraOrcamento.trim() ? parsePrecoBR(novaObraOrcamento) : null;
    const nova = {
      id: crypto.randomUUID(),
      nome,
      criadoEm: todayISO(),
      orcamento: isNaN(orcamento) ? null : orcamento,
      cliente: novaObraCliente.trim() || null,
      endereco: novaObraEndereco.trim() || null,
      status: 'em_andamento',
    };
    const ok = await salvarObras([...obras, nova]);
    if (ok) {
      setAviso(`Obra "${nome}" criada.`);
      setNovaObraNome('');
      setNovaObraOrcamento('');
      setNovaObraCliente('');
      setNovaObraEndereco('');
    }
  }

  // ---- finalização / reabertura de obra ----
  // Obras antigas não têm o campo "status" — tratamos qualquer valor
  // diferente de 'concluida' como "em andamento", então nada quebra para
  // quem já tinha obras cadastradas antes desta funcionalidade existir.
  function obraEstaConcluida(obra) {
    return !!obra && obra.status === 'concluida';
  }

  async function finalizarObra(obraId, observacoes) {
    const atual = obras.find((o) => o.id === obraId);
    if (!atual) return;
    const agora = new Date().toISOString();
    const historico = [...(atual.historicoFinalizacao || []), { tipo: 'finalizada', data: agora }];
    const ok = await salvarObras(obras.map((o) => o.id === obraId ? {
      ...o,
      status: 'concluida',
      finalizadaEm: agora,
      observacoesFinais: (observacoes || '').trim(),
      historicoFinalizacao: historico,
    } : o));
    if (ok) {
      setModalFinalizarId(null);
      setSucessoFinalizacaoId(obraId);
    }
  }

  function pedirReaberturaObra(obraId) {
    const atual = obras.find((o) => o.id === obraId);
    if (!atual) return;
    confirmar(`Tem certeza que deseja reabrir a obra "${atual.nome}"? Ela volta para "em andamento" e novos lançamentos poderão ser feitos. O resumo já gerado não é apagado.`, () => {
      const agora = new Date().toISOString();
      const historico = [...(atual.historicoFinalizacao || []), { tipo: 'reaberta', data: agora }];
      salvarObras(obras.map((o) => o.id === obraId ? { ...o, status: 'em_andamento', historicoFinalizacao: historico } : o));
      setAviso(`Obra "${atual.nome}" reaberta.`);
    });
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

  // Faixas de alerta de orçamento: 70% avisa, 85% alerta, 95% crítico,
  // 100% estourado.
  function faixaOrcamento(pct) {
    if (pct >= 100) return { tipo: 'red', rotulo: 'ultrapassou o orçamento' };
    if (pct >= 95) return { tipo: 'red', rotulo: 'em nível crítico' };
    if (pct >= 85) return { tipo: 'yellow', rotulo: 'em alerta' };
    if (pct >= 70) return { tipo: 'yellow', rotulo: 'em atenção' };
    return null;
  }

  function gerarAlertas() {
    const alertas = [];
    const hoje = todayISO();

    obras.forEach((o) => {
      if (o.status === 'concluida') return;
      const gasto = totalObra(o.id);
      if (o.orcamento) {
        const pct = (gasto / o.orcamento) * 100;
        const faixa = faixaOrcamento(pct);
        if (faixa) {
          alertas.push({
            tipo: faixa.tipo,
            texto: pct >= 100
              ? `"${o.nome}" ultrapassou o orçamento em ${formatMoney(gasto - o.orcamento)} (${pct.toFixed(0)}% utilizado).`
              : `"${o.nome}" está ${faixa.rotulo}: ${pct.toFixed(0)}% do orçamento utilizado (restam ${formatMoney(o.orcamento - gasto)}).`,
          });
        }
      }
      if (o.orcamentoCategorias) {
        Object.entries(o.orcamentoCategorias).forEach(([cat, valor]) => {
          if (!valor) return;
          const gastoCat = totalObraCategoria(o.id, cat);
          const pct = (gastoCat / valor) * 100;
          const faixa = faixaOrcamento(pct);
          if (faixa) {
            alertas.push({
              tipo: faixa.tipo,
              texto: pct >= 100
                ? `"${o.nome}": ${CATEGORIAS[cat].label} ultrapassou o orçamento em ${formatMoney(gastoCat - valor)}.`
                : `"${o.nome}": ${CATEGORIAS[cat].label} ${faixa.rotulo} — ${pct.toFixed(0)}% do orçamento.`,
            });
          }
        });
      }
    });

    // contas a pagar
    const vencidas = contas.filter((c) => c.status !== 'pago' && c.vencimento < hoje);
    if (vencidas.length > 0) {
      alertas.unshift({ tipo: 'red', texto: `${vencidas.length} conta(s) vencida(s), totalizando ${formatMoney(vencidas.reduce((a, c) => a + c.valor, 0))}.` });
    }

    // parcelas de contrato atrasadas (dinheiro a receber do cliente)
    const parcelasAtrasadas = contratos
      .filter((c) => c.status !== 'cancelado' && c.status !== 'rascunho')
      .flatMap((c) => (c.parcelas || []).map((p) => ({ ...p, cliente: c.cliente?.nome })))
      .filter((p) => p.status !== 'pago' && p.vencimento && p.vencimento < hoje);
    if (parcelasAtrasadas.length > 0) {
      alertas.unshift({
        tipo: 'yellow',
        texto: `${parcelasAtrasadas.length} parcela(s) de contrato em atraso a receber, totalizando ${formatMoney(parcelasAtrasadas.reduce((a, p) => a + (Number(p.valor) || 0), 0))}.`,
      });
    }

    // contratos parados em rascunho
    const rascunhos = contratos.filter((c) => c.status === 'rascunho');
    if (rascunhos.length > 0) {
      alertas.push({ tipo: 'yellow', texto: `${rascunhos.length} contrato(s) em rascunho aguardando conclusão.` });
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
  //
  // De propósito só tem três campos: distribuidora, valor e vencimento. É
  // o que o dono quer controlar — quem ele tem que pagar, quanto e quando.
  // A distribuidora sai da mesma lista dos fornecedores, então basta
  // cadastrar uma vez e depois é só escolher.

  // Nome que aparece na lista. Contas antigas (feitas quando o formulário
  // tinha descrição) continuam legíveis pela descrição delas.
  function nomeDaConta(c) {
    return c.fornecedorNome || c.descricao || 'Conta';
  }

  async function criarConta({ fornecedorNome, valor, vencimento }) {
    const nova = {
      id: crypto.randomUUID(),
      fornecedorNome,
      valor,
      vencimento,
      status: 'pendente',
      criadoEm: todayISO(),
    };
    const ok = await salvarContas([...contas, nova]);
    if (!ok) return false;
    salvarFornecedores(upsertFornecedor(fornecedores, fornecedorNome));
    setAviso(`Conta de ${fornecedorNome} criada.`);
    return true;
  }

  function marcarContaPaga(id) {
    salvarContas(contas.map((c) => c.id === id ? { ...c, status: c.status === 'pago' ? 'pendente' : 'pago' } : c));
  }

  function removerConta(conta) {
    confirmar(`Remover a conta de ${nomeDaConta(conta)} (${formatMoney(conta.valor)})?`, () => {
      salvarContas(contas.filter((c) => c.id !== conta.id));
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

  // ---- contratos ----
  // Salvar um contrato também mantém o cadastro de clientes e a obra em dia,
  // para o mesmo dado nunca precisar ser digitado duas vezes.
  async function salvarContrato(contrato) {
    const existe = contratos.some((c) => c.id === contrato.id);
    const lista = existe
      ? contratos.map((c) => (c.id === contrato.id ? contrato : c))
      : [contrato, ...contratos];
    const ok = await salvarContratos(lista);
    if (!ok) return false;

    // cliente: cria/atualiza no cadastro a partir dos dados do contrato
    const nomeCliente = (contrato.cliente?.nome || '').trim();
    if (nomeCliente) {
      const existente = clientes.find(
        (c) => c.id === contrato.clienteId || c.nome.trim().toLowerCase() === nomeCliente.toLowerCase()
      );
      const dados = {
        nome: nomeCliente,
        cpfCnpj: contrato.cliente.cpfCnpj || '',
        endereco: contrato.cliente.endereco || '',
        cidade: contrato.cliente.cidade || '',
        estado: contrato.cliente.estado || '',
        telefone: contrato.cliente.telefone || '',
        email: contrato.cliente.email || '',
      };
      if (existente) {
        salvarClientes(clientes.map((c) => (c.id === existente.id ? { ...c, ...dados } : c)));
      } else {
        salvarClientes([...clientes, { id: crypto.randomUUID(), ...dados, criadoEm: todayISO() }]);
      }
    }

    // obra: ao GERAR um contrato sem obra vinculada, cria a obra já com
    // cliente, endereço e orçamento vindos do próprio contrato.
    if (contrato.status !== 'rascunho' && !contrato.obraId && nomeCliente) {
      const novaObra = {
        id: crypto.randomUUID(),
        nome: `CASA ${nomeCliente}`.toUpperCase(),
        criadoEm: contrato.dataContrato || todayISO(),
        orcamento: Number(contrato.valorTotal) || null,
        cliente: nomeCliente,
        endereco: contrato.cliente.endereco || null,
        status: 'em_andamento',
      };
      const okObra = await salvarObras([...obras, novaObra]);
      if (okObra) {
        await salvarContratos(
          lista.map((c) => (c.id === contrato.id ? { ...c, obraId: novaObra.id } : c))
        );
        setAviso(`Obra "${novaObra.nome}" criada automaticamente a partir do contrato.`);
      }
    }
    return true;
  }

  async function removerContrato(id) {
    return salvarContratos(contratos.filter((c) => c.id !== id));
  }

  async function atualizarParcelaContrato(contratoId, parcelaId, campos) {
    return salvarContratos(contratos.map((c) => (
      c.id === contratoId
        ? {
            ...c,
            parcelas: (c.parcelas || []).map((p) => (p.id === parcelaId ? { ...p, ...campos } : p)),
            atualizadoEm: todayISO(),
          }
        : c
    )));
  }

  // ---- formulário: cadastro/edição de fornecedor ----
  const [fnNome, setFnNome] = useState('');
  const [fnTelefone, setFnTelefone] = useState('');
  const [fnCategoria, setFnCategoria] = useState('');
  const [fnCnpj, setFnCnpj] = useState('');
  const [fnEmail, setFnEmail] = useState('');
  const [fnCidade, setFnCidade] = useState('');

  function limparFormFornecedor() {
    setFnNome(''); setFnTelefone(''); setFnCategoria('');
    setFnCnpj(''); setFnEmail(''); setFnCidade('');
  }

  async function cadastrarFornecedor() {
    setErro('');
    const nome = fnNome.trim();
    if (!nome) { setErro('Informe o nome do fornecedor.'); return; }
    const campos = {
      telefone: fnTelefone.trim(), categoria: fnCategoria.trim(),
      cnpj: fnCnpj.trim(), email: fnEmail.trim(), cidade: fnCidade.trim(),
    };
    const existente = fornecedores.find((f) => f.nome.toLowerCase() === nome.toLowerCase());
    let ok;
    if (existente) {
      ok = await atualizarFornecedor(existente.id, campos);
      if (ok) setAviso(`"${nome}" atualizado.`);
    } else {
      ok = await salvarFornecedores([...fornecedores, {
        id: crypto.randomUUID(), nome, ...campos, observacoes: '', criadoEm: todayISO(),
      }]);
      if (ok) setAviso(`"${nome}" cadastrado.`);
    }
    if (ok) limparFormFornecedor();
  }

  // ---- formulário: nova conta a pagar ----
  const [ctFornecedor, setCtFornecedor] = useState('');
  const [ctValor, setCtValor] = useState('');
  const [ctVencimento, setCtVencimento] = useState(todayISO());
  // true quando o usuário escolheu "cadastrar nova" em vez de usar a lista
  const [ctDigitandoDistribuidora, setCtDigitandoDistribuidora] = useState(false);

  async function aoCriarConta() {
    setErro('');
    const fornecedorNome = ctFornecedor.trim();
    const valor = parsePrecoBR(ctValor);
    if (!fornecedorNome) { setErro('Escolha a distribuidora.'); return; }
    if (isNaN(valor) || valor <= 0) { setErro('Informe um valor válido.'); return; }
    if (!ctVencimento) { setErro('Informe a data de vencimento.'); return; }
    const ok = await criarConta({ fornecedorNome, valor, vencimento: ctVencimento });
    if (ok) {
      setCtValor('');
      setCtVencimento(todayISO());
      setCtDigitandoDistribuidora(false);
      // a distribuidora fica escolhida: quase sempre vêm várias contas
      // da mesma de uma vez
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
    const linhas = [['Distribuidora', 'Valor', 'Vencimento', 'Status']];
    contas.forEach((c) => {
      linhas.push([nomeDaConta(c), c.valor, formatDateBR(c.vencimento), c.status === 'pago' ? 'Paga' : 'Pendente']);
    });
    baixarCSV('contas-a-pagar.csv', linhas);
  }

  function exportarContratosCSV() {
    const linhas = [['Número', 'Status', 'Cliente', 'CPF/CNPJ', 'Obra', 'Valor', 'Parcelas', 'Recebido', 'A receber', 'Gerado em']];
    contratos.forEach((c) => {
      const r = resumoParcelas(c.parcelas);
      linhas.push([
        c.numero || '(rascunho)', c.status, c.cliente?.nome || '', c.cliente?.cpfCnpj || '',
        (obras.find((ob) => ob.id === c.obraId) || {}).nome || '', c.valorTotal, (c.parcelas || []).length, r.recebido, r.aReceber,
        c.geradoEm ? formatDateBR(c.geradoEm) : '',
      ]);
    });
    baixarCSV('contratos.csv', linhas);
  }

  function exportarParcelasCSV() {
    const linhas = [['Contrato', 'Cliente', 'Obra', 'Parcela', 'Etapa', 'Valor', 'Vencimento', 'Status', 'Recebido em']];
    contratos.forEach((c) => {
      (c.parcelas || []).forEach((p) => {
        linhas.push([
          c.numero || '(rascunho)', c.cliente?.nome || '', (obras.find((ob) => ob.id === c.obraId) || {}).nome || '',
          p.ordem, p.etapa || '', p.valor, p.vencimento ? formatDateBR(p.vencimento) : '',
          p.status === 'pago' ? 'Recebida' : 'A receber',
          p.dataPagamento ? formatDateBR(p.dataPagamento) : '',
        ]);
      });
    });
    baixarCSV('parcelas-a-receber.csv', linhas);
  }

  function exportarMateriaisCSV() {
    const linhas = [['Material', 'Unidade', 'Quantidade', 'Compras', 'Total gasto', 'Preço médio', 'Menor preço', 'Maior preço', 'Último preço']];
    rankingMateriais(lancamentos).forEach((m) => {
      const st = estatisticasMaterial(lancamentos, m.descricao);
      linhas.push([
        m.descricao, m.unidade, m.quantidade, m.compras,
        st.totalGasto, st.precoMedio.toFixed(2), st.menorPreco, st.maiorPreco, st.ultimoPreco,
      ]);
    });
    baixarCSV('materiais.csv', linhas);
  }

  // ---- backup completo do sistema (baixar / restaurar) ----
  function exportarBackupCompleto() {
    const backup = {
      sistema: 'casaseco-custo-obra',
      versaoBackup: 1,
      geradoEm: new Date().toISOString(),
      dados: { obras, produtos, lancamentos, etapas, fornecedores, contas, contratos, clientes, montadores, crediario, configuracao },
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const carimbo = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-casaseco-${carimbo}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    try { localStorage.setItem('casaseco-ultimo-backup', new Date().toISOString()); } catch (e) { /* ignora */ }
    setUltimoBackup(new Date().toISOString());
    setAviso('Backup completo baixado. Guarde esse arquivo em um lugar seguro (e-mail, Google Drive, pendrive).');
  }

  function abrirSeletorRestauracao() {
    if (backupInputRef.current) backupInputRef.current.click();
  }

  function handleArquivoRestauracao(e) {
    const arquivo = e.target.files && e.target.files[0];
    e.target.value = ''; // permite escolher o mesmo arquivo de novo depois, se precisar
    if (!arquivo) return;

    const leitor = new FileReader();
    leitor.onload = () => {
      let backup;
      try {
        backup = JSON.parse(leitor.result);
      } catch (err) {
        setErro('Esse arquivo não é um backup válido (não é um JSON legível).');
        return;
      }
      const dados = backup && backup.dados;
      // As listas opcionais são opcionais de propósito: backups antigos,
      // feitos antes de um módulo existir, não têm a chave e continuam
      // válidos — restauram sem ela, em vez de serem rejeitados.
      const chavesObrigatorias = ['obras', 'produtos', 'lancamentos', 'etapas', 'fornecedores', 'contas'];
      const listasOpcionais = ['contratos', 'clientes', 'montadores', 'crediario'];
      const valido = dados
        && chavesObrigatorias.every((k) => Array.isArray(dados[k]))
        && listasOpcionais.every((k) => dados[k] === undefined || Array.isArray(dados[k]));
      if (!valido) {
        setErro('Esse arquivo não parece um backup do Casas Eco (faltam dados esperados).');
        return;
      }
      confirmar(
        `Restaurar este backup vai SUBSTITUIR todos os dados atuais (obras, lançamentos, catálogo, fornecedores e contas) pelos dados do arquivo${backup.geradoEm ? ` de ${formatDateBR(backup.geradoEm.slice(0, 10))}` : ''}. O que está salvo agora será perdido. Tem certeza?`,
        () => aplicarRestauracao(dados)
      );
    };
    leitor.onerror = () => setErro('Não foi possível ler o arquivo selecionado.');
    leitor.readAsText(arquivo);
  }

  async function aplicarRestauracao(dados) {
    const resultados = await Promise.all([
      salvarObras(dados.obras),
      salvarProdutos(dados.produtos),
      salvarLancamentos(dados.lancamentos),
      salvarEtapas(dados.etapas),
      salvarFornecedores(dados.fornecedores),
      salvarContas(dados.contas),
      salvarContratos(dados.contratos || []),
      salvarClientes(dados.clientes || []),
      salvarMontadores(dados.montadores || []),
      salvarCrediario(dados.crediario || []),
      salvarConfiguracao(normalizarConfiguracao(dados.configuracao || null)),
    ]);
    if (resultados.every(Boolean)) {
      setAviso('Backup restaurado com sucesso.');
    } else {
      setErro('Alguns dados podem não ter sido restaurados. Confira e tente novamente se necessário.');
    }
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

  async function vincularMadeirasAntigas(distribuidora) {
    const atualizados = vincularMadeirasAoFornecedor(lancamentos, distribuidora);
    const quantos = atualizados.filter((l, i) => l !== lancamentos[i]).length;
    if (quantos === 0) return;
    const ok = await salvarLancamentos(atualizados);
    if (!ok) return;
    salvarFornecedores(upsertFornecedor(fornecedores, distribuidora));
    setAviso(`${quantos} lançamento(s) de madeira vinculado(s) a ${distribuidora}.`);
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

  // ---- busca do catálogo ----
  const [buscaCatalogo, setBuscaCatalogo] = useState('');
  const [ordemCatalogo, setOrdemCatalogo] = useState('nome');

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
  // marca que o fornecedor no campo foi posto pelo sistema (item de
  // madeira), e não digitado por uma pessoa. Só o que foi posto pelo
  // sistema pode ser trocado ou apagado sozinho depois.
  const [ldFornecedorAutomatico, setLdFornecedorAutomatico] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [buscaLancamento, setBuscaLancamento] = useState('');

  function resetFormLancamento() {
    setLdDescricao(''); setLdQuantidade('1'); setLdUnidade('UN');
    setLdPreco(''); setLdData(todayISO());
    setLdObservacao(''); setLdEtapaId(''); setLdFornecedor('');
    setLdFornecedorAutomatico(false); setEditandoId(null);
  }

  // A madeira vem toda de uma distribuidora só (ver Configurações >
  // Madeiras). Quando o item lançado é madeira, o fornecedor já entra
  // preenchido — assim o gasto aparece no Financeiro sem depender de
  // alguém lembrar de digitar. O campo continua editável: se a compra
  // foi em outro lugar, é só trocar, e o que foi digitado à mão nunca é
  // apagado pelo sistema.
  function ajustarFornecedorMadeira(nome, categoria) {
    const distribuidora = fornecedorDasMadeiras(configuracao);
    if (!distribuidora) return;
    const madeira = ehMadeira(nome, categoria);
    if (madeira && (!ldFornecedor.trim() || ldFornecedorAutomatico)) {
      setLdFornecedor(distribuidora);
      setLdFornecedorAutomatico(true);
    } else if (!madeira && ldFornecedorAutomatico) {
      setLdFornecedor('');
      setLdFornecedorAutomatico(false);
    }
  }

  function aoDigitarDescricao(valor) {
    const nome = upperInput(valor);
    setLdDescricao(nome);
    const catalogo = catalogoPorCategoria(categoriaAtiva, produtos, lancamentos);
    const item = catalogo.find((it) => it.nome.toLowerCase() === nome.trim().toLowerCase());
    if (item) { setLdPreco(String(item.preco)); setLdUnidade(item.unidade); }
    ajustarFornecedorMadeira(nome, categoriaAtiva);
  }

  function selecionarItemCatalogo(item) {
    setLdDescricao(item.nome);
    setLdUnidade(item.unidade);
    setLdPreco(String(item.preco));
    ajustarFornecedorMadeira(item.nome, categoriaAtiva);
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
    setLdFornecedorAutomatico(false);
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
    return <DashboardSkeleton />;
  }

  const obraAtiva = obras.find((o) => o.id === obraAtivaId);
  const obraConcluida = obraEstaConcluida(obraAtiva);
  const catalogoAtivo = catalogoPorCategoria(categoriaAtiva, produtos, lancamentos);
  // lista que a tela do Catálogo mostra: o catálogo inteiro passado pela
  // busca e pela ordenação escolhidas na própria tela.
  const produtosDoCatalogo = filtrarOrdenarProdutos(produtos, buscaCatalogo, ordemCatalogo);
  // catálogo oferecido no crediário: produtos cadastrados + tabela de
  // madeiras, que são as duas listas de itens que a loja já tem.
  const catalogoCrediario = catalogoParaRetirada(produtos, CATALOGO_VENDA);
  // lançamentos de madeira que ficaram sem fornecedor (os de antes do
  // vínculo com a distribuidora existir) — a tela de Configurações
  // oferece corrigir todos de uma vez
  const madeirasPendentes = madeirasSemFornecedor(lancamentos);
  const paginaAtual = (view === 'obra' || view === 'resumo') && obraAtiva
    ? {
        titulo: obraAtiva.nome,
        subtitulo: view === 'resumo' ? 'Resumo final da obra' : `Desde ${formatDateBR(obraAtiva.criadoEm)}${obraConcluida ? ' · Concluída' : ''}`,
      }
    : (PAGINA_META[view] || PAGINA_META.home);
  const obraDoModalFinalizar = modalFinalizarId ? obras.find((o) => o.id === modalFinalizarId) : null;
  const obraDoSucesso = sucessoFinalizacaoId ? obras.find((o) => o.id === sucessoFinalizacaoId) : null;

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 flex">
      {/* ---- barra lateral (desktop) ---- */}
      <aside className={`hidden sm:flex flex-col eco-sidebar bg-white border-r border-stone-200 flex-shrink-0 ${sidebarColapsada ? 'w-[76px]' : 'w-64'}`}>
        <button
          onClick={() => { setView('home'); setObraAtivaId(null); }}
          className="h-16 flex items-center gap-2.5 px-4 border-b border-stone-100 overflow-hidden flex-shrink-0"
        >
          <img src="/logo-casas-eco.jpeg" alt="Casas Eco" className="h-8 w-8 object-contain rounded flex-shrink-0" />
          {!sidebarColapsada && (
            <span className="flex flex-col leading-tight text-left overflow-hidden whitespace-nowrap">
              <span className="font-bold text-green-800 text-sm tracking-tight">CASAS ECO</span>
              <span className="text-xs text-stone-400">Custo de Obra</span>
            </span>
          )}
        </button>

        <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const ativo = view === item.key || (item.key === 'home' && (view === 'obra' || view === 'resumo'));
            return (
              <button
                key={item.key}
                onClick={() => { setView(item.key); if (item.key === 'home') setObraAtivaId(null); }}
                title={sidebarColapsada ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                  sidebarColapsada ? 'justify-center' : ''
                } ${ativo ? 'bg-green-50 text-green-700' : 'text-stone-500 hover:bg-stone-100 hover:text-stone-800'}`}
              >
                <Icon size={18} className="flex-shrink-0" />
                {!sidebarColapsada && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="p-2.5 border-t border-stone-100 space-y-1">
          {sidebarColapsada
            ? <div className="flex justify-center pb-1"><SeletorTema modo="botao" /></div>
            : <SeletorTema className="mb-1.5" />}
          {!sidebarColapsada && (
            <div className="flex items-center gap-1.5 text-xs px-2 py-1.5">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${window.storage ? 'bg-green-500' : 'bg-red-500'}`}></span>
              <span className={window.storage ? 'text-green-700' : 'text-red-500'}>
                {window.storage ? 'Salvamento ativo' : 'Salvamento indisponível'}
              </span>
            </div>
          )}
          {!sidebarColapsada && usuario?.email && (
            <p className="text-[11px] text-stone-400 px-2 truncate" title={usuario.email}>{usuario.email}</p>
          )}
          <div className={`flex gap-1 ${sidebarColapsada ? 'flex-col' : ''}`}>
            <button
              onClick={() => setTrocandoSenha(true)}
              title="Trocar minha senha"
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors duration-150"
            >
              <KeyRound size={16} />
              {!sidebarColapsada && <span className="text-xs">Senha</span>}
            </button>
            <button
              onClick={sair}
              title="Sair"
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors duration-150"
            >
              <LogOut size={16} />
              {!sidebarColapsada && <span className="text-xs">Sair</span>}
            </button>
          </div>
          <button
            onClick={() => setSidebarColapsada((v) => !v)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors duration-150"
          >
            {sidebarColapsada ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
          </button>
        </div>
      </aside>

      {/* barra de navegação fixa embaixo, só no celular: os itens principais
          ficam à mão e o resto abre no botão "Mais" */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-stone-200 flex z-20">
        {NAV_ITEMS.filter((i) => i.primario).sort((a, b) => a.ordemMobile - b.ordemMobile).map((item) => {
          const Icon = item.icon;
          const ativo = view === item.key || (item.key === 'home' && (view === 'obra' || view === 'resumo'));
          return (
            <button
              key={item.key}
              onClick={() => { setView(item.key); if (item.key === 'home') setObraAtivaId(null); }}
              className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] leading-tight transition-colors duration-150 ${ativo ? 'text-green-700' : 'text-stone-400'}`}
            >
              <Icon size={18} />
              <span className="truncate max-w-full px-0.5">{item.label}</span>
            </button>
          );
        })}
        {(() => {
          const secundarios = NAV_ITEMS.filter((i) => !i.primario);
          const ativoNoMais = secundarios.some((i) => i.key === view);
          return (
            <button
              onClick={() => setMenuMaisAberto(true)}
              className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] leading-tight transition-colors duration-150 ${ativoNoMais ? 'text-green-700' : 'text-stone-400'}`}
            >
              <MoreHorizontal size={18} />
              <span className="truncate max-w-full px-0.5">Mais</span>
            </button>
          );
        })()}
      </nav>

      {/* painel "Mais" (celular) */}
      {menuMaisAberto && createPortal(
        <>
          <div className="fixed inset-0 bg-black/30 z-40 animate-fade-in sm:hidden" onClick={() => setMenuMaisAberto(false)} />
          <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl shadow-popover bg-white animate-sheet-up sm:hidden">
            <div className="flex justify-center pt-2 pb-1">
              <span className="w-10 h-1 rounded-full bg-stone-200" />
            </div>
            <div className="flex items-center justify-between px-4 pb-2 border-b border-stone-100">
              <p className="text-sm font-semibold text-stone-700">Todas as áreas</p>
              <button onClick={() => setMenuMaisAberto(false)} className="eco-icon-btn -mr-1.5">
                <X size={16} />
              </button>
            </div>
            <div className="p-2 grid grid-cols-3 gap-1.5">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const ativo = view === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => {
                      setView(item.key);
                      if (item.key === 'home') setObraAtivaId(null);
                      setMenuMaisAberto(false);
                    }}
                    className={`flex flex-col items-center justify-center gap-1.5 py-3.5 rounded-xl border text-[11px] font-medium transition-colors ${
                      ativo ? 'bg-green-50 border-green-200 text-green-800' : 'bg-white border-stone-200 text-stone-600'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="truncate max-w-full px-1">{item.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="px-4 pt-3 border-t border-stone-100">
              <SeletorTema />
            </div>
            <div className="px-4 pb-6 mb-16 pt-3 flex items-center gap-2">
              {usuario?.email && (
                <p className="text-[11px] text-stone-400 truncate flex-1" title={usuario.email}>{usuario.email}</p>
              )}
              <button
                onClick={() => { setMenuMaisAberto(false); setTrocandoSenha(true); }}
                className="eco-btn-secondary eco-btn-xs flex-shrink-0"
              >
                <KeyRound size={12} /> Senha
              </button>
              <button onClick={sair} className="eco-btn-secondary eco-btn-xs flex-shrink-0">
                <LogOut size={12} /> Sair
              </button>
            </div>
          </div>
        </>,
        document.body
      )}

      {trocandoSenha && createPortal(
        <TrocarSenha
          onFechar={() => setTrocandoSenha(false)}
          onPronto={() => { setTrocandoSenha(false); setAviso('Senha trocada.'); }}
        />,
        document.body
      )}

      {/* ---- coluna principal ---- */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-stone-200 px-4 sm:px-6 py-3 flex items-center gap-3">
          <button
            onClick={() => { setView('home'); setObraAtivaId(null); }}
            className="sm:hidden flex-shrink-0"
          >
            <img src="/logo-casas-eco.jpeg" alt="Casas Eco" className="h-8 w-8 object-contain rounded" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-base sm:text-lg font-semibold text-stone-900 truncate">{paginaAtual.titulo}</h1>
            <p className="text-xs text-stone-400 truncate hidden sm:block">{paginaAtual.subtitulo}</p>
          </div>
          <button
            onClick={() => setBuscaAberta(true)}
            className="flex items-center gap-2 flex-shrink-0 text-stone-400 hover:text-stone-700 sm:border sm:border-stone-200 sm:rounded-lg sm:px-3 sm:py-1.5 sm:hover:border-stone-300 transition-colors"
            title="Buscar em todo o sistema"
          >
            <Search size={17} />
            <span className="hidden sm:inline text-xs">Buscar…</span>
          </button>
          <span className="sm:hidden inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: window.storage ? '#22c55e' : '#ef4444' }}></span>
        </header>

        <main key={view} className="flex-1 w-full max-w-5xl mx-auto px-4 py-6 pb-24 sm:pb-6 animate-fade-in-up">
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
                  <div className="eco-stagger grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="eco-card p-3">
                      <p className="text-xs text-stone-500">Orçamento total</p>
                      <p className="text-lg font-semibold text-stone-900">{totalOrcado > 0 ? formatMoney(totalOrcado) : '—'}</p>
                    </div>
                    <div className="eco-card p-3">
                      <p className="text-xs text-stone-500">Gasto total</p>
                      <p className="text-lg font-semibold text-green-800">{formatMoney(totalGastoGeral)}</p>
                    </div>
                    <div className="eco-card p-3">
                      <p className="text-xs text-stone-500">Saldo</p>
                      <p className={`text-lg font-semibold ${totalOrcado - totalGastoGeral < 0 ? 'text-red-600' : 'text-stone-900'}`}>
                        {totalOrcado > 0 ? formatMoney(totalOrcado - totalGastoGeral) : '—'}
                      </p>
                    </div>
                    <div className="eco-card p-3">
                      <p className="text-xs text-stone-500">Obras ativas</p>
                      <p className="text-lg font-semibold text-stone-900">{obras.length}</p>
                    </div>
                    <div className="eco-card p-3">
                      <p className="text-xs text-stone-500">Gasto no mês</p>
                      <p className="text-lg font-semibold text-stone-900">{formatMoney(gastosNoPeriodo(30))}</p>
                    </div>
                    <div className="eco-card p-3">
                      <p className="text-xs text-stone-500">Gasto na semana</p>
                      <p className="text-lg font-semibold text-stone-900">{formatMoney(gastosNoPeriodo(7))}</p>
                    </div>
                    <div className="eco-card p-3">
                      <p className="text-xs text-stone-500">Contas vencidas</p>
                      <p className={`text-lg font-semibold ${contasVencidas.length > 0 ? 'text-red-600' : 'text-stone-900'}`}>{contasVencidas.length}</p>
                    </div>
                    <div className="eco-card p-3">
                      <p className="text-xs text-stone-500">Contas em 7 dias</p>
                      <p className="text-lg font-semibold text-stone-900">{contasProx7.length}</p>
                    </div>
                  </div>
                  {/* ---- resumo do mês ---- */}
                  {(() => {
                    const r = resumoDoMes({ lancamentos, obras, contas, CATEGORIAS }, hoje);
                    if (r.lancamentosNoMes === 0 && r.totalAnterior === 0) return null;
                    const subiu = r.variacaoPct != null && r.variacaoPct > 0;
                    return (
                      <div className="eco-card p-4">
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <p className="text-sm font-semibold text-stone-700">Resumo do mês</p>
                          {r.variacaoPct != null && (
                            <span className={`eco-badge border ${subiu ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                              {subiu ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                              {Math.abs(r.variacaoPct).toFixed(0)}% vs. mês anterior
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                          <div>
                            <p className="text-xs text-stone-400">Gasto no mês</p>
                            <p className="text-base font-semibold text-stone-900">{formatMoney(r.total)}</p>
                            <p className="text-[11px] text-stone-400">{r.lancamentosNoMes} lançamentos</p>
                          </div>
                          <div>
                            <p className="text-xs text-stone-400">Obra que mais gastou</p>
                            <p className="text-sm font-semibold text-stone-900 truncate">{r.topObra?.nome || '—'}</p>
                            {r.topObra && <p className="text-[11px] text-stone-400">{formatMoney(r.topObra.valor)}</p>}
                          </div>
                          <div>
                            <p className="text-xs text-stone-400">Categoria que mais consumiu</p>
                            <p className="text-sm font-semibold text-stone-900 truncate">{r.topCategoria?.label || '—'}</p>
                            {r.topCategoria && <p className="text-[11px] text-stone-400">{formatMoney(r.topCategoria.valor)}</p>}
                          </div>
                          <div>
                            <p className="text-xs text-stone-400">Fornecedor que mais recebeu</p>
                            <p className="text-sm font-semibold text-stone-900 truncate">{r.topFornecedor?.nome || '—'}</p>
                            {r.topFornecedor && <p className="text-[11px] text-stone-400">{formatMoney(r.topFornecedor.valor)}</p>}
                          </div>
                        </div>
                        {r.variacoesMateriais.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-stone-100">
                            <p className="text-xs text-stone-400 mb-1.5">Materiais que mudaram de preço em relação ao mês passado</p>
                            <div className="space-y-1">
                              {r.variacoesMateriais.map((v) => (
                                <div key={v.descricao} className="flex items-center justify-between gap-2 text-xs">
                                  <span className="text-stone-600 truncate">{v.descricao}</span>
                                  <span className={`font-medium flex-shrink-0 ${v.pct > 0 ? 'text-red-600' : 'text-green-700'}`}>
                                    {v.pct > 0 ? '+' : ''}{v.pct.toFixed(0)}% ({formatMoney(v.de)} → {formatMoney(v.para)})
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {alertas.length > 0 && (
                    <div className="space-y-1.5 eco-stagger">
                      {alertas.map((a, i) => (
                        <div key={i} className={`text-sm px-3 py-2 rounded-lg border flex items-center gap-2 ${
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

            <div className="eco-card p-4 flex flex-col sm:flex-row flex-wrap gap-3 items-end">
              <div className="w-full sm:flex-1 min-w-0">
                <label className="text-xs text-stone-500 block mb-1">Nova obra</label>
                <input
                  value={novaObraNome}
                  onChange={(e) => setNovaObraNome(e.target.value)}
                  placeholder="Ex: Residencial Vista Alegre"
                  className="eco-input"
                />
              </div>
              <div className="w-full sm:w-48">
                <label className="text-xs text-stone-500 block mb-1">Cliente (opcional)</label>
                <input
                  value={novaObraCliente}
                  onChange={(e) => setNovaObraCliente(e.target.value)}
                  placeholder="Ex: João da Silva"
                  className="eco-input"
                />
              </div>
              <div className="w-full sm:w-40">
                <label className="text-xs text-stone-500 block mb-1">Orçamento (opcional)</label>
                <input
                  value={novaObraOrcamento}
                  onChange={(e) => setNovaObraOrcamento(e.target.value)}
                  placeholder="0,00"
                  inputMode="decimal"
                  className="eco-input"
                />
              </div>
              <button type="button" onClick={criarObra} className="eco-btn-primary w-full sm:w-auto">
                <Plus size={15} /> Criar obra
              </button>
            </div>

            {obras.length > 0 && (
              <div className="flex gap-1 bg-stone-100 rounded-md p-0.5 w-fit">
                {[
                  ['todas', 'Todas'],
                  ['andamento', 'Em andamento'],
                  ['concluidas', 'Concluídas'],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setFiltroObras(key)}
                    className={`text-xs px-3 py-1.5 rounded transition-colors duration-150 ${filtroObras === key ? 'bg-white text-green-700 shadow-sm font-medium' : 'text-stone-500'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            {(() => {
              const obrasFiltradas = obras.filter((o) => {
                if (filtroObras === 'andamento') return !obraEstaConcluida(o);
                if (filtroObras === 'concluidas') return obraEstaConcluida(o);
                return true;
              });
              if (obras.length === 0) {
                return <p className="text-center text-stone-400 py-10">Nenhuma obra cadastrada. Crie a primeira acima.</p>;
              }
              if (obrasFiltradas.length === 0) {
                return <p className="text-center text-stone-400 py-10">Nenhuma obra {filtroObras === 'concluidas' ? 'concluída' : 'em andamento'} no momento.</p>;
              }
              return (
                <div className="eco-stagger grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {obrasFiltradas.map((o) => {
                    const gasto = totalObra(o.id);
                    const pct = o.orcamento ? Math.min(100, (gasto / o.orcamento) * 100) : null;
                    const concluida = obraEstaConcluida(o);
                    return (
                      <div key={o.id} className={`eco-card eco-card-hover p-4 ${concluida ? 'border-green-200' : ''}`}>
                        <button onClick={() => abrirObra(o.id)} className="w-full text-left">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <p className="font-semibold text-stone-900 truncate">{o.nome}</p>
                            {concluida ? (
                              <span className="eco-badge bg-green-50 text-green-700 border border-green-200 flex-shrink-0">
                                <CheckCircle2 size={12} /> CONCLUÍDA
                              </span>
                            ) : (
                              <span className="eco-badge bg-blue-50 text-blue-700 border border-blue-200 flex-shrink-0">
                                🟢 EM ANDAMENTO
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-stone-400 mb-3">
                            desde {formatDateBR(o.criadoEm)}
                            {concluida && o.finalizadaEm && ` · finalizada em ${formatDateBR(o.finalizadaEm.slice(0, 10))}`}
                          </p>
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
                                <span key={key} className={`eco-badge ${c.bg} ${c.text} border ${c.border}`}>
                                  <Icon size={12} /> {formatMoney(totalObraCategoria(o.id, key))}
                                </span>
                              );
                            })}
                          </div>
                        </button>
                        <div className="flex items-center gap-3 mt-3 flex-wrap">
                          {!concluida && (
                            <button onClick={() => definirOrcamento(o.id)} className="text-xs text-stone-400 hover:text-green-700 flex items-center gap-1 transition-colors">
                              <Pencil size={12} /> {o.orcamento ? 'Editar orçamento' : 'Definir orçamento'}
                            </button>
                          )}
                          {concluida && (
                            <button onClick={() => { setObraAtivaId(o.id); setView('resumo'); }} className="text-xs text-green-700 hover:text-green-800 flex items-center gap-1 transition-colors">
                              <ClipboardCheck size={12} /> Ver resumo final
                            </button>
                          )}
                          <button onClick={() => removerObra(o.id, o.nome)} className="text-xs text-stone-400 hover:text-red-600 flex items-center gap-1 transition-colors">
                            <Trash2 size={12} /> Remover obra
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* ---------------- DASHBOARD FINANCEIRO ---------------- */}
        {view === 'financeiro' && (
          <FinanceiroDashboard
            obras={obras}
            lancamentos={lancamentos}
            fornecedores={fornecedores}
            contas={contas}
          />
        )}

        {/* ---------------- CATÁLOGO DE PRODUTOS (global) ---------------- */}
        {view === 'catalogo' && (
          <div className="space-y-6">
            <button onClick={() => setView('home')} className="text-sm text-stone-500 hover:text-stone-800 flex items-center gap-1 transition-colors">
              <ArrowLeft size={14} /> Voltar
            </button>

            <div className="bg-white border-2 border-green-200 rounded-xl shadow-soft p-4">
              <button
                onClick={() => setImportAberto((v) => !v)}
                className="eco-btn-primary font-semibold"
              >
                <Upload size={15} /> Importar produtos do PDV
              </button>

              {importAberto && (
                <div className="mt-4 space-y-3">
                  <p className="text-xs text-stone-500">
                    Exporte a lista do seu sistema PDV como CSV ou texto (uma linha por produto: <span className="font-mono">nome, preço</span>, opcionalmente uma 3ª coluna com a unidade) e envie o arquivo, ou cole o conteúdo abaixo.
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="eco-btn-secondary eco-btn-sm cursor-pointer">
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
                    className="eco-input font-mono"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={analisarImportacao}
                      disabled={!importTexto.trim()}
                      className="eco-btn-dark eco-btn-sm"
                    >
                      Analisar
                    </button>
                    {importPreview && (
                      <button
                        onClick={() => { setImportPreview(null); setImportTexto(''); setImportAberto(false); }}
                        className="eco-btn-secondary eco-btn-sm"
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
                        className="eco-btn-primary eco-btn-sm"
                      >
                        <CheckCircle2 size={14} /> Confirmar importação
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="eco-card p-4 flex flex-col sm:flex-row flex-wrap gap-3 items-end">
              <div className="w-full sm:flex-1 min-w-0">
                <label className="text-xs text-stone-500 block mb-1">Produto</label>
                <input
                  value={npNome}
                  onChange={(e) => setNpNome(upperInput(e.target.value))}
                  placeholder="Ex: Cimento CP-II 50kg"
                  list="lista-produtos-existentes"
                  className="eco-input"
                />
                <datalist id="lista-produtos-existentes">
                  {produtos.map((p) => <option key={p.id} value={p.nome} />)}
                </datalist>
              </div>
              <div className="w-full sm:w-28">
                <label className="text-xs text-stone-500 block mb-1">Unidade</label>
                <input value={npUnidade} onChange={(e) => setNpUnidade(upperInput(e.target.value))} placeholder="UN, SACO, M³..."
                  className="eco-input" />
              </div>
              <div className="w-full sm:w-32">
                <label className="text-xs text-stone-500 block mb-1">Preço (R$)</label>
                <input value={npPreco} onChange={(e) => setNpPreco(e.target.value)} placeholder="0,00" inputMode="decimal"
                  className="eco-input" />
              </div>
              <button type="button" onClick={cadastrarProduto} className="eco-btn-primary w-full sm:w-auto">
                <Plus size={15} /> {npEditandoId ? 'Salvar edição' : 'Salvar'}
              </button>
              {npEditandoId && (
                <button type="button" onClick={cancelarEdicaoProduto} className="eco-btn-secondary w-full sm:w-auto">
                  Cancelar
                </button>
              )}
            </div>

            <div className="eco-card p-3 flex flex-col sm:flex-row gap-3 sm:items-center">
              <div className="relative flex-1 min-w-0">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-300" />
                <input
                  value={buscaCatalogo}
                  onChange={(e) => setBuscaCatalogo(e.target.value)}
                  placeholder="Pesquisar produto pelo nome ou unidade…"
                  className="eco-input pl-9"
                />
                {buscaCatalogo && (
                  <button
                    onClick={() => setBuscaCatalogo('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 eco-icon-btn"
                    title="Limpar busca"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-stone-500 whitespace-nowrap">Ordenar por</label>
                <select
                  value={ordemCatalogo}
                  onChange={(e) => setOrdemCatalogo(e.target.value)}
                  className="eco-input sm:w-56"
                >
                  {ORDENS_CATALOGO.map((o) => (
                    <option key={o.key} value={o.key}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="eco-card overflow-hidden">
              <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[560px]">
                <thead className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wide font-semibold">
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
                  {produtos.length > 0 && produtosDoCatalogo.length === 0 && (
                    <tr><td colSpan={5} className="px-3 py-6 text-center text-stone-400">Nenhum produto encontrado para "{buscaCatalogo.trim()}".</td></tr>
                  )}
                  {produtosDoCatalogo.map((p) => {
                    const anterior = p.historico && p.historico.length > 0 ? p.historico[p.historico.length - 1] : null;
                    const variacao = anterior && anterior.preco > 0 ? ((p.preco - anterior.preco) / anterior.preco) * 100 : null;
                    return (
                      <tr key={p.id} className="border-t border-stone-100 eco-table-row">
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
                          <button onClick={() => editarProduto(p)} className="eco-icon-btn mr-1" title="Editar produto">
                            <Pencil size={15} />
                          </button>
                          <button onClick={() => removerProduto(p.id, p.nome)} className="eco-icon-btn-danger" title="Remover produto">
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
              {produtos.length > 0 && (
                <p className="px-3 py-2 border-t border-stone-100 text-xs text-stone-400">
                  {buscaCatalogo.trim()
                    ? `${produtosDoCatalogo.length} de ${produtos.length} produto(s) encontrado(s)`
                    : `${produtos.length} produto(s) no catálogo`}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ---------------- FORNECEDORES ---------------- */}
        {view === 'fornecedores' && (() => {
          const nomeExistente = fornecedores.find((f) => f.nome.toLowerCase() === fnNome.trim().toLowerCase());
          return (
            <div className="space-y-6">
              <div className="eco-card p-4 flex flex-col sm:flex-row flex-wrap gap-3 items-end">
                <div className="w-full sm:flex-1 min-w-0">
                  <label className="text-xs text-stone-500 block mb-1">Fornecedor</label>
                  <input value={fnNome} onChange={(e) => setFnNome(e.target.value)} placeholder="Ex: Depósito São José"
                    list="lista-fornecedores-cadastro"
                    className="eco-input" />
                  <datalist id="lista-fornecedores-cadastro">
                    {fornecedores.map((f) => <option key={f.id} value={f.nome} />)}
                  </datalist>
                </div>
                <div className="w-full sm:w-40">
                  <label className="text-xs text-stone-500 block mb-1">Telefone</label>
                  <input value={fnTelefone} onChange={(e) => setFnTelefone(e.target.value)} placeholder="(00) 00000-0000"
                    className="eco-input" />
                </div>
                <div className="w-full sm:w-40">
                  <label className="text-xs text-stone-500 block mb-1">Categoria</label>
                  <input value={fnCategoria} onChange={(e) => setFnCategoria(e.target.value)} placeholder="Ex: Materiais"
                    className="eco-input" />
                </div>
                <div className="w-full sm:w-44">
                  <label className="text-xs text-stone-500 block mb-1">CNPJ</label>
                  <input value={fnCnpj} onChange={(e) => setFnCnpj(e.target.value)} placeholder="00.000.000/0001-00"
                    className="eco-input" />
                </div>
                <div className="w-full sm:w-36">
                  <label className="text-xs text-stone-500 block mb-1">Cidade</label>
                  <input value={fnCidade} onChange={(e) => setFnCidade(e.target.value)} placeholder="Cidade"
                    className="eco-input" />
                </div>
                <div className="w-full sm:flex-1 sm:min-w-[180px]">
                  <label className="text-xs text-stone-500 block mb-1">E-mail</label>
                  <input value={fnEmail} onChange={(e) => setFnEmail(e.target.value)} placeholder="contato@fornecedor.com"
                    className="eco-input" />
                </div>
                <button type="button" onClick={cadastrarFornecedor} className="eco-btn-primary w-full sm:w-auto">
                  <Plus size={15} /> {nomeExistente ? 'Atualizar' : 'Salvar'}
                </button>
              </div>

              {fornecedores.length === 0 ? (
                <p className="text-center text-stone-400 py-10">Nenhum fornecedor cadastrado ainda. Eles também entram aqui sozinhos quando você digita o nome num lançamento.</p>
              ) : (
                <div className="eco-stagger grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {fornecedores.slice().sort((a, b) => a.nome.localeCompare(b.nome)).map((f) => {
                    const stats = estatisticasFornecedor(f.nome);
                    return (
                      <div key={f.id} className="eco-card p-4 transition-colors duration-150 hover:border-stone-300">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0">
                            <p className="font-semibold text-stone-900">{f.nome}</p>
                            {(f.telefone || f.categoria || f.cidade) && (
                              <p className="text-xs text-stone-400 flex items-center gap-2 mt-0.5 flex-wrap">
                                {f.telefone && <span className="flex items-center gap-1"><Phone size={11} /> {f.telefone}</span>}
                                {f.cidade && <span>{f.cidade}</span>}
                                {f.categoria && <span>{f.categoria}</span>}
                              </p>
                            )}
                            {(f.cnpj || f.email) && (
                              <p className="text-xs text-stone-400 mt-0.5 truncate">
                                {[f.cnpj, f.email].filter(Boolean).join(' · ')}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-shrink-0">
                            <button
                              onClick={() => {
                                setFnNome(f.nome); setFnTelefone(f.telefone || ''); setFnCategoria(f.categoria || '');
                                setFnCnpj(f.cnpj || ''); setFnEmail(f.email || ''); setFnCidade(f.cidade || '');
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className="eco-icon-btn"
                              title="Editar fornecedor"
                            >
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => removerFornecedor(f.id, f.nome)} className="eco-icon-btn-danger" title="Remover fornecedor">
                              <Trash2 size={14} />
                            </button>
                          </div>
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
              <div className="eco-card p-4 flex flex-col sm:flex-row flex-wrap gap-3 items-end">
                <div className="w-full sm:flex-1 sm:min-w-[220px]">
                  <label className="text-xs text-stone-500 block mb-1">Distribuidora</label>
                  {ctDigitandoDistribuidora || fornecedores.length === 0 ? (
                    <div className="flex gap-1.5">
                      <input
                        value={ctFornecedor}
                        onChange={(e) => setCtFornecedor(upperInput(e.target.value))}
                        placeholder="Nome da distribuidora"
                        autoFocus={ctDigitandoDistribuidora}
                        className="eco-input"
                      />
                      {fornecedores.length > 0 && (
                        <button
                          type="button"
                          onClick={() => { setCtDigitandoDistribuidora(false); setCtFornecedor(''); }}
                          className="eco-btn-secondary flex-shrink-0"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ) : (
                    <select
                      value={ctFornecedor}
                      onChange={(e) => {
                        if (e.target.value === '__nova__') { setCtDigitandoDistribuidora(true); setCtFornecedor(''); }
                        else setCtFornecedor(e.target.value);
                      }}
                      className="eco-input"
                    >
                      <option value="">Escolha a distribuidora…</option>
                      {fornecedores.map((f) => <option key={f.id} value={f.nome}>{f.nome}</option>)}
                      <option value="__nova__">+ Cadastrar nova distribuidora</option>
                    </select>
                  )}
                </div>
                <div className="w-full sm:w-36">
                  <label className="text-xs text-stone-500 block mb-1">Valor (R$)</label>
                  <input value={ctValor} onChange={(e) => setCtValor(e.target.value)} placeholder="0,00" inputMode="decimal"
                    className="eco-input" />
                </div>
                <div className="w-full sm:w-44">
                  <label className="text-xs text-stone-500 block mb-1">Vencimento</label>
                  <input type="date" value={ctVencimento} onChange={(e) => setCtVencimento(e.target.value)}
                    className="eco-input" />
                </div>
                <button type="button" onClick={aoCriarConta} className="eco-btn-primary w-full sm:w-auto">
                  <Plus size={15} /> Registrar
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
                        {lista.map((c) => (
                          <div key={c.id} className="px-3 py-2 border-t border-stone-100 first:border-t-0 flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className={`text-sm truncate ${c.status === 'pago' ? 'line-through text-stone-400' : 'text-stone-800'}`}>{nomeDaConta(c)}</p>
                              <p className="text-xs text-stone-400">vence {formatDateBR(c.vencimento)}</p>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <span className="text-sm font-medium">{formatMoney(c.valor)}</span>
                              <button onClick={() => marcarContaPaga(c.id)} className={`text-xs px-2 py-1 rounded-lg border transition-colors duration-150 active:scale-[0.97] ${c.status === 'pago' ? 'border-stone-300 text-stone-500' : 'border-green-300 text-green-700 hover:bg-green-50'}`}>
                                {c.status === 'pago' ? 'Reabrir' : 'Paga'}
                              </button>
                              <button onClick={() => removerConta(c)} className="eco-icon-btn-danger">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          );
        })()}

        {/* ---------------- CREDIÁRIO DOS MONTADORES ---------------- */}
        {view === 'crediario' && (
          <Crediario
            montadores={montadores}
            movimentos={crediario}
            obras={obras}
            catalogoProdutos={catalogoCrediario}
            onSalvarMontadores={salvarMontadores}
            onSalvarMovimentos={salvarCrediario}
            onAviso={setAviso}
            onErro={setErro}
            onConfirmar={confirmar}
          />
        )}

        {/* ---------------- MATERIAIS ---------------- */}
        {view === 'materiais' && (
          <Materiais
            lancamentos={lancamentos}
            obras={obras}
            materialInicial={materialFoco}
            onLimparMaterialInicial={() => setMaterialFoco(null)}
          />
        )}

        {/* ---------------- CONTRATOS ---------------- */}
        {view === 'contratos' && (
          <Contratos
            contratos={contratos}
            config={configuracao}
            obras={obras}
            clientes={clientes}
            onSalvarContrato={salvarContrato}
            onRemoverContrato={removerContrato}
            onAtualizarParcela={atualizarParcelaContrato}
            onAviso={setAviso}
            onErro={setErro}
            onConfirmar={confirmar}
          />
        )}

        {/* ---------------- CONFIGURAÇÕES ---------------- */}
        {view === 'configuracoes' && (
          <Configuracoes
            config={configuracao}
            madeirasPendentes={madeirasPendentes}
            onSalvarConfig={salvarConfiguracao}
            onVincularMadeiras={vincularMadeirasAntigas}
            onAviso={setAviso}
            onErro={setErro}
            onConfirmar={confirmar}
          />
        )}

        {/* ---------------- MADEIRAS (tabela de preços e orçamento ao cliente) ---------------- */}
        {view === 'venda' && (
          <OrcamentoVenda onAviso={setAviso} onErro={setErro} />
        )}

        {/* ---------------- RELATÓRIOS ---------------- */}
        {view === 'relatorios' && (() => {
          const porCategoria = gastosPorCategoriaGeral();
          const porFornecedor = gastosPorFornecedorGeral();
          const totalGeral = lancamentos.reduce((a, l) => a + l.total, 0);
          return (
            <div className="space-y-6">
              <div className="eco-card p-4">
                <p className="text-sm font-semibold text-stone-700 mb-3">Exportar dados</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={exportarTudoCSV} className="eco-btn-secondary eco-btn-sm">
                    <Download size={14} /> Extrato completo (CSV)
                  </button>
                  <button onClick={exportarContasCSV} className="eco-btn-secondary eco-btn-sm">
                    <Download size={14} /> Contas a pagar (CSV)
                  </button>
                  <button onClick={exportarMateriaisCSV} className="eco-btn-secondary eco-btn-sm">
                    <Download size={14} /> Materiais e preços (CSV)
                  </button>
                  <button onClick={exportarContratosCSV} className="eco-btn-secondary eco-btn-sm">
                    <Download size={14} /> Contratos (CSV)
                  </button>
                  <button onClick={exportarParcelasCSV} className="eco-btn-secondary eco-btn-sm">
                    <Download size={14} /> Parcelas a receber (CSV)
                  </button>
                </div>
                {obras.length > 0 && (
                  <>
                    <p className="text-xs text-stone-500 mt-4 mb-2">Exportar uma obra específica:</p>
                    <div className="flex flex-wrap gap-2">
                      {obras.map((o) => (
                        <button key={o.id} onClick={() => exportarObraCSV(o)} className="eco-btn-secondary eco-btn-xs">
                          <Download size={12} /> {o.nome}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                <p className="text-xs text-stone-400 mt-3">Os arquivos CSV abrem direto no Excel, Google Sheets ou similar.</p>
              </div>

              {(() => {
                const dias = ultimoBackup ? Math.floor((Date.now() - new Date(ultimoBackup).getTime()) / 86400000) : null;
                const atrasado = dias === null || dias >= 7;
                return (
                  <div className={`eco-card p-4 ${atrasado ? 'border-amber-300 bg-amber-50/40' : 'border-green-200'}`}>
                    <div className="flex items-start gap-2.5 mb-3">
                      <ShieldCheck size={20} className={`flex-shrink-0 mt-0.5 ${atrasado ? 'text-amber-500' : 'text-green-600'}`} />
                      <div>
                        <p className="text-sm font-semibold text-stone-700">Backup completo do sistema</p>
                        <p className="text-xs text-stone-500 mt-0.5">
                          Baixa um arquivo com TODOS os dados (obras, lançamentos, catálogo, fornecedores e contas). Guarde esse arquivo fora do site — no e-mail, Google Drive, pendrive — como uma cópia de segurança independente do site.
                        </p>
                        <p className={`text-xs mt-1.5 font-medium ${atrasado ? 'text-amber-700' : 'text-green-700'}`}>
                          {ultimoBackup
                            ? `Último backup: ${formatDateBR(ultimoBackup.slice(0, 10))} (${dias === 0 ? 'hoje' : dias === 1 ? 'há 1 dia' : `há ${dias} dias`})${atrasado ? ' — considere fazer um novo' : ''}`
                            : 'Nenhum backup feito ainda neste navegador — recomendado fazer o primeiro agora.'}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={exportarBackupCompleto} className="eco-btn-primary eco-btn-sm">
                        <Download size={14} /> Baixar backup completo
                      </button>
                      <button onClick={abrirSeletorRestauracao} className="eco-btn-secondary eco-btn-sm">
                        <Upload size={14} /> Restaurar backup
                      </button>
                      <input
                        ref={backupInputRef}
                        type="file"
                        accept="application/json,.json"
                        onChange={handleArquivoRestauracao}
                        className="hidden"
                      />
                    </div>
                    <p className="text-xs text-stone-400 mt-3">
                      "Restaurar backup" substitui todos os dados atuais pelos do arquivo escolhido — use só se precisar recuperar dados perdidos.
                    </p>
                  </div>
                );
              })()}

              <div className="eco-stagger grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="eco-card p-4">
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

                <div className="eco-card p-4">
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
            <button onClick={() => { setView('home'); setObraAtivaId(null); }} className="text-sm text-stone-500 hover:text-stone-800 flex items-center gap-1 transition-colors">
              <ArrowLeft size={14} /> Todas as obras
            </button>

            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-semibold text-stone-900">{obraAtiva.nome}</h2>
                  {obraConcluida ? (
                    <span className="eco-badge bg-green-50 text-green-700 border border-green-200">
                      <CheckCircle2 size={12} /> OBRA CONCLUÍDA
                    </span>
                  ) : (
                    <span className="eco-badge bg-blue-50 text-blue-700 border border-blue-200">🟢 EM ANDAMENTO</span>
                  )}
                </div>
                <p className="text-xs text-stone-400">
                  desde {formatDateBR(obraAtiva.criadoEm)}
                  {obraConcluida && obraAtiva.finalizadaEm && ` · Finalizada em: ${formatDateBR(obraAtiva.finalizadaEm.slice(0, 10))}`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => exportarObraCSV(obraAtiva)} className="eco-btn-secondary eco-btn-sm">
                  <Download size={14} /> CSV
                </button>
                <button onClick={() => copiarResumoObra(obraAtiva)} className="eco-btn-secondary eco-btn-sm">
                  <Copy size={14} /> Copiar resumo
                </button>
                <div className="text-right">
                  <p className="text-xs text-stone-500">Total da obra</p>
                  <p className="text-xl font-semibold text-green-800">{formatMoney(totalObra(obraAtiva.id))}</p>
                </div>
              </div>
            </div>

            {/* ---- ação de encerramento da obra: separada das ações do dia a dia ---- */}
            {obraConcluida ? (
              <div className="eco-card p-4 border-green-200 bg-green-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-green-800">Obra concluída</p>
                    <p className="text-xs text-green-700/80">Os lançamentos e o orçamento ficam protegidos contra alteração acidental. Reabra a obra se precisar corrigir algo.</p>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => pedirReaberturaObra(obraAtiva.id)} className="eco-btn-secondary eco-btn-sm">
                    <RotateCcw size={14} /> Reabrir obra
                  </button>
                  <button onClick={() => setView('resumo')} className="eco-btn-primary eco-btn-sm">
                    <ClipboardCheck size={14} /> Ver resumo final
                  </button>
                </div>
              </div>
            ) : (
              <div className="eco-card p-4 border-green-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck size={20} className="text-stone-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-stone-700">Encerramento da obra</p>
                    <p className="text-xs text-stone-400">Quando a obra terminar, finalize para consolidar o resumo financeiro e travar os lançamentos.</p>
                  </div>
                </div>
                <button onClick={() => setModalFinalizarId(obraAtiva.id)} className="eco-btn-dark eco-btn-sm flex-shrink-0">
                  <CheckCircle2 size={14} /> Finalizar obra
                </button>
              </div>
            )}

            {obraAtiva.orcamento ? (
              <div className="eco-card p-3">
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
                  {!obraConcluida && (
                    <>
                      {' · '}
                      <button onClick={() => definirOrcamento(obraAtiva.id)} className="underline hover:text-green-700">editar</button>
                    </>
                  )}
                </p>
              </div>
            ) : !obraConcluida ? (
              <button onClick={() => definirOrcamento(obraAtiva.id)} className="text-xs text-stone-400 hover:text-green-700 flex items-center gap-1 transition-colors">
                <Pencil size={12} /> Definir orçamento para esta obra
              </button>
            ) : null}

            {/* ---- contrato e parcelas a receber desta obra ---- */}
            {(() => {
              const contratosDaObra = contratos.filter((c) => c.obraId === obraAtiva.id && c.status !== 'cancelado');
              const resumoRec = resumoParcelasDaObra(contratos, obraAtiva.id);
              if (contratosDaObra.length === 0) {
                return (
                  <div className="eco-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <FileSignature size={20} className="text-stone-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-stone-700">Contrato</p>
                        <p className="text-xs text-stone-400">
                          Esta obra ainda não tem contrato. Ao gerar, os dados da obra já vão preenchidos.
                        </p>
                      </div>
                    </div>
                    <button onClick={() => setView('contratos')} className="eco-btn-secondary eco-btn-sm flex-shrink-0">
                      <FileSignature size={14} /> Gerar contrato
                    </button>
                  </div>
                );
              }
              return (
                <div className="eco-card p-4">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <p className="text-sm font-semibold text-stone-700 flex items-center gap-1.5">
                      <Wallet size={15} /> Contrato e recebimentos
                    </p>
                    <button onClick={() => setView('contratos')} className="text-xs text-stone-500 underline hover:text-green-700 flex-shrink-0">
                      abrir contratos
                    </button>
                  </div>
                  {contratosDaObra.map((c) => (
                    <p key={c.id} className="text-xs text-stone-500 mb-1.5">
                      {c.numero ? `Contrato nº ${c.numero}` : 'Contrato (rascunho)'} · {formatMoney(c.valorTotal)}
                      {' · '}<span className="uppercase">{c.status}</span>
                    </p>
                  ))}
                  {resumoRec.quantidade > 0 && (
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      <div className="bg-stone-50 rounded-lg p-2">
                        <p className="text-[11px] text-stone-400">Contratado</p>
                        <p className="text-sm font-semibold text-stone-800">{formatMoney(resumoRec.total)}</p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-2">
                        <p className="text-[11px] text-green-700/70">Recebido</p>
                        <p className="text-sm font-semibold text-green-800">{formatMoney(resumoRec.recebido)}</p>
                      </div>
                      <div className={`rounded-lg p-2 ${resumoRec.vencidas > 0 ? 'bg-red-50' : 'bg-amber-50'}`}>
                        <p className={`text-[11px] ${resumoRec.vencidas > 0 ? 'text-red-700/70' : 'text-amber-700/70'}`}>
                          A receber{resumoRec.vencidas > 0 ? ` (${resumoRec.vencidas} atrasada${resumoRec.vencidas > 1 ? 's' : ''})` : ''}
                        </p>
                        <p className={`text-sm font-semibold ${resumoRec.vencidas > 0 ? 'text-red-700' : 'text-amber-700'}`}>
                          {formatMoney(resumoRec.aReceber)}
                        </p>
                      </div>
                    </div>
                  )}
                  <p className="text-[11px] text-stone-400 mt-2">
                    Parcelas são o que o cliente paga à Casas Eco (receita) — não se misturam com o custo da obra acima.
                  </p>
                </div>
              );
            })()}

            <nav className="grid grid-cols-3 gap-2">
              {Object.entries(CATEGORIAS).map(([key, cat]) => {
                const Icon = cat.icon;
                const c = CLS[cat.cls];
                const ativo = categoriaAtiva === key;
                return (
                  <button
                    key={key}
                    onClick={() => { setCategoriaAtiva(key); resetFormLancamento(); }}
                    className={`min-w-0 text-xs sm:text-sm px-2 sm:px-3 py-2 rounded-lg border flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 text-center transition-colors duration-150 ${
                      ativo ? `${c.solid} text-white border-transparent` : `bg-white ${c.text} ${c.border}`
                    }`}
                  >
                    <span className="flex items-center gap-1 min-w-0">
                      <Icon size={15} className="flex-shrink-0" /> <span className="truncate">{cat.label}</span>
                    </span>
                    <span className="opacity-80 sm:ml-1 truncate">{formatMoney(totalObraCategoria(obraAtiva.id, key))}</span>
                  </button>
                );
              })}
            </nav>

            {(() => {
              const orcCat = obraAtiva.orcamentoCategorias ? obraAtiva.orcamentoCategorias[categoriaAtiva] : null;
              const gastoCat = totalObraCategoria(obraAtiva.id, categoriaAtiva);
              return (
                <div className="eco-card p-3">
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
                        {!obraConcluida && (
                          <>
                            {' · '}
                            <button onClick={() => definirOrcamentoCategoria(obraAtiva.id, categoriaAtiva)} className="underline hover:text-green-700">editar</button>
                          </>
                        )}
                      </p>
                    </>
                  ) : !obraConcluida ? (
                    <button onClick={() => definirOrcamentoCategoria(obraAtiva.id, categoriaAtiva)} className="text-xs text-stone-400 hover:text-green-700 flex items-center gap-1 transition-colors">
                      <Pencil size={12} /> Definir orçamento para {CATEGORIAS[categoriaAtiva].label}
                    </button>
                  ) : (
                    <p className="text-xs text-stone-300">Sem orçamento definido para {CATEGORIAS[categoriaAtiva].label}.</p>
                  )}
                </div>
              );
            })()}

            {/* ---- Etapas da obra ---- */}
            <div className="eco-card p-4">
              <p className="text-sm font-semibold text-stone-700 mb-3">Etapas da obra</p>
              {obraConcluida && (
                <p className="text-xs text-stone-400 flex items-center gap-1 mb-3"><Lock size={12} /> Obra concluída — reabra para adicionar ou remover etapas.</p>
              )}
              {!obraConcluida && (
              <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-end mb-4">
                <div className="w-full sm:flex-1 min-w-0">
                  <label className="text-xs text-stone-500 block mb-1">Nome da etapa</label>
                  <input value={novaEtapaNome} onChange={(e) => setNovaEtapaNome(e.target.value)} placeholder="Ex: Fundação, Alvenaria, Cobertura..."
                    className="eco-input" />
                </div>
                <div className="w-full sm:w-40">
                  <label className="text-xs text-stone-500 block mb-1">Orçamento (opcional)</label>
                  <input value={novaEtapaOrcamento} onChange={(e) => setNovaEtapaOrcamento(e.target.value)} placeholder="0,00" inputMode="decimal"
                    className="eco-input" />
                </div>
                <button type="button" onClick={() => criarEtapa(obraAtiva.id)} className="eco-btn-dark w-full sm:w-auto">
                  <Plus size={15} /> Adicionar etapa
                </button>
              </div>
              )}

              {etapas.filter((et) => et.obraId === obraAtiva.id).length === 0 ? (
                <p className="text-xs text-stone-400">Nenhuma etapa criada ainda. Etapas ajudam a saber onde o dinheiro está indo dentro da obra (fundação, alvenaria, cobertura...).</p>
              ) : (
                <div className="space-y-2">
                  {etapas.filter((et) => et.obraId === obraAtiva.id).map((et) => {
                    const gasto = totalEtapa(et.id);
                    const pct = et.orcamento ? Math.min(100, (gasto / et.orcamento) * 100) : null;
                    return (
                      <div key={et.id} className="border border-stone-100 rounded-lg p-2.5 transition-colors duration-150 hover:border-stone-200">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-stone-800">{et.nome}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-stone-600">{formatMoney(gasto)}{et.orcamento ? ` / ${formatMoney(et.orcamento)}` : ''}</p>
                            {!obraConcluida && (
                              <button onClick={() => removerEtapa(et.id, et.nome)} className="eco-icon-btn-danger">
                                <Trash2 size={14} />
                              </button>
                            )}
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

            {obraConcluida && (
              <p className="text-xs text-stone-400 flex items-center gap-1 -mb-2"><Lock size={12} /> Obra concluída — reabra a obra para lançar novos gastos.</p>
            )}
            {!obraConcluida && (
            <div className="eco-card p-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 items-end">
              <div className="col-span-2 sm:col-span-4 lg:col-span-2">
                <label className="text-xs text-stone-500 block mb-1">
                  {categoriaAtiva === 'produto_loja' ? 'Produto' : 'Descrição'}
                </label>
                <ProdutoSeletor
                  value={ldDescricao}
                  onChangeTexto={aoDigitarDescricao}
                  onSelecionar={selecionarItemCatalogo}
                  itens={catalogoAtivo}
                  categoriaLabel={CATEGORIAS[categoriaAtiva].label}
                  placeholder={
                    categoriaAtiva === 'produto_loja'
                      ? 'Digite ou escolha — se já existir, o preço vem sozinho'
                      : categoriaAtiva === 'mao_de_obra' ? 'Ex: Pedreiro - diária' : 'Ex: Areia lavada'
                  }
                />
              </div>
              <div className="col-span-1">
                <label className="text-xs text-stone-500 block mb-1">Qtd.</label>
                <input value={ldQuantidade} onChange={(e) => setLdQuantidade(e.target.value)} inputMode="decimal"
                  className="eco-input" />
              </div>
              <div className="col-span-1">
                <label className="text-xs text-stone-500 block mb-1">Unid.</label>
                <input value={ldUnidade} onChange={(e) => setLdUnidade(upperInput(e.target.value))} placeholder="UN, M³..."
                  className="eco-input" />
              </div>
              <div className="col-span-1">
                <label className="text-xs text-stone-500 block mb-1">Valor (R$)</label>
                <input value={ldPreco} onChange={(e) => setLdPreco(e.target.value)} placeholder="0,00" inputMode="decimal"
                  className="eco-input" />
              </div>
              <div className="col-span-1">
                <label className="text-xs text-stone-500 block mb-1">Data</label>
                <input type="date" value={ldData} onChange={(e) => setLdData(e.target.value)}
                  className="eco-input" />
              </div>
              {etapas.filter((et) => et.obraId === obraAtiva.id).length > 0 && (
                <div className="col-span-1">
                  <label className="text-xs text-stone-500 block mb-1">Etapa (opc.)</label>
                  <select value={ldEtapaId} onChange={(e) => setLdEtapaId(e.target.value)}
                    className="eco-input">
                    <option value="">Nenhuma</option>
                    {etapas.filter((et) => et.obraId === obraAtiva.id).map((et) => (
                      <option key={et.id} value={et.id}>{et.nome}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="col-span-2 sm:col-span-2 lg:col-span-2">
                <label className="text-xs text-stone-500 block mb-1">Fornecedor (opcional)</label>
                <input
                  value={ldFornecedor}
                  onChange={(e) => { setLdFornecedor(e.target.value); setLdFornecedorAutomatico(false); }}
                  placeholder="Ex: Depósito São José"
                  list="lista-fornecedores-lancamento"
                  className="eco-input"
                />
                <datalist id="lista-fornecedores-lancamento">
                  {fornecedores.map((f) => <option key={f.id} value={f.nome} />)}
                </datalist>
                {ldFornecedorAutomatico && (
                  <p className="text-[11px] text-green-700 mt-1 flex items-center gap-1">
                    <Trees size={11} /> madeira — gasto vinculado a {ldFornecedor} (dá para trocar)
                  </p>
                )}
              </div>
              <div className="col-span-2 sm:col-span-2 lg:col-span-2">
                <label className="text-xs text-stone-500 block mb-1">Observação (opcional)</label>
                <input value={ldObservacao} onChange={(e) => setLdObservacao(e.target.value)} placeholder="Ex: comprado em outra loja"
                  className="eco-input" />
              </div>
              <div className="col-span-2 sm:col-span-4 lg:col-span-2 flex gap-2">
                <button type="button" onClick={lancar} className={`flex-1 text-white text-sm font-medium px-4 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all duration-150 active:scale-[0.97] ${CLS[CATEGORIAS[categoriaAtiva].cls].solid} hover:opacity-90`}>
                  <Plus size={15} /> {editandoId ? 'Salvar edição' : 'Lançar'}
                </button>
                {editandoId && (
                  <button type="button" onClick={resetFormLancamento} className="eco-btn-secondary flex-1">
                    Cancelar
                  </button>
                )}
              </div>
            </div>
            )}
            {!obraConcluida && categoriaAtiva === 'produto_loja' && produtos.length === 0 && (
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
                <div className="eco-card overflow-hidden">
                  <div className="p-2 border-b border-stone-100">
                    <input
                      value={buscaLancamento}
                      onChange={(e) => setBuscaLancamento(e.target.value)}
                      placeholder="Buscar por descrição, fornecedor ou observação..."
                      className="eco-input"
                    />
                  </div>
                  <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[600px]">
                    <thead className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wide font-semibold">
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
                        <tr key={l.id} className="border-t border-stone-100 eco-table-row">
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
                            {obraConcluida ? (
                              <Lock size={13} className="inline text-stone-300" />
                            ) : (
                              <>
                                <button onClick={() => editarLancamento(l)} className="eco-icon-btn mr-1" title="Editar">
                                  <Pencil size={15} />
                                </button>
                                <button onClick={() => removerLancamento(l.id)} className="eco-icon-btn-danger" title="Remover">
                                  <Trash2 size={15} />
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ---------------- RESUMO FINAL DA OBRA ---------------- */}
        {view === 'resumo' && obraAtiva && (
          <ResumoFinalObra
            obra={obraAtiva}
            lancamentos={lancamentos}
            onVoltar={() => setView('obra')}
          />
        )}
        </main>
      </div>

      {modalFinalizarId && obraDoModalFinalizar && (
        <FinalizarObraModal
          obra={obraDoModalFinalizar}
          lancamentos={lancamentos}
          onCancelar={() => setModalFinalizarId(null)}
          onConfirmar={(observacoes) => finalizarObra(modalFinalizarId, observacoes)}
        />
      )}

      {sucessoFinalizacaoId && obraDoSucesso && (
        <SucessoFinalizacaoModal
          obra={obraDoSucesso}
          onFechar={() => setSucessoFinalizacaoId(null)}
          onVerResumo={() => { setSucessoFinalizacaoId(null); setView('resumo'); }}
        />
      )}

      {dialogo && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-popover p-5 w-full max-w-sm animate-scale-in">
            <p className="text-sm text-stone-700 mb-4">{dialogo.mensagem}</p>
            {dialogo.tipo === 'prompt' && (
              <input
                autoFocus
                value={dialogo.valor}
                onChange={(e) => setDialogo({ ...dialogo, valor: e.target.value })}
                onKeyDown={(e) => { if (e.key === 'Enter') { dialogo.onConfirmar(dialogo.valor); setDialogo(null); } }}
                placeholder="0,00"
                inputMode="decimal"
                className="eco-input mb-4"
              />
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => setDialogo(null)} className="eco-btn-secondary eco-btn-sm">
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (dialogo.tipo === 'prompt') dialogo.onConfirmar(dialogo.valor);
                  else dialogo.onConfirmar();
                  setDialogo(null);
                }}
                className="eco-btn-primary eco-btn-sm"
              >
                {dialogo.tipo === 'prompt' ? 'Salvar' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BuscaGlobal
        aberto={buscaAberta}
        onFechar={() => setBuscaAberta(false)}
        dados={{ obras, clientes, produtos, fornecedores, contratos, lancamentos, contas, montadores, crediario }}
        onIr={(destino) => {
          if (destino.view === 'obra' && destino.obraId) {
            setObraAtivaId(destino.obraId);
            setView('obra');
          } else {
            if (destino.material) setMaterialFoco(destino.material);
            setView(destino.view);
          }
        }}
      />

      <ToastStack
        aviso={aviso}
        erro={erro}
        onFecharAviso={() => setAviso('')}
        onFecharErro={() => setErro('')}
      />
    </div>
  );
}
