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

// --- CONEXÃO AUTENTICADA COM O GOOGLE SHEETS ---
async function getSheetDoc() {
  const email = (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "").trim();
  const sheetId = (process.env.GOOGLE_SHEET_ID || "").trim();
  let rawKey = process.env.GOOGLE_PRIVATE_KEY || "";

  // 1. Limpa aspas externas inseridas pelo Render
  if (rawKey.startsWith('"') && rawKey.endsWith('"')) {
    rawKey = rawKey.slice(1, -1);
  }

  // 2. CORREÇÃO DA CHAVE: Reconstrói as quebras de linha reais se o texto vier com '\n' escrito por extenso
  let privateKey = rawKey;
  if (rawKey.includes('\\n')) {
    privateKey = rawKey.split('\\n').join('\n');
  }

  // Garante que o cabeçalho e rodapé estejam presentes e limpos
  privateKey = privateKey.trim();

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

        // Tentativa de conexão com a planilha usando a chave tratada
        const doc = await getSheetDoc();
        const sheet = doc.sheetsByTitle['usuarios'];
        
        if (!sheet) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: "Aba 'usuarios' não localizada na planilha.",
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

        console.log(`✅ Login efetuado com sucesso para: ${found.get('name')}`);

        return {
          id: found.rowNumber,
          name: found.get('name') || "Usuário",
          email: found.get('email') || emailInput,
          message: "Login realizado com sucesso!",
        };

      } catch (error: any) {
        console.error("🚨 ERRO DETALHADO NO BACKEND:", error.message || error);
        
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
  console.log(`🚀 Servidor tRPC rodando na porta ${PORT}`);
});

// Forçando deploy v2 - Decodificador de chave ativo