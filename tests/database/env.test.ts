import { afterEach, describe, expect, it } from "vitest";
import { getMongoEnv } from "../../src/database/env";

const originalEnv = { ...process.env };

describe("getMongoEnv", () => {
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("deve priorizar MONGODB_URI quando definida", () => {
    process.env.MONGODB_URI = "mongodb://primary";
    process.env.MONGO_URL = "mongodb://secondary";
    process.env.MONGODB_DB_NAME = "proconbot";

    expect(getMongoEnv()).toEqual({
      uri: "mongodb://primary",
      dbName: "proconbot"
    });
  });

  it("deve aceitar MONGO_URL como fallback compatível com Railway", () => {
    delete process.env.MONGODB_URI;
    process.env.MONGO_URL = "mongodb://railway-internal";

    expect(getMongoEnv()).toEqual({
      uri: "mongodb://railway-internal",
      dbName: undefined
    });
  });

  it("deve aceitar Mongo_URL quando esse alias estiver disponível", () => {
    delete process.env.MONGODB_URI;
    delete process.env.MONGO_URL;
    process.env.Mongo_URL = "mongodb://mixed-case";

    expect(getMongoEnv()).toEqual({
      uri: "mongodb://mixed-case",
      dbName: undefined
    });
  });
});
