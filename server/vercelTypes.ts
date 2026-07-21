import type { IncomingMessage, ServerResponse } from "node:http";

export type VercelRequest = IncomingMessage & {
  body?: unknown;
};

export type VercelResponse = ServerResponse & {
  status(code: number): VercelResponse;
  json(value: unknown): VercelResponse;
};
