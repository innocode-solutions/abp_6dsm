export interface MongoEnv {
  uri: string | undefined;
  dbName: string | undefined;
}

export function getMongoEnv(): MongoEnv {
  const uri = process.env.MONGODB_URI?.trim() || undefined;
  const dbName = process.env.MONGODB_DB_NAME?.trim() || undefined;

  return { uri, dbName };
}
