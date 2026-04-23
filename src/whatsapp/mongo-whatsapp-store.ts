import { readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";
import { WhatsappSessionModel } from "../database/models/whatsapp-session.model";

/**
 * Store MongoDB compatível com RemoteAuth do whatsapp-web.js v1.34.6.
 *
 * Obs.: a API do RemoteAuth tem uma inconsistência: `save` recebe o caminho
 * completo como `session` (ex: "/app/.wwebjs_auth/RemoteAuth-proconbot-jacarei"),
 * enquanto `sessionExists`, `extract` e `delete` recebem apenas o nome
 * (ex: "RemoteAuth-proconbot-jacarei"). Esta classe normaliza os dois casos.
 *
 * A sessão comprimida (.zip, tipicamente 2–5 MB) é armazenada como Buffer
 * em um documento MongoDB — bem abaixo do limite de 16 MB por documento.
 */
export class MongoWhatsappStore {
  /**
   * Chamado pelo RemoteAuth depois de comprimir a sessão.
   * `options.session` = caminho completo sem extensão
   * (ex: "/app/.wwebjs_auth/RemoteAuth-proconbot-jacarei")
   */
  async save(options: { session: string }): Promise<void> {
    const zipPath = `${options.session}.zip`;
    const sessionName = basename(options.session); // normaliza para só o nome

    let data: Buffer;
    try {
      data = readFileSync(zipPath);
    } catch (err) {
      throw new Error(
        `[WhatsappStore] Não foi possível ler o zip da sessão em ${zipPath}: ${err}`
      );
    }

    await WhatsappSessionModel.findOneAndUpdate(
      { session: sessionName },
      { data, updatedAt: new Date() },
      { upsert: true, new: true }
    );

    console.log(
      `[WhatsappStore] Sessão "${sessionName}" salva no MongoDB (${(data.length / 1024).toFixed(1)} KB).`
    );
  }

  /**
   * Chamado na inicialização para verificar se a sessão existe.
   * `options.session` = apenas o nome (ex: "RemoteAuth-proconbot-jacarei")
   */
  async sessionExists(options: { session: string }): Promise<boolean> {
    const exists = await WhatsappSessionModel.exists({ session: options.session });
    return exists !== null;
  }

  /**
   * Chamado na inicialização para restaurar a sessão.
   * `options.session` = nome; `options.path` = caminho completo do zip de destino
   */
  async extract(options: { session: string; path: string }): Promise<void> {
    const doc = await WhatsappSessionModel.findOne({ session: options.session });

    if (!doc) {
      throw new Error(
        `[WhatsappStore] Sessão "${options.session}" não encontrada no MongoDB.`
      );
    }

    writeFileSync(options.path, doc.data);
    console.log(
      `[WhatsappStore] Sessão "${options.session}" restaurada do MongoDB (${(doc.data.length / 1024).toFixed(1)} KB).`
    );
  }

  /**
   * Chamado no logout para remover a sessão.
   * `options.session` = apenas o nome
   */
  async delete(options: { session: string }): Promise<void> {
    await WhatsappSessionModel.deleteOne({ session: options.session });
    console.log(`[WhatsappStore] Sessão "${options.session}" removida do MongoDB.`);
  }
}
