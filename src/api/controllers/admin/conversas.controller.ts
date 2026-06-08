import type { NextFunction, Request, Response } from "express";
import { ChatMessageModel } from "../../../database/models/chat-message.model.js";
import { success } from "../../utils/responseHelper.js";

/**
 * Lists all unique conversation threads, grouped by user (sender "from")
 * and sorted by the latest message timestamp.
 */
export async function listarConversas(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const list = await ChatMessageModel.aggregate([
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$from",
          ultimaMensagem: { $first: "$body" },
          dataHora: { $first: "$createdAt" },
          direction: { $first: "$direction" },
        },
      },
      { $sort: { dataHora: -1 } },
    ]);

    const formatadas = list.map((item) => {
      const fromStr = String(item._id);
      return {
        id: fromStr,
        nome: `Usuário ${fromStr.replace("@lid", "").replace("@c.us", "")}`,
        iniciais: fromStr.substring(0, 2).toUpperCase(),
        identificador: fromStr,
        ultimaMensagem: item.ultimaMensagem || "",
        dataHoraLabel: new Date(item.dataHora).toLocaleString("pt-BR"),
        status: item.direction === "in" ? "Ativo" : "Pendente",
        assunto: "Conversa Chatbot",
      };
    });

    res.status(200).json(success(formatadas));
  } catch (error) {
    next(error);
  }
}

/**
 * Retrieves the full chronological message log for a specific user.
 */
export async function obterHistoricoConversa(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { userId } = req.params;
    const messages = await ChatMessageModel.find({ from: userId })
      .sort({ createdAt: 1 })
      .lean();

    res.status(200).json(success(messages));
  } catch (error) {
    next(error);
  }
}
