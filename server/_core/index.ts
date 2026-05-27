import express from "express";
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { ENV } from './env';

const app = express();
app.use(express.json());

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

// Rota onde o seu botão "Entrar" vai bater
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "E-mail e senha são obrigatórios." });
    }

    // Busca diretamente na planilha usando a função acima
    const user = await getUserByEmail(email);

    if (!user || user.password !== password) {
      return res.status(401).json({ message: "E-mail ou senha incorretos." });
    }

    // Login com sucesso! Retorna os dados do usuário para o Frontend
    return res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      message: "Login realizado com sucesso!"
    });
  } catch (error) {
    console.error("Erro na rota de login:", error);
    return res.status(500).json({ message: "Erro interno no servidor." });
  }
});

// Rota opcional para criar novos usuários via API se precisar
app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    await registerUser(name, email, password);
    return res.json({ message: "Usuário registrado com sucesso!" });
  } catch (error: any) {
    return res.status(400).json({ message: error.message || "Erro ao registrar." });
  }
} as express.RequestHandler);

// ... Você pode manter ou colar aqui abaixo as outras funções de abastecimentos (createRefueling, etc.) se o seu arquivo original tinha elas.

// Inicialização do servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando de forma independente na porta ${PORT}`);
});