// Envio/consulta da foto original do boleto no Supabase Storage (bucket
// privado "boletos" — ver schema-boletos.sql). A imagem NUNCA fica salva
// dentro do registro do boleto (que vive em app_data como os outros dados)
// — só o caminho do arquivo é guardado; a foto em si fica no Storage e é
// consultada sob demanda com uma URL assinada de curta duração.
import { supabase } from '../supabaseClient';

// Reduz o tamanho da imagem antes de enviar (celular tira fotos grandes
// demais pra guardar sem necessidade). Pura API do navegador, sem
// biblioteca extra: desenha a imagem redimensionada num <canvas> e reexporta
// como JPEG.
export async function comprimirImagem(arquivo, { maxDimensao = 1600, qualidade = 0.75 } = {}) {
  const bitmap = await createImageBitmap(arquivo);
  const escala = Math.min(1, maxDimensao / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * escala));
  canvas.height = Math.max(1, Math.round(bitmap.height * escala));
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close && bitmap.close();
  return await new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Falha ao comprimir a imagem'))), 'image/jpeg', qualidade);
  });
}

export async function enviarFotoBoleto(blob, boletoId) {
  const path = `${boletoId}/${Date.now()}.jpg`;
  const { error } = await supabase.storage.from('boletos').upload(path, blob, {
    contentType: 'image/jpeg',
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function visualizarBoletoFoto(fotoPath) {
  const { data, error } = await supabase.storage.from('boletos').createSignedUrl(fotoPath, 300);
  if (error) throw error;
  return data.signedUrl;
}

export async function removerFotoBoleto(fotoPath) {
  if (!fotoPath) return;
  await supabase.storage.from('boletos').remove([fotoPath]);
}
