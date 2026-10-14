import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export interface StoredReviewRecord {
  id: string;
  productSlug?: string;
  productName?: string;
  customerName: string;
  city: string;
  rating: number;
  comment: string;
  imageUrl?: string | null;
  createdAt: string;
}

let memoryReviews: StoredReviewRecord[] | null = null;
const REVIEWS_FILE_PATH = ".data/customer-reviews.json";

async function readServerReviews(): Promise<StoredReviewRecord[]> {
  if (memoryReviews !== null) {
    return memoryReviews;
  }
  try {
    const fs = await import("node:fs/promises");
    const raw = await fs.readFile(REVIEWS_FILE_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      memoryReviews = parsed;
      return memoryReviews;
    }
  } catch {
    // File does not exist yet or fs not available
  }
  memoryReviews = [];
  return memoryReviews;
}

async function writeServerReviews(reviews: StoredReviewRecord[]): Promise<void> {
  memoryReviews = reviews;
  try {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    await fs.mkdir(path.dirname(REVIEWS_FILE_PATH), { recursive: true });
    await fs.writeFile(REVIEWS_FILE_PATH, JSON.stringify(reviews, null, 2), "utf-8");
  } catch {
    // Ignore fs write errors in read-only environments; memoryReviews still holds live state
  }
}

async function handleReviewsApi(request: Request): Promise<Response> {
  const headers = {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store, no-cache, must-revalidate",
  };

  if (request.method === "GET") {
    const reviews = await readServerReviews();
    return new Response(JSON.stringify({ reviews }), { status: 200, headers });
  }

  if (request.method === "POST") {
    try {
      const body = (await request.json()) as Partial<StoredReviewRecord>;
      const customerName = (body.customerName || "").trim();
      const city = (body.city || "").trim();
      const comment = (body.comment || "").trim();
      const rating = Math.min(5, Math.max(1, Number(body.rating) || 5));

      if (!customerName || !city || !comment) {
        return new Response(
          JSON.stringify({ error: "Name, city, and review comment are required." }),
          { status: 400, headers },
        );
      }

      const newReview: StoredReviewRecord = {
        id: body.id || `rev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        productSlug: body.productSlug || "all",
        productName: body.productName || "KoreanSkinCare",
        customerName,
        city,
        rating,
        comment,
        imageUrl: body.imageUrl || null,
        createdAt: body.createdAt || new Date().toISOString(),
      };

      const existing = await readServerReviews();
      const updated = [newReview, ...existing.filter((r) => r.id !== newReview.id)].slice(0, 200);
      await writeServerReviews(updated);

      return new Response(JSON.stringify({ ok: true, review: newReview, reviews: updated }), {
        status: 200,
        headers,
      });
    } catch (err) {
      return new Response(
        JSON.stringify({
          error: err instanceof Error ? err.message : "Invalid review payload",
        }),
        { status: 400, headers },
      );
    }
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const url = new URL(request.url);
      if (url.pathname === "/api/reviews") {
        return await handleReviewsApi(request);
      }

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
