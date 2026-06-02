import type express from "express";
import type { NextFunction, Request, Response } from "express";
import swaggerUi from "swagger-ui-express";

import { openApiDocument } from "./openapi.js";

const SWAGGER_CSP =
  "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'";

export function setupSwagger(app: express.Application): void {
  app.get("/api-docs.json", (_req, res) => {
    res.status(200).json(openApiDocument);
  });

  app.use(
    "/api-docs",
    (_req: Request, res: Response, next: NextFunction) => {
      res.setHeader("Content-Security-Policy", SWAGGER_CSP);
      next();
    },
    swaggerUi.serve,
    swaggerUi.setup(openApiDocument, {
      explorer: true,
      swaggerOptions: {
        persistAuthorization: true,
      },
    }),
  );
}
