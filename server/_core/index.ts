import express from "express";
import path from "path"; 
import { fileURLToPath } from "url"; 
import { initTRPC, TRPCError } from "@trpc/server";
import * as trpcExpress from "@trpc/server/adapters/express";
import { z } from "zod";
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- CONFIGURAÇÃO PARA SERVIR O FRONTEND COMPILADO ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicPath = path.resolve(process.cwd(), "dist/public");
app.use(express.static(publicPath));

// --- CONEXÃO COM TRATAMENTO DE CHAVE ---
async function getSheetDoc() {
  const email = (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "").trim();
  const sheetId = (process.env.GOOGLE_SHEET_ID || "").trim();
  let rawKey = process.env.GOOGLE_PRIVATE_KEY || "";

  // Remove aspas extras que o Render às vezes adiciona nas pontas da variável
  if (rawKey.startsWith('"') && rawKey.endsWith('"')) {
    rawKey = rawKey.slice(1, -1);
  }

  // Substitui as quebras de linha literais por quebras reais do sistema
  const privateKey = rawKey.replace(/\\n/g, '\n').trim();

  if (!privateKey || !email || !sheetId) {
    console.error("❌ ERRO: Faltando variáveis de ambiente essenciais do Google.");
  }

  const serviceAccountAuth = new JWT({
    email: email,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const doc = new GoogleSpreadsheet(sheetId, serviceAccountAuth);
  await doc.loadInfo();
  return doc;
}

// --- INICIALIZAÇÃO DO ROTEADOR TRPC NATIVO ---
const t = initTRPC.create();

const appRouter = t.router({
  'auth.login': t.procedure
    .input(z.any())
    .mutation(async ({ input }) => {
      try {
        const emailInput = (input?.email || input?.json?.email || "").toLowerCase().trim();
        const passwordInput = (input?.password || input?.json?.password || "").trim();

        console.log(` Tentativa de login para: ${emailInput}`);

        // Tentativa de conexão
        const doc = await getSheetDoc();
        const sheet = doc.sheetsByTitle['usuarios'];
        
        if (!sheet) {
          console.error("❌ Aba 'usuarios' não foi encontrada na planilha.");
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: "Aba de usuários não encontrada.",
          });
        }

        const rows = await sheet.getRows();
        const found = rows.find((r) => String(r.get('email') || "").toLowerCase().trim() === emailInput);

        if (!found || String(found.get('password') || "").trim() !== passwordInput) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: "Usuário ou senha incorretos.",
          });
        }

        console.log(`✅ Login efetuado: ${found.get('name')}`);

        return {
          id: found.rowNumber,
          name: found.get('name') || "Usuário",
          email: found.get('email') || emailInput,
          message: "Login realizado com sucesso!",
        };

      } catch (error: any) {
        // Exibe no log do Render o motivo exato da rejeição do Google
        console.error("🚨 DETALHE DO ERRO NO LOGIN:", error.message || error);
        
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: "Usuário ou senha incorretos.",
        });
      }
    }),
});

export type AppRouter = typeof appRouter;

app.use(
  "/api/trpc",
  trpcExpress.createExpressMiddleware({
    router: appRouter,
  })
);

app.get("*", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});

// Forçando deploy para limpeza de chaves v1