import cors from "cors";
import express from "express";
import helmet from "helmet";

import { setupSwagger } from "./docs/swagger.js";
import { errorHandler } from "./middleware/errorHandler.middleware.js";
import routes from "./routes/index.js";

export function createApp(): express.Application {
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  setupSwagger(app);
  app.use(routes);
  app.use(errorHandler);
  return app;
}
