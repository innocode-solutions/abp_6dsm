export interface KnowledgeEntry {
  id: string;
  title: string;
  body: string;
}

export interface KnowledgeHit {
  entry: KnowledgeEntry;
  score: number;
}
