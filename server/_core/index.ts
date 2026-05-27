import express from "express";
import path from "path"; 
import { fileURLToPath } from "url"; 
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { ENV } from './env.js';

const app = express();
app.use(express.json());

// --- CONFIGURAÇÃO PARA SERVIR O FRONTEND (Resolve o erro 404) ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Busca o caminho correto de forma dinâmica independente de estar no Render ou Localmente
let publicPath = path.join(__dirname, "../../dist/public");

// Se não achar a pasta voltando dois níveis (comportamento do Render), tenta olhar no nível local do build
if (!path.join(__dirname, "public")) {
  publicPath = path.join(__dirname, "public");
} else {
  // Verificação alternativa absoluta baseada na raiz do projeto compilado
  publicPath = path.resolve(process.cwd(), "dist/public");
}

app.use(express.static(publicPath));

// ==========================================
// CONEXÃO COM O GOOGLE SHEETS
// ==========================================
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

// ==========================================
// OPERAÇÕES DE USUÁRIOS (100% INDEPENDENTE)
// ==========================================

// Função para buscar usuário por E-mail (usada no Login)
export async function getUserByEmail(email: string) {
  try {
    const doc = await getSheetDoc();
    const sheet = doc.sheetsByTitle['usuarios'];
    if (!sheet) return undefined;

    const rows = await sheet.getRows();
    const found = rows.find(r => r.get('email') === email);

    if (!found) return undefined;

    return {
      id: found.rowNumber, 
      name: found.get('name'),
      email: found.get('email'),
      password: found.get('password'), 
    };
  } catch (error) {
    console.error("Erro ao buscar usuário por email:", error);
    return undefined;
  }
}

// Função para Cadastrar um novo usuário diretamente na Planilha
export async function registerUser(name: string, email: string, passwordPlain: string): Promise<void> {
  try {
    const doc = await getSheetDoc();
    const sheet = doc.sheetsByTitle['usuarios'];
    if (!sheet) throw new Error("Aba 'usuarios' não encontrada na planilha");

    const rows = await sheet.getRows();
    
    const exists = rows.some(r => r.get('email') === email);
    if (exists) throw new Error("Este e-mail já está cadastrado.");

    const rowData = {
      id: (rows.length + 1).toString(),
      name: name,
      email: email,
      password: passwordPlain 
    };

    await sheet.addRow(rowData);
  } catch (error) {
    console.error("Erro ao registrar usuário no Sheets:", error);
    throw error;
  }
}

// ==========================================
// ROTAS DE AUTENTICAÇÃO (LOGIN E CADASTRO)
// ==========================================

// ==========================================
// ROTAS DE AUTENTICAÇÃO (ADAPTADAS PARA TRPC)
// ==========================================

// Esta rota intercepta o clique do botão "Entrar" vindo do frontend tRPC
app.post("/api/trpc/auth.login", async (req, res) => {
  try {
    // O tRPC geralmente envia os dados dentro de um objeto chamado 'json' ou direto no body
    // Vamos capturar das duas formas para garantir
    const input = req.body.json || req.body;
    const { email, password } = input;

    if (!email || !password) {
      return res.status(400).json({
        error: { message: "E-mail e senha são obrigatórios." }
      });
    }

    // Busca o usuário na Planilha do Google
    const user = await getUserByEmail(email);

    if (!user || user.password !== password) {
      return res.status(401).json({
        error: { message: "E-mail ou senha incorretos." }
      });
    }

    // Retorna a resposta no formato exato que o tRPC do Frontend espera receber
    return res.json({
      result: {
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          message: "Login realizado com sucesso!"
        }
      }
    });
  } catch (error) {
    console.error("Erro na rota de login tRPC:", error);
    return res.status(500).json({
      error: { message: "Erro interno no servidor." }
    });
  }
});

// Mantendo a rota tradicional caso alguma outra parte do código chame
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await getUserByEmail(email);
    if (!user || user.password !== password) {
      return res.status(401).json({ message: "E-mail ou senha incorretos." });
    }
    return res.json({ id: user.id, name: user.name, email: user.email });
  } catch (error) {
    return res.status(500).json({ message: "Erro interno." });
  }
});
// ... Se você tiver as outras rotas/funções de abastecimentos (createRefueling, etc.), mantenha-as coladas aqui ...

// --- ROTA CURINGA PARA O FRONTEND (Sempre antes do listen) ---
app.get("*", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

// --- INICIALIZAÇÃO DO SERVIDOR ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando de forma independente na porta ${PORT}`);
});