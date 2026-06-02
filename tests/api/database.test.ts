import { beforeEach, describe, expect, it, vi } from "vitest";

const connectMock = vi.fn().mockResolvedValue(undefined);

vi.mock("mongoose", () => ({
  default: {
    connect: connectMock,
  },
}));

vi.mock("../../src/api/config/env", () => ({
  env: {
    PORT: 3000,
    MONGODB_URI: "mongodb://127.0.0.1:27017/api_tests",
    JWT_SECRET: "secret",
    CHATBOT_API_KEY: "key",
  },
}));

describe("src/api/config/database", () => {
  beforeEach(async () => {
    connectMock.mockClear();
    vi.resetModules();
  });

  it("connectDB chama mongoose.connect com a URI e timeout de seleção", async () => {
    const { connectDB } = await import("../../src/api/config/database.js");
    await connectDB();
    expect(connectMock).toHaveBeenCalledTimes(1);
    expect(connectMock).toHaveBeenCalledWith("mongodb://127.0.0.1:27017/api_tests", {
      serverSelectionTimeoutMS: 5000,
    });
  });
});
