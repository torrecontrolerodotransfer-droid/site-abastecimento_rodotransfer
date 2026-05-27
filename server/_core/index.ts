import express from "express";
import path from "path"; 
import { fileURLToPath } from "url"; 
import { initTRPC, TRPCError } from "@trpc/server";
import * as trpcExpress from "@trpc/server/adapters/express";
import { z } from "zod";
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { ENV } from './env.js';

const app = express();

// Middlewares essenciais para interpretar requisições do Express
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- CONFIGURAÇÃO PARA SERVIR O FRONTEND COMPILADO ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicPath = path.resolve(process.cwd(), "dist/public");
app.use(express.static(publicPath));

// --- CONEXÃO AUTENTICADA COM O GOOGLE SHEETS ---
async function getSheetDoc() {
  const privateKey = ENV.googlePrivateKey ? ENV.googlePrivateKey.replace(/\\n/g, '\n') : '';
  const serviceAccountAuth = new JWT({
    email: ENV.googleServiceAccountEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const doc = new GoogleSpreadsheet(ENV.googleSheetId || '', serviceAccountAuth);
  await doc.loadInfo();
  return doc;
}

// --- INICIALIZAÇÃO DO ROTEADOR TRPC NATIVO ---
const t = initTRPC.create();

const appRouter = t.router({
  // Mapeia o procedimento exato 'auth.login' que o tRPC do frontend está chamando
  'auth.login': t.procedure
    .input(
      z.object({
        email: z.string(),
        password: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        console.log(`Verificando credenciais para o e-mail: ${input.email}`);
        
        const doc = await getSheetDoc();
        const sheet = doc.sheetsByTitle['usuarios'];
        if (!sheet) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: "Aba 'usuarios' não localizada na planilha do Google.",
          });
        }

        const rows = await sheet.getRows();
        // Localiza a linha correspondente ignorando espaços em branco e letras maiúsculas/minúsculas
        const found = rows.find(
          (r) => String(r.get('email')).toLowerCase().trim() === input.email.toLowerCase().trim()
        );

        // Validação da senha lida diretamente na planilha
        if (!found || String(found.get('password')).trim() !== input.password.trim()) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: "Usuário ou senha incorretos.",
          });
        }

        console.log(`Acesso concedido com sucesso para: ${found.get('name')}`);

        // Retorna a estrutura exata que o frontend espera para construir o estado da sessão
        return {
          id: found.rowNumber,
          name: found.get('name'),
          email: found.get('email'),
          message: "Login realizado com sucesso!",
        };
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || "Falha na comunicação com o Google Sheets.",
        });
      }
    }),
});

export type AppRouter = typeof appRouter;

// Acopla o ecossistema tRPC ao servidor Express na rota base da API do sistema
app.use(
  "/api/trpc",
  trpcExpress.createExpressMiddleware({
    router: appRouter,
  })
);

// Rota curinga (SPA Fallback) para o roteamento interno das páginas do frontend funcionar
app.get("*", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor com tRPC nativo rodando na porta ${PORT}`);
});