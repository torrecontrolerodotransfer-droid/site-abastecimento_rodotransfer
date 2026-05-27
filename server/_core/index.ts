import express from "express";
import path from "path"; 
import { fileURLToPath } from "url"; 
import { initTRPC, TRPCError } from "@trpc/server";
import * as trpcExpress from "@trpc/server/adapters/express";
import { z } from "zod";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicPath = path.resolve(process.cwd(), "dist/public");
app.use(express.static(publicPath));

// --- ROTEADOR TRPC NATIVO ---
const t = initTRPC.create();
const appRouter = t.router({
  'auth.login': t.procedure
    .input(z.any())
    .mutation(async ({ input }) => {
      const email = (input?.email || input?.json?.email || "").toLowerCase().trim();
      const password = (input?.password || input?.json?.password || "").trim();

      console.log(`[tRPC] Tentativa de login direto para: ${email}`);

      // --- DADOS FIXOS DIRETAMENTE NO CÓDIGO ---
      if (email === "frotas@rodotransfer.com.br" && password === "Rodo1704") {
        console.log(`[tRPC] ✅ LOGIN FIXO ACEITO COM SUCESSO!`);
        return { 
          id: 1, 
          name: "RODOTRANSFER LOCAL", 
          email: "frotas@rodotransfer.com.br", 
          message: "Sucesso" 
        };
      }

      console.error(`[tRPC] ❌ Login ou senha incorretos informados: ${email}`);
      throw new TRPCError({ code: 'UNAUTHORIZED', message: "Usuário ou senha incorretos." });
    }),
});

export type AppRouter = typeof appRouter;

// Middleware do tRPC
app.use("/api/trpc", trpcExpress.createExpressMiddleware({ router: appRouter }));

// --- COMPATIBILIDADE EXTRA HTTP DIRECT ---
app.post("/api/trpc/auth.login", async (req, res) => {
  const body = req.body?.json || req.body || {};
  const email = (body.email || "").toLowerCase().trim();
  const password = (body.password || "").trim();

  console.log(`[HTTP Fallback] Tentativa de login direto para: ${email}`);

  if (email === "frotas@rodotransfer.com.br" && password === "Rodo1704") {
    return res.status(200).json({ 
      result: { data: { id: 1, name: "RODOTRANSFER LOCAL", email: email } } 
    });
  }

  return res.status(401).json({ error: { message: "Usuário ou senha incorretos." } });
});

// Limpa o erro 404 do auth.me
app.get("/api/trpc/auth.me", (req, res) => {
  res.status(200).json({ result: { data: null } });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor com credenciais fixas rodando na porta ${PORT}`);
});