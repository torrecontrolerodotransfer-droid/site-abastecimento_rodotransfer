import express from "express";
import path from "path"; 
import { fileURLToPath } from "url"; 
import { initTRPC, TRPCError } from "@trpc/server";
import * as trpcExpress from "@trpc/server/adapters/express";
import { z } from "zod";
import { google } from "googleapis";
import superjson from "superjson"; // Importação do transformador padrão do tRPC v10+

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicPath = path.resolve(process.cwd(), "dist/public");
app.use(express.static(publicPath));

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

// --- CONFIGURAÇÃO DO TRPC COM SUPERJSON ---
const t = initTRPC.create({
  transformer: superjson, // Garante que as respostas sejam transformadas corretamente para o frontend
});

const appRouter = t.router({
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

      console.log(`[tRPC] Processando login para: "${email}"`);
      const user = await verificarUsuarioNaPlanilha(email, password);
      
      return { 
        id: 1, 
        name: user.name, 
        email: user.email, 
        message: "Sucesso" 
      };
    }),
});

export type AppRouter = typeof appRouter;

app.use("/api/trpc", trpcExpress.createExpressMiddleware({ router: appRouter }));

app.get("/api/trpc/auth.me", (req, res) => {
  res.status(200).json({ result: { data: null } });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor com SuperJSON rodando na porta ${PORT}`);
});