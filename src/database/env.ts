export interface MongoEnv {
  uri: string | undefined;
  dbName: string | undefined;
}

function readFirstDefinedEnv(names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name]?.trim();

    if (value) {
      return value;
    }
  }

  return undefined;
}

export function getMongoEnv(): MongoEnv {
  const uri = readFirstDefinedEnv([
    "MONGODB_URI",
    "MONGO_URL",
    "MONGO_URI",
    "Mongo_URL"
  ]);
  const dbName = process.env.MONGODB_DB_NAME?.trim() || undefined;

  return { uri, dbName };
}
