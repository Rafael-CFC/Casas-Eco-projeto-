import React, { useState } from 'react';
import { Building2, FileSignature, ClipboardList, Save, Info, ChevronDown } from 'lucide-react';
import {
  MODELOS_OBRA, CATEGORIAS_MEMORIAL, MARCADORES_DISPONIVEIS,
  memorialPadraoDoModelo, contratadaEstaPreenchida, modeloContratoEstaPreenchido,
} from './configStore';

const ABAS = [
  { key: 'contratada', label: 'Dados da empresa', icon: Building2 },
  { key: 'contrato', label: 'Modelo de contrato', icon: FileSignature },
  { key: 'memorial', label: 'Memorial padrão', icon: ClipboardList },
];

export default function Configuracoes({ config, onSalvarConfig, onAviso, onErro }) {
  const [aba, setAba] = useState('contratada');
  const [rascunho, setRascunho] = useState(config);
  const [modeloMemorialAtivo, setModeloMemorialAtivo] = useState('mista');
  const [salvando, setSalvando] = useState(false);
  const [mostrarMarcadores, setMostrarMarcadores] = useState(false);

  const sujo = JSON.stringify(rascunho) !== JSON.stringify(config);

  function setContratada(campo, valor) {
    setRascunho((r) => ({ ...r, contratada: { ...r.contratada, [campo]: valor } }));
  }

  function setClausula(chave, texto) {
    setRascunho((r) => ({
      ...r,
      modeloContrato: {
        ...r.modeloContrato,
        clausulas: r.modeloContrato.clausulas.map((c) => (c.chave === chave ? { ...c, texto } : c)),
      },
    }));
  }

  function setMemorial(modeloKey, chave, texto) {
    setRascunho((r) => {
      const atuais = memorialPadraoDoModelo(r, modeloKey);
      const novas = atuais.map((c) => (c.chave === chave ? { ...c, texto } : c));
      return {
        ...r,
        modelosMemorial: { ...r.modelosMemorial, [modeloKey]: { categorias: novas } },
      };
    });
  }

  async function salvar() {
    setSalvando(true);
    try {
      // A versão do modelo de contrato sobe sempre que o texto das cláusulas
      // muda — assim cada contrato guarda em qual versão foi gerado.
      // A versão de referência vem SEMPRE de `config` (o que está salvo), e
      // não do rascunho local: senão um segundo salvamento seguido gravaria
      // de volta a versão antiga que o rascunho ainda carregava.
      const versaoAtual = config.modeloContrato.versao || 1;
      const clausulasMudaram =
        JSON.stringify(rascunho.modeloContrato.clausulas) !== JSON.stringify(config.modeloContrato.clausulas);
      const paraSalvar = {
        ...rascunho,
        modeloContrato: {
          ...rascunho.modeloContrato,
          versao: clausulasMudaram ? versaoAtual + 1 : versaoAtual,
        },
      };
      const ok = await onSalvarConfig(paraSalvar);
      if (ok) {
        setRascunho(paraSalvar); // mantém o rascunho igual ao que foi salvo
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

  const memorialAtual = memorialPadraoDoModelo(rascunho, modeloMemorialAtivo);
  const camposContratada = [
    ['razaoSocial', 'Razão social *', 'CASAS ECO ...'],
    ['cnpj', 'CNPJ *', '00.000.000/0001-00'],
    ['endereco', 'Endereço', 'Rua, número, bairro'],
    ['cidade', 'Cidade', ''],
    ['estado', 'Estado (UF)', 'SC'],
    ['representante', 'Representante legal', 'Nome completo'],
    ['cpfRepresentante', 'CPF do representante', '000.000.000-00'],
    ['telefone', 'Telefone', ''],
    ['email', 'E-mail', ''],
  ];

  return (
    <div className="space-y-4 pb-24 sm:pb-6">
      {/* status de preenchimento */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className={`eco-card p-3 ${contratadaEstaPreenchida(rascunho) ? 'border-green-200' : 'border-amber-300 bg-amber-50/40'}`}>
          <p className="text-xs text-stone-500">Dados da empresa</p>
          <p className={`text-sm font-semibold ${contratadaEstaPreenchida(rascunho) ? 'text-green-700' : 'text-amber-700'}`}>
            {contratadaEstaPreenchida(rascunho) ? 'Preenchidos' : 'Faltam razão social e CNPJ'}
          </p>
        </div>
        <div className={`eco-card p-3 ${modeloContratoEstaPreenchido(rascunho) ? 'border-green-200' : 'border-amber-300 bg-amber-50/40'}`}>
          <p className="text-xs text-stone-500">Modelo de contrato</p>
          <p className={`text-sm font-semibold ${modeloContratoEstaPreenchido(rascunho) ? 'text-green-700' : 'text-amber-700'}`}>
            {modeloContratoEstaPreenchido(rascunho) ? 'Cadastrado' : 'Cole o texto do seu contrato'}
          </p>
        </div>
      </div>

      {/* abas */}
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

      {/* ---- ABA: dados da contratada ---- */}
      {aba === 'contratada' && (
        <div className="eco-card p-4 space-y-3">
          <div>
            <p className="text-sm font-semibold text-stone-700">Dados da CONTRATADA</p>
            <p className="text-xs text-stone-500 mt-0.5">
              Preenchidos uma única vez. Aparecem automaticamente em todo contrato novo.
              Se mudarem no futuro, contratos já gerados continuam com os dados antigos.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {camposContratada.map(([campo, label, placeholder]) => (
              <div key={campo} className={campo === 'razaoSocial' || campo === 'endereco' ? 'sm:col-span-2' : ''}>
                <label className="eco-label">{label}</label>
                <input
                  value={rascunho.contratada[campo] || ''}
                  onChange={(e) => setContratada(campo, e.target.value)}
                  placeholder={placeholder}
                  className="eco-input"
                />
              </div>
            ))}
            <div className="sm:col-span-2">
              <label className="eco-label">Dados bancários (opcional)</label>
              <textarea
                value={rascunho.contratada.dadosBancarios || ''}
                onChange={(e) => setContratada('dadosBancarios', e.target.value)}
                rows={2}
                placeholder="Banco, agência, conta, PIX…"
                className="eco-input"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="eco-label">Cidade de assinatura dos contratos</label>
              <input
                value={rascunho.cidadeContrato || ''}
                onChange={(e) => setRascunho((r) => ({ ...r, cidadeContrato: e.target.value }))}
                placeholder="Cidade que aparece antes da data, no fim do contrato"
                className="eco-input"
              />
            </div>
          </div>
        </div>
      )}

      {/* ---- ABA: modelo de contrato ---- */}
      {aba === 'contrato' && (
        <div className="space-y-3">
          <div className="eco-card p-4 border-blue-200 bg-blue-50/40">
            <div className="flex items-start gap-2.5">
              <Info size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-blue-900">Cole aqui o texto do contrato que a Casas Eco já usa</p>
                <p className="text-xs text-blue-800/80 mt-1">
                  O sistema não inventa texto jurídico. Cole o texto de cada cláusula do seu modelo atual —
                  isso é feito <strong>uma única vez</strong>. Depois, todo contrato novo já nasce com essas
                  cláusulas prontas, e só o que é específico do cliente e da obra muda.
                </p>
                <button
                  onClick={() => setMostrarMarcadores((v) => !v)}
                  className="text-xs text-blue-700 underline mt-2 inline-flex items-center gap-1"
                >
                  Ver campos automáticos disponíveis
                  <ChevronDown size={12} className={`transition-transform ${mostrarMarcadores ? 'rotate-180' : ''}`} />
                </button>
                {mostrarMarcadores && (
                  <div className="mt-2 bg-white border border-blue-200 rounded-lg p-2.5 max-h-56 overflow-y-auto">
                    <p className="text-xs text-stone-500 mb-2">
                      Escreva estes códigos dentro do texto e o sistema troca pelo dado real na hora de gerar:
                    </p>
                    <div className="space-y-1">
                      {MARCADORES_DISPONIVEIS.map((m) => (
                        <div key={m.chave} className="flex justify-between gap-2 text-xs">
                          <code className="text-green-800 font-mono">{m.chave}</code>
                          <span className="text-stone-400 text-right">{m.descricao}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {rascunho.modeloContrato.clausulas.map((c, i) => (
            <div key={c.chave} className="eco-card p-4">
              <label className="eco-label">
                Cláusula {i + 1} — {c.titulo}
              </label>
              <textarea
                value={c.texto}
                onChange={(e) => setClausula(c.chave, e.target.value)}
                rows={4}
                placeholder="Cole aqui o texto desta cláusula do contrato da Casas Eco…"
                className="eco-input font-mono text-xs"
              />
            </div>
          ))}
        </div>
      )}

      {/* ---- ABA: memorial padrão ---- */}
      {aba === 'memorial' && (
        <div className="space-y-3">
          <div className="eco-card p-4">
            <label className="eco-label">Modelo de obra</label>
            <select
              value={modeloMemorialAtivo}
              onChange={(e) => setModeloMemorialAtivo(e.target.value)}
              className="eco-input"
            >
              {MODELOS_OBRA.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
            <p className="text-xs text-stone-500 mt-2">
              Cada modelo de obra tem o seu próprio memorial padrão. Ao criar um contrato desse modelo,
              o memorial já vem preenchido e você ajusta só o que for específico daquela obra.
            </p>
          </div>

          {CATEGORIAS_MEMORIAL.map((cat) => {
            const item = memorialAtual.find((m) => m.chave === cat.chave) || { texto: '' };
            return (
              <div key={cat.chave} className="eco-card p-4">
                <label className="eco-label">{cat.titulo}</label>
                <textarea
                  value={item.texto}
                  onChange={(e) => setMemorial(modeloMemorialAtivo, cat.chave, e.target.value)}
                  rows={3}
                  placeholder={`Descrição padrão de ${cat.titulo.toLowerCase()}…`}
                  className="eco-input text-xs"
                />
              </div>
            );
          })}
        </div>
      )}

      {/* barra de salvar */}
      {sujo && (
        <div className="fixed inset-x-0 bottom-16 sm:bottom-0 z-30 px-3 sm:px-0 sm:static">
          <div className="eco-card max-w-5xl mx-auto sm:mx-0 p-3 flex items-center justify-between gap-3 shadow-elevated sm:shadow-soft border-green-200">
            <p className="text-sm text-stone-600">Você tem alterações não salvas.</p>
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
