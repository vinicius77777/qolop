import type { VercelRequest, VercelResponse } from "@vercel/node";
import { app, initializeServerServices } from "../src/server";

let initialized = false;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!initialized) {
    initialized = true;
    await initializeServerServices();
  }

  return app(req, res);
}
