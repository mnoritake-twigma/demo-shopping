import "reflect-metadata";
import { All, Controller, Module, Req, Res } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { Request, Response } from "express";
import { createShop } from "../../shared/shop.mjs";
import { repository, db } from "./repository.js";
const origins = (process.env.ALLOWED_ORIGINS ?? "http://localhost:8080").split(
  ",",
);
const shop = createShop(repository, {
  backend: "nestjs-prisma",
  cookieName: "pulse_native",
  allowedOrigins: origins.join(","),
  secureCookies: process.env.SECURE_COOKIES === "true",
});
@Controller("api")
class ShopController {
  @All("{*path}") async handle(@Req() req: Request, @Res() res: Response) {
    const result = await shop.handle({
      method: req.method,
      url: req.originalUrl.replace(/^\/api/, ""),
      headers: req.headers,
      body: req.body,
      ip: req.ip,
    });
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (result.cookie) res.setHeader("Set-Cookie", result.cookie);
    res.status(result.status).json(result.body);
  }
}
@Module({ controllers: [ShopController] })
class AppModule {}
const app = await NestFactory.create(AppModule, {
  cors: { origin: origins, credentials: true },
});
app.enableShutdownHooks();
await app.listen(Number(process.env.PORT ?? 3001), "0.0.0.0");
for (const signal of ["SIGTERM", "SIGINT"] as const)
  process.once(signal, async () => {
    await db.$disconnect();
    await app.close();
    process.exit(0);
  });
