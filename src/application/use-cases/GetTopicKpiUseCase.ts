import { ConversationExtractionLogModel } from "../../database/models/conversation-extraction-log.model";
import { getFlowLabel } from "../../api/utils/flowLabelHelper";

export interface TopicKpiItem {
  flowId: string;
  name: string;
  value: number;
}

interface TopicAggregationResult {
  _id: string;
  count: number;
}

export class GetTopicKpiUseCase {
  async execute(limit = 10): Promise<TopicKpiItem[]> {
    const rows = (await ConversationExtractionLogModel.aggregate([
      { $match: { flowId: { $exists: true, $nin: [null, ""] } } },
      { $group: { _id: { sessionId: "$sessionId", flowId: "$flowId" } } },
      { $group: { _id: "$_id.flowId", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit }
    ])) as TopicAggregationResult[];

    return rows.map((row) => ({
      flowId: row._id,
      name: getFlowLabel(row._id),
      value: row.count
    }));
  }
}
