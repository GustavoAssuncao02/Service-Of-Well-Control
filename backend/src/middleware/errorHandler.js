import { env } from '../config/env.js';

export function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  if (error?.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      message: `Arquivo muito grande. O limite atual e de ${env.googleDriveMaxUploadMb} MB.`
    });
  }

  if (error?.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      message: 'Selecione no maximo 20 documentos por envio.'
    });
  }

  if (error?.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      message: 'Registro duplicado.',
      detail: error.message
    });
  }

  if (error?.code === 'ER_NO_REFERENCED_ROW_2' || error?.code === 'ER_ROW_IS_REFERENCED_2') {
    return res.status(409).json({
      message: 'Relacionamento inválido ou registro em uso.',
      detail: error.message
    });
  }

  console.error(error);
  return res.status(error.status || 500).json({
    message: error.message || 'Erro interno do servidor.'
  });
}
