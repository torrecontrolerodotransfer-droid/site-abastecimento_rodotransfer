import express from "express";
import path from "path"; 
import { fileURLToPath } from "url"; 
import { initTRPC, TRPCError } from "@trpc/server";
import * as trpcExpress from "@trpc/server/adapters/express";
import { z } from "zod";
import { google } from "googleapis";

// --- IMPORTAÇÕES ORIGINAIS DO SEU PROJETO ---
import { COOKIE_NAME } from "../shared/const";
import { getSessionCookieOptions } from "./_core/cookies";

const app = express();

// Permite o tráfego de cookies e cabeçalhos de autenticação entre o site e o backend
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

// --- CONTEXTO ADAPTADO PARA PASSAR REQ E RES PARA OS COOKIES ---
const createContext = ({ req, res }: trpcExpress.CreateExpressContextOptions) => ({ req, res });

// --- CONFIGURAÇÃO DO TRPC ---
const t = initTRPC.context<typeof createContext>().create();

const appRouter = t.router({
  auth: t.router({
    // Rota me: Lê a sessão simulada ou ativa
    me: t.procedure.query(() => {
      console.log("[tRPC] Rota auth.me consultada pelo hook useAuth.");
      return {
        id: 1,
        openId: "admin",
        name: "Rodotransfer Operador",
        email: "frotas@rodotransfer.com.br",
        role: "admin",
      };
    }),

    // Rota login: Mesma estrutura do seu routers.ts, mas conectada ao Google Sheets!
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

        console.log(`[tRPC] Iniciando validação no Sheets para: "${email}"`);

        try {
          // Busca o usuário em tempo real na planilha do Google
          const userPlanilha = await verificarUsuarioNaPlanilha(email, password);
          console.log(`[tRPC] ✅ LOGIN ACEITO COM SUCESSO PARA: ${userPlanilha.name}`);

          const sessionUser = {
            id: 1,
            openId: "admin",
            name: userPlanilha.name,
            email: userPlanilha.email,
            role: "admin",
          };

          // Salva o cookie original usando as regras do seu projeto original
          const cookieOptions = getSessionCookieOptions(ctx.req);
          ctx.res.cookie(COOKIE_NAME, "sessao_rodotransfer_ativa", cookieOptions);

          // Retorna o exato payload que o seu Home.tsx e useAuth exigem
          return {
            success: true,
            user: sessionUser,
          };

        } catch (err: any) {
          console.error(`[tRPC] ❌ Falha no login: ${err.message}`);
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: err.message || "Usuário ou senha incorretos.",
          });
        }
      }),

    // Rota logout original
    logout: t.procedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
});

export type AppRouter = typeof appRouter;

// Aplica o tRPC injetando o contexto com req e res para gravação de cookies
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

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Backend 100% integrado com Cookies e Sheets rodando na porta ${PORT}`);
});