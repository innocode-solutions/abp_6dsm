import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WhatsappSessionModel } from "../../src/database/models/whatsapp-session.model";
import { MongoWhatsappStore } from "../../src/whatsapp/mongo-whatsapp-store";

vi.mock("../../src/database/models/whatsapp-session.model", () => ({
  WhatsappSessionModel: {
    findOneAndUpdate: vi.fn(),
    exists: vi.fn(),
    findOne: vi.fn(),
    deleteOne: vi.fn()
  }
}));

describe("MongoWhatsappStore", () => {
  let tempDir: string;
  const previousAuthPath = process.env.WHATSAPP_AUTH_PATH;

  beforeEach(() => {
    vi.clearAllMocks();
    tempDir = mkdtempSync(join(tmpdir(), "wwebjs-auth-"));
    process.env.WHATSAPP_AUTH_PATH = tempDir;
  });

  afterEach(() => {
    process.env.WHATSAPP_AUTH_PATH = previousAuthPath;
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("deve salvar sessao quando o RemoteAuth envia apenas o nome", async () => {
    const data = Buffer.from("zip-da-sessao");
    writeFileSync(join(tempDir, "RemoteAuth-proconbot-jacarei-v2.zip"), data);

    await new MongoWhatsappStore().save({
      session: "RemoteAuth-proconbot-jacarei-v2"
    });

    expect(WhatsappSessionModel.findOneAndUpdate).toHaveBeenCalledWith(
      { session: "RemoteAuth-proconbot-jacarei-v2" },
      { data, updatedAt: expect.any(Date) },
      { upsert: true, new: true }
    );
  });
});
