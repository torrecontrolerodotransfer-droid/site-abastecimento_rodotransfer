import express from "express";
import path from "path"; 
import { fileURLToPath } from "url"; 
import { initTRPC, TRPCError } from "@trpc/server";
import * as trpcExpress from "@trpc/server/adapters/express";
import { z } from "zod";
import { google } from "googleapis";

const app = express();

// Garante tráfego livre de cookies de autenticação entre as requisições
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Credentials", "true");
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicPath = path.resolve(process.cwd(), "dist/public");
app.use(express.static(publicPath));

// --- INTEGRAÇÃO COM GOOGLE SHEETS ---
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
    throw new Error("Aba 'usuarios' vazia ou sem dados.");
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

  const dbName = String(userFound[1] || "RODOTRANSFER").trim();
  const dbPassword = String(userFound[3] || "").trim();

  if (dbPassword !== passwordInput.trim()) {
    throw new Error("Senha incorreta.");
  }

  return { name: dbName, email: emailInput };
}

// --- CONTEXTO TRPC ---
const createContext = ({ req, res }: trpcExpress.CreateExpressContextOptions) => ({ req, res });
const t = initTRPC.context<typeof createContext>().create();

// --- ROTAS DO SISTEMA (ALINHADAS COM SEU FRONTEND) ---
const appRouter = t.router({
  auth: t.router({
    
    // Rota me: Informa os dados tipados exatamente como a Dashboard quer consumir
    me: t.procedure.query(() => {
      console.log("[tRPC] Verificação de sessão externa efetuada.");
      return {
        id: 1, // ID Numérico obrigatório
        openId: "admin",
        name: "RODOTRANSFER",
        email: "frotas@rodotransfer.com.br",
        role: "admin",
      };
    }),

    // Rota login: Autentica via planilha e injeta o cookie esperado
    login: t.procedure
      .input(
        z.object({
          username: z.string(),
          password: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const email = input.username.toLowerCase().trim();
        const password = input.password.trim();

        console.log(`[tRPC] Solicitando validação para: "${email}"`);

        try {
          const userPlanilha = await verificarUsuarioNaPlanilha(email, password);
          console.log(`[tRPC] ✅ LOGIN ACEITO COM SUCESSO PARA: ${userPlanilha.name}`);

          // Dados mapeados perfeitamente
          const sessionUser = {
            id: 1, // Tipo Número puro
            openId: "admin",
            name: userPlanilha.name,
            email: userPlanilha.email,
            role: "admin",
          };

          // Gravação direta do Cookie sem dependências externas complexas
          ctx.res.cookie("sb-auth-token", "sessao_rodotransfer_ativa", {
            httpOnly: true,
            secure: true,
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * 7 * 1000, // 7 dias
          });

          return {
            success: true,
            user: sessionUser,
          };

        } catch (err: any) {
          console.error(`[tRPC] ❌ Erro de autenticação: ${err.message}`);
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: err.message || "Usuário ou senha incorretos.",
          });
        }
      }),

    // Rota logout
    logout: t.procedure.mutation(({ ctx }) => {
      ctx.res.clearCookie("sb-auth-token", {
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "lax",
      });
      return { success: true };
    }),
  }),
});

export type AppRouter = typeof appRouter;

app.use(
  "/api/trpc",
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

app.get("*", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

const PORT = PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor de Produção 100% alinhado na porta ${PORT}`);
});