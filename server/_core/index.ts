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
      console.log("[tRPC Extremo] Objeto bruto recebido no input:", JSON.stringify(input));

      // Mapeamento profundo para achar as credenciais de qualquer jeito
      const email = (
        input?.email || 
        input?.json?.email || 
        input?.[0]?.email || 
        input?.[0]?.json?.email || 
        ""
      ).toLowerCase().trim();

      const password = String(
        input?.password || 
        input?.json?.password || 
        input?.[0]?.password || 
        input?.[0]?.json?.password || 
        ""
      ).trim();

      console.log(`[tRPC Extremo] Credenciais extraídas -> Email: "${email}" | Senha: "${password}"`);

      // Validação com os dados chumbados para garantir o isolamento
      if (email === "frotas@rodotransfer.com.br" && password === "Rodo1704") {
        console.log(`[tRPC Extremo] ✅ LOGIN COM DADOS FIXOS LIBERADO!`);
        return { 
          id: 1, 
          name: "RODOTRANSFER LOCAL", 
          email: "frotas@rodotransfer.com.br", 
          message: "Sucesso" 
        };
      }

      console.error(`[tRPC Extremo] ❌ Acesso negado para: "${email}"`);
      throw new TRPCError({ code: 'UNAUTHORIZED', message: "Usuário ou senha incorretos." });
    }),
});

export type AppRouter = typeof appRouter;

// Roteador tradicional tRPC
app.use("/api/trpc", trpcExpress.createExpressMiddleware({ router: appRouter }));

// --- COMPATIBILIDADE EXTRA HTTP CONTRA OBJETOS EMBUTIDOS ---
app.post("/api/trpc/auth.login", async (req, res) => {
  console.log("[HTTP Fallback] Corpo bruto recebido no body:", JSON.stringify(req.body));
  
  const body = req.body || {};
  const email = (body.email || body.json?.email || "").toLowerCase().trim();
  const password = String(body.password || body.json?.password || "").trim();

  if (email === "frotas@rodotransfer.com.br" && password === "Rodo1704") {
    return res.status(200).json({ 
      result: { data: { id: 1, name: "RODOTRANSFER LOCAL", email: email } } 
    });
  }

  return res.status(401).json({ error: { message: "Usuário ou senha incorretos." } });
});

app.get("/api/trpc/auth.me", (req, res) => {
  res.status(200).json({ result: { data: null } });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor com varredura profunda rodando na porta ${PORT}`);
});