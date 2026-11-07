/** Hosted mode's attachment uploads (teeez fork): src/server/uploads.ts. */
import { uploadsResponse } from "@/src/server";

export const dynamic = "force-dynamic";
export const POST = (request: Request) => uploadsResponse(request);
