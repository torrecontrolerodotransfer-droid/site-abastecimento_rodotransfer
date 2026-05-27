import express from "express";
import path from "path"; 
import { fileURLToPath } from "url"; 
import { initTRPC, TRPCError } from "@trpc/server";
import * as trpcExpress from "@trpc/server/adapters/express";
import { z } from "zod";
import { google } from "googleapis";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- CONFIGURAÇÃO PARA SERVIR O FRONTEND COMPILADO ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicPath = path.resolve(process.cwd(), "dist/public");
app.use(express.static(publicPath));

// --- CLIENTE BRUTO DA API DO GOOGLE SHEETS ---
function getSheetsClient() {
  const email = (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "").trim();
  let rawKey = process.env.GOOGLE_PRIVATE_KEY || "";

  if (rawKey.startsWith('"') && rawKey.endsWith('"')) {
    rawKey = rawKey.slice(1, -1);
  }

  let privateKey = rawKey;
  if (rawKey.includes('\\n')) {
    privateKey = rawKey.split('\\n').join('\n');
  }

  const auth = new google.auth.JWT({
    email: email,
    key: privateKey.trim(),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  return google.sheets({ version: 'v4', auth });
}

// --- ROTEADOR TRPC NATIVO ---
const t = initTRPC.create();

const appRouter = t.router({
  'auth.login': t.procedure
    .input(z.any())
    .mutation(async ({ input }) => {
      try {
        const emailInput = (input?.email || input?.json?.email || "").toLowerCase().trim();
        const passwordInput = (input?.password || input?.json?.password || "").trim();

        console.log(`[LOGIN] Tentativa recebida para: ${emailInput}`);

        const sheetId = (process.env.GOOGLE_SHEET_ID || "").trim();
        const sheets = getSheetsClient();

        // Faz uma chamada HTTP direta buscando os valores brutos da aba 'usuarios' da coluna A até D
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: sheetId,
          range: 'usuarios!A:D',
        });

        const rows = response.data.values;

        if (!rows || rows.length <= 1) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: "Nenhum dado encontrado na aba 'usuarios'.",
          });
        }

        // rows[0] são os cabeçalhos. Procuramos a partir de rows[1]
        let userFound: any = null;
        let foundIndex = -1;

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length < 4) continue; // Pula linhas incompletas

          // Coluna C é o índice 2 (email)
          const rowEmail = String(row[2] || "").toLowerCase().trim();

          if (rowEmail === emailInput) {
            userFound = row;
            foundIndex = i;
            break;
          }
        }

        if (!userFound) {
          console.log(`[LOGIN] ❌ E-mail não localizado na matriz do Google: ${emailInput}`);
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: "Usuário ou senha incorretos.",
          });
        }

        // Coluna B é índice 1 (name), Coluna D é índice 3 (password)
        const dbName = String(userFound[1] || "Usuário").trim();
        const dbPassword = String(userFound[3] || "").trim();

        if (dbPassword !== passwordInput) {
          console.log(`[LOGIN] ❌ Senha incorreta para o e-mail: ${emailInput}`);
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: "Usuário ou senha incorretos.",
          });
        }

        console.log(`[LOGIN] ✅ SUCESSO ABSOLUTO: Usuário ${dbName} autenticado.`);

        return {
          id: foundIndex + 1,
          name: dbName,
          email: emailInput,
          message: "Login realizado com sucesso!",
        };

      } catch (error: any) {
        console.error("🚨 ERRO CRÍTICO NO BACKEND:", error.message || error);
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

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor HTTP/API rodando perfeitamente na porta ${PORT}`);
});

// Forçando deploy v5 - Abordagem REST pura via googleapis