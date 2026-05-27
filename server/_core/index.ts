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

// --- CONEXÃO DIRETA COM AS VARIÁVEIS DO RENDER ---
async function getSheetDoc() {
  // Puxa direto do process.env do Render para evitar erros de importação do env.js
  const rawKey = process.env.GOOGLE_PRIVATE_KEY || "";
  const privateKey = rawKey.replace(/\\n/g, '\n');
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "";
  const sheetId = process.env.GOOGLE_SHEET_ID || "";

  if (!privateKey || !email || !sheetId) {
    console.error("❌ ERRO CRÍTICO: Variáveis do Google não foram encontradas no process.env!");
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
        // Aceita as variações de envio do tRPC do frontend
        const emailInput = (input?.email || input?.json?.email || "").toLowerCase().trim();
        const passwordInput = (input?.password || input?.json?.password || "").trim();

        console.log(`Tentativa de login recebida para: ${emailInput}`);

        // 1. CONEXÃO COM A PLANILHA
        const doc = await getSheetDoc();
        const sheet = doc.sheetsByTitle['usuarios']; // Nome idêntico ao da sua aba
        
        if (!sheet) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: "Aba 'usuarios' não encontrada na planilha.",
          });
        }

        // 2. LEITURA DAS LINHAS
        const rows = await sheet.getRows();
        
        // Busca o usuário comparando o e-mail da coluna
        const found = rows.find((r) => {
          const rowEmail = String(r.get('email') || "").toLowerCase().trim();
          return rowEmail === emailInput;
        });

        if (!found) {
          console.log(`❌ Usuário não encontrado na planilha: ${emailInput}`);
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: "Usuário ou senha incorretos.",
          });
        }

        // 3. VALIDAÇÃO DA SENHA
        const dbPassword = String(found.get('password') || "").trim();

        if (dbPassword !== passwordInput) {
          console.log(`❌ Senha incorreta para o usuário: ${emailInput}`);
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: "Usuário ou senha incorretos.",
          });
        }

        console.log(`✅ Login efetuado com sucesso para: ${found.get('name')}`);

        // Retorna o objeto exato que o frontend precisa para montar a sessão logada
        return {
          id: found.rowNumber,
          name: found.get('name') || "Usuário",
          email: found.get('email') || emailInput,
          message: "Login realizado com sucesso!",
        };

      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        console.error("Erro interno no processo de login:", error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: "Erro interno no servidor ao validar dados.",
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
  console.log(`🚀 Servidor tRPC blindado rodando na porta ${PORT}`);
});