#!/bin/bash
# Entrypoint do Ollama para Railway
# Inicia o servidor e baixa o modelo de embeddings automaticamente

set -e

echo "🚀 Iniciando Ollama..."
ollama serve &
OLLAMA_PID=$!

echo "⏳ Aguardando Ollama ficar pronto..."
until curl -sf http://localhost:11434/api/version > /dev/null 2>&1; do
  sleep 2
done

echo "✅ Ollama pronto!"

# Verifica se o modelo já está baixado (evita re-download a cada restart)
if ! ollama list | grep -q "nomic-embed-text"; then
  echo "📥 Baixando modelo nomic-embed-text (~274MB)..."
  ollama pull nomic-embed-text
  echo "✅ Modelo baixado com sucesso!"
else
  echo "✅ Modelo nomic-embed-text já disponível."
fi

echo "🟢 Ollama está pronto para uso."

# Mantém o processo principal vivo
wait $OLLAMA_PID
