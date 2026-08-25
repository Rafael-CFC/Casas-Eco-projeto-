import React, { useState } from 'react';
import { ArrowLeft, Camera, FileImage } from 'lucide-react';
import { parsePrecoBR, todayISO } from '../domain';
import { CATEGORIAS_BOLETO } from './categoriasBoleto';

export default function FormBoleto({
  obras,
  fornecedores,
  boletoInicial,
  fotoPreviewUrl,
  onTrocarFoto,
  onSalvar,
  onCancelar,
}) {
  const editando = !!boletoInicial;
  const [beneficiario, setBeneficiario] = useState(boletoInicial?.beneficiario || '');
  const [cnpjCpfBeneficiario, setCnpjCpfBeneficiario] = useState(boletoInicial?.cnpjCpfBeneficiario || '');
  const [bancoEmissor, setBancoEmissor] = useState(boletoInicial?.bancoEmissor || '');
  const [numeroDocumento, setNumeroDocumento] = useState(boletoInicial?.numeroDocumento || '');
  const [nossoNumero, setNossoNumero] = useState(boletoInicial?.nossoNumero || '');
  const [linhaDigitavel, setLinhaDigitavel] = useState(boletoInicial?.linhaDigitavel || '');
  const [codigoBarras, setCodigoBarras] = useState(boletoInicial?.codigoBarras || '');
  const [valorTexto, setValorTexto] = useState(boletoInicial ? String(boletoInicial.valor).replace('.', ',') : '');
  const [emissao, setEmissao] = useState(boletoInicial?.emissao || '');
  const [vencimento, setVencimento] = useState(boletoInicial?.vencimento || todayISO());
  const [categoria, setCategoria] = useState(boletoInicial?.categoria || 'OUTROS');
  const [descricao, setDescricao] = useState(boletoInicial?.descricao || '');
  const [obraId, setObraId] = useState(boletoInicial?.obraId || '');
  const [fornecedorNome, setFornecedorNome] = useState(boletoInicial?.fornecedorNome || '');
  const [erroValidacao, setErroValidacao] = useState('');

  function aoSalvar(e) {
    e.preventDefault();
    const valor = parsePrecoBR(valorTexto);
    if (!beneficiario.trim()) { setErroValidacao('Informe o beneficiário do boleto.'); return; }
    if (!vencimento) { setErroValidacao('Informe a data de vencimento.'); return; }
    if (isNaN(valor) || valor <= 0) { setErroValidacao('Informe um valor válido.'); return; }
    setErroValidacao('');
    onSalvar({
      beneficiario, cnpjCpfBeneficiario, bancoEmissor, numeroDocumento, nossoNumero,
      linhaDigitavel, codigoBarras, valor, emissao: emissao || null, vencimento,
      categoria, descricao, obraId: obraId || null, fornecedorNome,
    });
  }

  return (
    <form onSubmit={aoSalvar} className="space-y-4">
      <button type="button" onClick={onCancelar} className="text-sm text-stone-500 hover:text-stone-800 flex items-center gap-1 transition-colors">
        <ArrowLeft size={14} /> Voltar para a lista
      </button>

      <div className="eco-card p-4">
        <p className="text-sm font-semibold text-stone-700 mb-3">Foto do boleto</p>
        {fotoPreviewUrl ? (
          <div className="flex items-center gap-3">
            <img src={fotoPreviewUrl} alt="Foto do boleto" className="w-20 h-20 object-cover rounded-lg border border-stone-200 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-stone-500 mb-1.5">Confira os dados abaixo e ajuste o que precisar antes de salvar.</p>
              <button type="button" onClick={onTrocarFoto} className="eco-btn-secondary eco-btn-xs">
                <Camera size={12} /> Trocar foto
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={onTrocarFoto} className="eco-btn-secondary w-full justify-center py-4">
            <FileImage size={16} /> Anexar foto do boleto
          </button>
        )}
      </div>

      {erroValidacao && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg animate-fade-in-up">
          {erroValidacao}
        </div>
      )}

      <div className="eco-card p-4 space-y-3">
        <p className="text-sm font-semibold text-stone-700">Dados do boleto</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="eco-label">Beneficiário *</label>
            <input value={beneficiario} onChange={(e) => setBeneficiario(e.target.value)} className="eco-input" placeholder="Nome da empresa/fornecedor" required />
          </div>
          <div>
            <label className="eco-label">CNPJ/CPF do beneficiário</label>
            <input value={cnpjCpfBeneficiario} onChange={(e) => setCnpjCpfBeneficiario(e.target.value)} className="eco-input" placeholder="00.000.000/0001-00" />
          </div>
          <div>
            <label className="eco-label">Banco emissor</label>
            <input value={bancoEmissor} onChange={(e) => setBancoEmissor(e.target.value)} className="eco-input" placeholder="Ex.: Banco do Brasil" />
          </div>
          <div>
            <label className="eco-label">Valor *</label>
            <input value={valorTexto} onChange={(e) => setValorTexto(e.target.value)} inputMode="decimal" className="eco-input" placeholder="0,00" required />
          </div>
          <div>
            <label className="eco-label">Vencimento *</label>
            <input type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} className="eco-input" required />
          </div>
          <div>
            <label className="eco-label">Emissão</label>
            <input type="date" value={emissao} onChange={(e) => setEmissao(e.target.value)} className="eco-input" />
          </div>
          <div>
            <label className="eco-label">Número do documento</label>
            <input value={numeroDocumento} onChange={(e) => setNumeroDocumento(e.target.value)} className="eco-input" />
          </div>
          <div>
            <label className="eco-label">Nosso número</label>
            <input value={nossoNumero} onChange={(e) => setNossoNumero(e.target.value)} className="eco-input" />
          </div>
          <div className="sm:col-span-2">
            <label className="eco-label">Linha digitável</label>
            <input value={linhaDigitavel} onChange={(e) => setLinhaDigitavel(e.target.value)} className="eco-input" placeholder="00000.00000 00000.000000 00000.000000 0 00000000000000" />
          </div>
          <div className="sm:col-span-2">
            <label className="eco-label">Código de barras</label>
            <input value={codigoBarras} onChange={(e) => setCodigoBarras(e.target.value)} className="eco-input" />
          </div>
        </div>
      </div>

      <div className="eco-card p-4 space-y-3">
        <p className="text-sm font-semibold text-stone-700">Classificação</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="eco-label">Categoria</label>
            <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="eco-input">
              {CATEGORIAS_BOLETO.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="eco-label">Obra</label>
            <select value={obraId} onChange={(e) => setObraId(e.target.value)} className="eco-input">
              <option value="">Despesa geral (sem obra)</option>
              {obras.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="eco-label">Fornecedor</label>
            <input
              value={fornecedorNome}
              onChange={(e) => setFornecedorNome(e.target.value)}
              className="eco-input"
              list="lista-fornecedores-boleto"
              placeholder="Opcional, se diferente do beneficiário"
            />
            <datalist id="lista-fornecedores-boleto">
              {fornecedores.map((f) => <option key={f.id} value={f.nome} />)}
            </datalist>
          </div>
          <div className="sm:col-span-2">
            <label className="eco-label">Descrição/referência</label>
            <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} className="eco-input" rows={2} placeholder="Ex.: compra de cimento, parcela 2/3…" />
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={onCancelar} className="eco-btn-secondary flex-1">Cancelar</button>
        <button type="submit" className="eco-btn-primary flex-1">{editando ? 'Salvar alterações' : 'Confirmar e salvar'}</button>
      </div>
    </form>
  );
}
