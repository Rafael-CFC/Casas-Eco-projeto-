import React, { useState } from 'react';
import { Building2, FileSignature, ClipboardList, Save, Info, RotateCcw } from 'lucide-react';
import {
  MARCADORES_DISPONIVEIS, blocosContratoDaConfig, blocosMemorialDaConfig,
  contratadaEstaPreenchida, configuracaoVazia,
} from './configStore';

const ABAS = [
  { key: 'contratada', label: 'Dados da empresa', icon: Building2 },
  { key: 'contrato', label: 'Texto do contrato', icon: FileSignature },
  { key: 'memorial', label: 'Texto do memorial', icon: ClipboardList },
];

export default function Configuracoes({ config, onSalvarConfig, onAviso, onErro }) {
  const [aba, setAba] = useState('contratada');
  const [rascunho, setRascunho] = useState(config);
  const [salvando, setSalvando] = useState(false);
  const [mostrarMarcadores, setMostrarMarcadores] = useState(false);

  const sujo = JSON.stringify(rascunho) !== JSON.stringify(config);

  function setContratada(campo, valor) {
    setRascunho((r) => ({ ...r, contratada: { ...r.contratada, [campo]: valor } }));
  }

  function setBloco(qualDoc, chave, texto) {
    const campo = qualDoc === 'memorial' ? 'modeloMemorial' : 'modeloContrato';
    setRascunho((r) => {
      const blocos = r[campo].blocos.some((b) => b.chave === chave)
        ? r[campo].blocos.map((b) => (b.chave === chave ? { ...b, texto } : b))
        : [...r[campo].blocos, { chave, texto }];
      return { ...r, [campo]: { ...r[campo], blocos } };
    });
  }

  // Voltar ao original = apagar a edição, e não copiar o texto padrão para
  // dentro dela: assim o bloco volta a acompanhar o modelo do sistema.
  function restaurarBloco(qualDoc, chave) {
    const campo = qualDoc === 'memorial' ? 'modeloMemorial' : 'modeloContrato';
    setRascunho((r) => ({
      ...r,
      [campo]: { ...r[campo], blocos: r[campo].blocos.filter((b) => b.chave !== chave) },
    }));
  }

  async function salvar() {
    setSalvando(true);
    try {
      // A versão sobe quando o texto do modelo muda — cada contrato guarda
      // em qual versão foi gerado. A referência vem sempre de `config`
      // (o que está salvo), nunca do rascunho local.
      const versaoC = config.modeloContrato.versao || 1;
      const versaoM = config.modeloMemorial.versao || 1;
      const mudouContrato = JSON.stringify(rascunho.modeloContrato.blocos) !== JSON.stringify(config.modeloContrato.blocos);
      const mudouMemorial = JSON.stringify(rascunho.modeloMemorial.blocos) !== JSON.stringify(config.modeloMemorial.blocos);
      const paraSalvar = {
        ...rascunho,
        modeloContrato: { ...rascunho.modeloContrato, versao: mudouContrato ? versaoC + 1 : versaoC },
        modeloMemorial: { ...rascunho.modeloMemorial, versao: mudouMemorial ? versaoM + 1 : versaoM },
      };
      const ok = await onSalvarConfig(paraSalvar);
      if (ok) {
        setRascunho(paraSalvar);
        onAviso('Configurações salvas.');
      } else {
        onErro('Não foi possível salvar as configurações.');
      }
    } catch (e) {
      onErro('Não foi possível salvar as configurações.');
    } finally {
      setSalvando(false);
    }
  }

  const camposContratada = [
    ['razaoSocial', 'Razão social *', ''],
    ['cnpj', 'CNPJ *', ''],
    ['endereco', 'Endereço', ''],
    ['cidade', 'Cidade', ''],
    ['estado', 'Estado (UF)', ''],
    ['representante', 'Representante (assina o contrato)', ''],
    ['cpfRepresentante', 'CPF do representante', ''],
    ['telefone', 'Telefone', ''],
    ['email', 'E-mail', ''],
  ];

  const blocosContrato = blocosContratoDaConfig(rascunho);
  const blocosMemorial = blocosMemorialDaConfig(rascunho);
  const padrao = configuracaoVazia();
  const padraoContrato = blocosContratoDaConfig(padrao);
  const padraoMemorial = blocosMemorialDaConfig(padrao);

  function EditorBlocos({ qualDoc, blocos }) {
    const original = qualDoc === 'memorial' ? padraoMemorial : padraoContrato;
    return (
      <div className="space-y-3">
        {blocos.map((b) => {
          const textoPadrao = original.find((x) => x.chave === b.chave)?.texto || '';
          const alterado = b.texto !== textoPadrao;
          if (b.tabelaParcelas) {
            return (
              <div key={b.chave} className="eco-card p-4 bg-stone-50">
                <p className="text-sm font-medium text-stone-600">{b.rotulo}</p>
                <p className="text-xs text-stone-400 mt-1">
                  Montada automaticamente a partir das parcelas de cada contrato — não precisa editar aqui.
                </p>
              </div>
            );
          }
          return (
            <div key={b.chave} className="eco-card p-4">
              <div className="flex items-start justify-between gap-2 mb-1">
                <label className="eco-label mb-0 flex items-center gap-1.5">
                  {b.rotulo}
                  {b.variavel && (
                    <span className="eco-badge bg-blue-50 text-blue-700 border border-blue-200 text-[10px]">muda por obra</span>
                  )}
                  {alterado && (
                    <span className="eco-badge bg-amber-50 text-amber-700 border border-amber-200 text-[10px]">editado</span>
                  )}
                </label>
                {alterado && (
                  <button
                    onClick={() => restaurarBloco(qualDoc, b.chave)}
                    className="text-[11px] text-stone-400 hover:text-green-700 flex items-center gap-1 flex-shrink-0"
                  >
                    <RotateCcw size={11} /> voltar ao original
                  </button>
                )}
              </div>
              <textarea
                value={b.texto}
                onChange={(e) => setBloco(qualDoc, b.chave, e.target.value)}
                rows={Math.min(12, Math.max(2, Math.ceil(b.texto.length / 90)))}
                className="eco-input text-xs"
              />
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24 sm:pb-6">
      <div className={`eco-card p-3 ${contratadaEstaPreenchida(rascunho) ? 'border-green-200' : 'border-amber-300 bg-amber-50/40'}`}>
        <p className="text-xs text-stone-500">Dados da empresa</p>
        <p className={`text-sm font-semibold ${contratadaEstaPreenchida(rascunho) ? 'text-green-700' : 'text-amber-700'}`}>
          {contratadaEstaPreenchida(rascunho) ? 'Preenchidos' : 'Faltam razão social e CNPJ'}
        </p>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {ABAS.map((a) => {
          const Icon = a.icon;
          const ativo = aba === a.key;
          return (
            <button
              key={a.key}
              onClick={() => setAba(a.key)}
              className={`flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg border whitespace-nowrap transition-colors ${
                ativo ? 'bg-green-700 text-white border-green-700' : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
              }`}
            >
              <Icon size={15} /> {a.label}
            </button>
          );
        })}
      </div>

      {aba === 'contratada' && (
        <div className="eco-card p-4 space-y-3">
          <div>
            <p className="text-sm font-semibold text-stone-700">Dados da CONTRATADA</p>
            <p className="text-xs text-stone-500 mt-0.5">
              Aparecem automaticamente em todo contrato. Se mudarem no futuro, contratos já gerados continuam com os dados antigos.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {camposContratada.map(([campo, label, ph]) => (
              <div key={campo} className={campo === 'razaoSocial' || campo === 'endereco' ? 'sm:col-span-2' : ''}>
                <label className="eco-label">{label}</label>
                <input
                  value={rascunho.contratada[campo] || ''}
                  onChange={(e) => setContratada(campo, e.target.value)}
                  placeholder={ph}
                  className="eco-input"
                />
              </div>
            ))}
            <div className="sm:col-span-2">
              <label className="eco-label">Dados bancários</label>
              <textarea
                value={rascunho.contratada.dadosBancarios || ''}
                onChange={(e) => setContratada('dadosBancarios', e.target.value)}
                rows={2}
                className="eco-input"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="eco-label">Cidade de assinatura dos contratos</label>
              <input
                value={rascunho.cidadeContrato || ''}
                onChange={(e) => setRascunho((r) => ({ ...r, cidadeContrato: e.target.value }))}
                className="eco-input"
              />
            </div>
          </div>
        </div>
      )}

      {(aba === 'contrato' || aba === 'memorial') && (
        <>
          <div className="eco-card p-4 border-blue-200 bg-blue-50/40">
            <div className="flex items-start gap-2.5">
              <Info size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-blue-900">
                  Este é o texto que sai no PDF — já preenchido com o modelo da Casas Eco
                </p>
                <p className="text-xs text-blue-800/80 mt-1">
                  Os blocos marcados como <strong>"muda por obra"</strong> têm campos que são preenchidos na hora de
                  criar cada contrato. O resto sai igual em todos. Só mexa aqui se o modelo da empresa mudar de vez —
                  para ajustar só um contrato, edite direto na tela dele.
                </p>
                <button onClick={() => setMostrarMarcadores((v) => !v)} className="text-xs text-blue-700 underline mt-2">
                  {mostrarMarcadores ? 'Esconder' : 'Ver'} os campos automáticos
                </button>
                {mostrarMarcadores && (
                  <div className="mt-2 bg-white border border-blue-200 rounded-lg p-2.5 max-h-52 overflow-y-auto space-y-1">
                    {MARCADORES_DISPONIVEIS.map((m) => (
                      <div key={m.chave} className="flex justify-between gap-2 text-xs">
                        <code className="text-green-800 font-mono">{m.chave}</code>
                        <span className="text-stone-400 text-right">{m.descricao}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="eco-card p-3 bg-stone-50 border-stone-200">
            <p className="text-xs text-stone-500">
              Para deixar um trecho em <strong>negrito</strong>, escreva ele entre dois
              asteriscos — <code className="font-mono text-green-800">**assim**</code>. É o que
              destaca a razão social, o CNPJ e o nome das partes no contrato.
            </p>
          </div>
          <EditorBlocos qualDoc={aba} blocos={aba === 'memorial' ? blocosMemorial : blocosContrato} />
        </>
      )}

      {sujo && (
        <div className="fixed inset-x-0 bottom-16 sm:bottom-0 z-30 px-3 sm:px-0 sm:static">
          <div className="eco-card max-w-5xl mx-auto sm:mx-0 p-3 flex items-center justify-between gap-3 shadow-elevated sm:shadow-soft border-green-200">
            <p className="text-sm text-stone-600">Alterações não salvas.</p>
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={() => setRascunho(config)} className="eco-btn-secondary eco-btn-sm">Descartar</button>
              <button onClick={salvar} disabled={salvando} className="eco-btn-primary eco-btn-sm">
                <Save size={14} /> {salvando ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
