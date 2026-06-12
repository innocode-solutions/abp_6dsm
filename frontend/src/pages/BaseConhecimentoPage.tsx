import { useState, useEffect, useRef } from "react";
import { BookOpen, FileText, Plus } from "lucide-react";
import { api } from "../services/api";
import { useHeader } from "../context/HeaderContext";
import { useAuth } from "../hooks/useAuth";

interface Artigo {
  id: string | number;
  categoria: string;
  titulo: string;
  atualizadoEm: string;
  trechos: number;
}

export function BaseConhecimentoPage() {
  const { token, user } = useAuth();
  const isAdmin = user?.perfil === "admin";
  const [artigos, setArtigos] = useState<Artigo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { refreshTrigger, dataSelecionada } = useHeader();
  useEffect(() => {
    carregarDados();
  }, [refreshTrigger]);

  useEffect(() => {
    console.log("A data mudou para:", dataSelecionada);
  }, [dataSelecionada]);

  const carregarDados = async () => {
    if (!token) return;

    try {
      setIsLoading(true);
      const response = await api.getBaseConhecimento(token);

      setArtigos(response.dados || []);
    } catch (error) {
      console.error("Erro ao buscar dados da base de conhecimento:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file || !token || !isAdmin) return;

    try {
      setIsUploading(true);

      await api.uploadBaseConhecimento(token, file);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      await carregarDados();
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      alert("Ocorreu um erro ao enviar o arquivo.");
    } finally {
      setIsUploading(false);
    }
  };

  // Função para deletar o arquivo
  const handleDelete = async (filename: string) => {
    if (!token || !isAdmin) return;

    // Confirmação simples para evitar exclusão acidental
    if (
      !window.confirm(`Tem certeza que deseja excluir o arquivo "${filename}"?`)
    ) {
      return;
    }

    try {
      await api.deleteBaseConhecimento(token, filename);

      // Recarrega a tela para o card sumir
      await carregarDados();
    } catch (error) {
      console.error("Erro ao excluir:", error);
      alert("Ocorreu um erro ao excluir o arquivo.");
    }
  };

  const handleOpenContent = async (filename: string) => {
    if (!token) return;

    try {
      const blob = await api.downloadBaseConhecimento(token, filename);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      console.error("Erro ao abrir conteudo:", error);
      alert("Ocorreu um erro ao abrir o arquivo.");
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-4 pb-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-[#0D1B4B]">
            Artigos e trechos
          </h2>
          <p className="text-sm text-slate-500">
            Conteúdo indexado pelo sistema.
          </p>
        </div>

        {/* Input de arquivo invisível (suporta pdf, docs, md, etc) */}
        {isAdmin && (
          <>
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept=".pdf,.doc,.docx,.md,.txt,.odt"
          onChange={handleFileChange}
        />

        <button
          type="button"
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-600 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
        >
          <Plus className="size-4" />
          {isUploading ? "Enviando..." : "Novo artigo"}
        </button>
          </>
        )}
      </div>

      {isLoading && !isUploading ? (
        <div className="flex h-32 items-center justify-center">
          <p className="text-sm font-medium text-slate-500">
            Carregando base de conhecimento...
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
          {artigos.map((k) => (
            <article
              key={k.id}
              className="flex flex-col rounded-xl border border-slate-100 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-50 text-[#2563EB]">
                  <BookOpen className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {k.categoria}
                  </p>
                  <h3 className="mt-1 text-sm font-semibold text-[#0D1B4B]">
                    {k.titulo}
                  </h3>
                  <p className="mt-2 text-xs text-slate-500">
                    Atualizado em {k.atualizadoEm} · {k.trechos} trechos
                    indexados
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                {/* Botão Ver Conteúdo - Abre em nova aba */}
                <button
                  type="button"
                  onClick={() => handleOpenContent(String(k.id))}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <FileText className="size-3.5" />
                  Ver conteúdo
                </button>

                {/* Botão Editar foi REMOVIDO */}

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleDelete(String(k.id))}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors ml-auto"
                  >
                    Excluir
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
