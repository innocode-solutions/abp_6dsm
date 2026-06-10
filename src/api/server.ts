import { createApp } from "./app.js";
import { connectDB } from "./config/database.js";
import { env } from "./config/env.js";

async function bootstrap(): Promise<void> {
  try {
    await connectDB();
    console.log("✅ MongoDB conectado");

    const app = createApp();
    app.listen(env.PORT, () => {
      console.log(`🚀 Servidor rodando na porta ${env.PORT}`);
    });
  } catch (error) {
    console.error("Erro ao conectar ao MongoDB:", error);
    process.exit(1);
  }
}

void bootstrap();
