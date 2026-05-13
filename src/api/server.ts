import { createApp } from "./app";
import { connectDB } from "./config/database";
import { env } from "./config/env";

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
