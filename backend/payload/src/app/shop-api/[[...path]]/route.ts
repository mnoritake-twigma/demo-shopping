import { createShop } from "../../../../../shared/shop.mjs";
import { repository } from "../../../repository";
export const dynamic = "force-dynamic";
const origins = (
  process.env.ALLOWED_ORIGINS ?? "http://localhost:8081,http://localhost:3002"
).split(",");
const shop = createShop(repository, {
  backend: "payload",
  cookieName: "pulse_payload",
  allowedOrigins: origins.join(","),
  secureCookies: process.env.SECURE_COOKIES === "true",
});
async function handler(request: Request) {
  const url = new URL(request.url);
  const headers = Object.fromEntries(request.headers);
  const responseHeaders: Record<string, string> = {
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  };
  if (headers.origin && origins.includes(headers.origin)) {
    responseHeaders["Access-Control-Allow-Origin"] = headers.origin;
    responseHeaders["Access-Control-Allow-Credentials"] = "true";
    responseHeaders.Vary = "Origin";
  }
  if (request.method === "OPTIONS")
    return new Response(null, {
      status: headers.origin && !origins.includes(headers.origin) ? 403 : 204,
      headers: {
        ...responseHeaders,
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  let body;
  try {
    if (["POST", "PUT"].includes(request.method)) {
      const raw = await request.text();
      if (raw.length > 16384)
        return Response.json(
          { errors: [{ message: "リクエストが大きすぎます。" }] },
          { status: 413 },
        );
      body = raw ? JSON.parse(raw) : {};
    }
  } catch {
    return Response.json(
      { errors: [{ message: "JSONが不正です。" }] },
      { status: 400 },
    );
  }
  const result = await shop.handle({
    method: request.method,
    url: url.pathname.replace(/^\/shop-api/, "") + url.search,
    headers,
    body,
    ip: headers["x-real-ip"] ?? "local",
  });
  if (result.cookie) responseHeaders["Set-Cookie"] = result.cookie;
  return Response.json(result.body, {
    status: result.status,
    headers: responseHeaders,
  });
}
export const GET = handler,
  POST = handler,
  PUT = handler,
  DELETE = handler,
  OPTIONS = handler;
