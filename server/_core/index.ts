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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicPath = path.resolve(process.cwd(), "dist/public");
app.use(express.static(publicPath));

// --- CONEXÃO DIRETA COM O GOOGLE SHEETS ---
async function verificarUsuarioNaPlanilha(emailInput: string, passwordInput: string) {
  const emailService = (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "").trim();
  const sheetId = (process.env.GOOGLE_SHEET_ID || "").trim();
  let rawKey = process.env.GOOGLE_PRIVATE_KEY || "";

  if (rawKey.startsWith('"') && rawKey.endsWith('"')) rawKey = rawKey.slice(1, -1);
  if (rawKey.startsWith("'") && rawKey.endsWith("'")) rawKey = rawKey.slice(1, -1);

  let privateKey = rawKey;
  if (rawKey.includes('\\n')) {
    privateKey = rawKey.split('\\n').join('\n');
  }

  const auth = new google.auth.JWT({
    email: emailService,
    key: privateKey.trim(),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: 'usuarios!A:D',
  });

  const rows = response.data.values;
  if (!rows || rows.length <= 1) {
    throw new Error("Aba 'usuarios' vazia.");
  }

  let userFound: any = null;
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 4) continue;
    const rowEmail = String(row[2] || "").toLowerCase().trim();
    if (rowEmail === emailInput.toLowerCase().trim()) {
      userFound = row;
      break;
    }
  }

  if (!userFound) {
    throw new Error("E-mail não localizado na planilha.");
  }

  const dbName = String(userFound[1] || "Usuário").trim();
  const dbPassword = String(userFound[3] || "").trim();

  if (dbPassword !== passwordInput.trim()) {
    throw new Error("Senha incorreta.");
  }

  return { name: dbName, email: emailInput };
}

// --- CONFIGURAÇÃO DO TRPC EM JSON PURO ---
const t = initTRPC.create(); // Sem transformadores para alinhar com o formato padrão do seu front

const appRouter = t.router({
  // Rota 1: Autenticação do Login
  'auth.login': t.procedure
    .input(z.any())
    .mutation(async ({ input }) => {
      const email = (
        input?.username || 
        input?.json?.username || 
        input?.email || 
        input?.json?.email || 
        ""
      ).toLowerCase().trim();

      const password = String(
        input?.password || 
        input?.json?.password || 
        ""
      ).trim();

      console.log(`[tRPC] Solicitando validação para: "${email}"`);
      
      try {
        const user = await verificarUsuarioNaPlanilha(email, password);
        console.log(`[tRPC] ✅ LOGIN ACEITO COM SUCESSO PARA: ${user.name}`);
        
        // Retorna a estrutura exata que o frontend espera salvar na sessão
        return { 
          id: 1, 
          name: user.name, 
          email: user.email, 
          role: "admin"
        };
      } catch (err: any) {
        console.error(`[tRPC] ❌ Erro na validação: ${err.message}`);
        throw new TRPCError({ 
          code: 'UNAUTHORIZED', 
          message: err.message || "Usuário ou senha incorretos." 
        });
      }
    }),

  // Rota 2: Verificação de Sessão Ativa (Evita o erro "No procedure found on path auth.me")
  'auth.me': t.procedure
    .input(z.any().optional())
    .query(() => {
      console.log("[tRPC] Verificação de sessão externa efetuada.");
      // Retorna null temporariamente para sinalizar que não há sessão antiga travada
      return null;
    })
});

export type AppRouter = typeof appRouter;

// Aplica as rotas estruturadas no barramento do Express
app.use("/api/trpc", trpcExpress.createExpressMiddleware({ router: appRouter }));

app.get("*", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor de Produção 100% alinhado na porta ${PORT}`);
});