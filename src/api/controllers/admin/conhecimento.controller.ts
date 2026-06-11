import fs from 'fs/promises';
import path from 'path';
import { Request, Response } from 'express';

export async function getBaseConhecimento(req: Request, res: Response) {
  try {
    const knowledgePath = path.resolve(process.cwd(), 'docs/knowledge');

    const files = await fs.readdir(knowledgePath);
    const artigos = [];

    for (const file of files) {
      const filePath = path.join(knowledgePath, file);
      const stats = await fs.stat(filePath);

      if (stats.isFile()) {
        let categoria = 'Documento';
        if (file.endsWith('.pdf')) categoria = 'Legislação';
        if (file.endsWith('.odt') || file.endsWith('.md') || file.endsWith('.docx')) categoria = 'Base de Conhecimento';

        const tituloFormatado = file
          .replace(/\.[^/.]+$/, "") 
          .replace(/[-_]/g, ' ');   

        const atualizadoEm = stats.mtime.toLocaleDateString('pt-BR');
        const trechosMockados = Math.floor(Math.random() * 100) + 10;

        artigos.push({
          id: file, 
          categoria,
          titulo: tituloFormatado.charAt(0).toUpperCase() + tituloFormatado.slice(1), 
          atualizadoEm,
          trechos: trechosMockados
        });
      }
    }

    return res.status(200).json({ dados: artigos });

  } catch (error) {
    console.error("Erro ao ler diretório de conhecimento:", error);
    return res.status(500).json({ 
      erro: { mensagem: "Erro interno no servidor ao carregar a base de documentos." } 
    });
  }
}

// Lida com o retorno do upload
export async function uploadBaseConhecimento(req: Request, res: Response) {
  if (!req.file) {
    return res.status(400).json({ erro: { mensagem: "Nenhum arquivo recebido." } });
  }

  return res.status(201).json({ 
    mensagem: "Documento salvo com sucesso na base de conhecimento!", 
    arquivo: req.file.originalname 
  });
}

export async function deleteBaseConhecimento(req: Request<{ filename: string }>, res: Response) {
  try {
    const { filename } = req.params;
    
    if (!filename) {
      return res.status(400).json({ erro: { mensagem: "Nome do arquivo não fornecido." } });
    }

    const filePath = path.resolve(process.cwd(), 'docs/knowledge', filename);

    // Verifica se o arquivo existe antes de tentar deletar
    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(404).json({ erro: { mensagem: "Arquivo não encontrado." } });
    }

    // Apaga o arquivo fisicamente da pasta
    await fs.unlink(filePath);

    return res.status(200).json({ mensagem: "Documento excluído com sucesso!" });

  } catch (error) {
    console.error("Erro ao excluir arquivo de conhecimento:", error);
    return res.status(500).json({ 
      erro: { mensagem: "Erro interno no servidor ao excluir o documento." } 
    });
  }
}

export async function downloadBaseConhecimento(req: Request<{ filename: string }>, res: Response) {
  try {
    const { filename } = req.params;
    const filePath = path.resolve(process.cwd(), 'docs/knowledge', filename);

    // Verifica se o arquivo existe
    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(404).json({ erro: { mensagem: "Arquivo não encontrado." } });
    }

    // Envia o arquivo diretamente para o navegador
    return res.sendFile(filePath);

  } catch (error) {
    console.error("Erro ao acessar arquivo de conhecimento:", error);
    return res.status(500).json({ 
      erro: { mensagem: "Erro interno no servidor ao acessar o documento." } 
    });
  }
}