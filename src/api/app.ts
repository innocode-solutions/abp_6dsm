import cors from "cors";
import express from "express";
import helmet from "helmet";

import { errorHandler } from "./middleware/errorHandler.middleware.js";
import routes from "./routes/index.js";

export function createApp(): express.Application {
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(routes);
  app.use(errorHandler);
  return app;
}
