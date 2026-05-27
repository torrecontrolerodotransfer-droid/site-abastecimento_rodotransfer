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
//// ==========================================
// ROTAS DE AUTENTICAÇÃO (ADAPTADAS PARA TRPC)
// ==========================================

app.post("/api/trpc/auth.login", async (req, res) => {
  try {
    console.log("Dados recebidos no body:", JSON.stringify(req.body));

    // O tRPC pode enviar os dados de várias formas estruturadas.
    // Vamos tentar capturar de todas as combinações possíveis:
    let email = "";
    let password = "";

    if (req.body) {
      // 1. Tenta buscar de req.body.json (Formato tRPC padrão v11)
      if (req.body.json) {
        email = req.body.json.email;
        password = req.body.json.password;
      } 
      // 2. Tenta buscar da primeira chave de uma lista (Formato batching do tRPC v10: { "0": { "email": ... } })
      else if (req.body["0"]) {
        email = req.body["0"].email;
        password = req.body["0"].password;
      }
      // 3. Tenta buscar direto no body raiz
      else {
        email = req.body.email;
        password = req.body.password;
      }
    }

    // Remove qualquer espaço em branco que tenha ido sem querer
    email = email ? email.trim() : "";
    password = password ? password.trim() : "";

    if (!email || !password) {
      return res.status(400).json({
        error: { message: "E-mail e senha são obrigatórios no formato de input do tRPC." }
      });
    }

    // Executa a busca na planilha utilizando o e-mail extraído
    const user = await getUserByEmail(email);

    if (!user || user.password !== password) {
      return res.status(401).json({
        error: { message: "E-mail ou senha incorretos." }
      });
    }

    // Devolve no formato exato que o interceptor do tRPC precisa para dar "Success"
    // Mantemos tanto o formato v10 quanto o v11 envolvidos em 'result'
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

  } catch (error: any) {
    console.error("Erro interno na rota de login tRPC:", error);
    return res.status(500).json({
      error: { message: error.message || "Erro interno no servidor." }
    });
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