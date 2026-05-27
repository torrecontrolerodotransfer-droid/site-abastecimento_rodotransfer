import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { ENV } from './_core/env';

// Interfaces baseadas no que o seu front-end espera
export interface InsertUser {
  openId: string;
  name?: string | null;
  email?: string | null;
  loginMethod?: string | null;
  lastSignedIn?: Date;
  role?: string;
}

export interface InsertRefueling {
  userId: number;
  plate: string;
  km: number;
  litersRefueled: string | number;
  totalPrice: string | number;
  date?: string | Date;
}

export interface Refueling extends InsertRefueling {
  id: number;
}

export interface InsertReceipt {
  refuelingId: number;
  url: string;
}

export interface Receipt extends InsertReceipt {
  id: number;
}

// Inicializa a conexão com o Google Sheets usando as variáveis do Render
async function getSheetDoc() {
  const privateKey = process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') : '';
  
  const serviceAccountAuth = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID || '', serviceAccountAuth);
  await doc.loadInfo();
  return doc;
}

// ==========================================
// OPERAÇÕES DE USUÁRIOS
// ==========================================
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
      id: found.rowNumber, // usa o número da linha como ID numérico
      name: found.get('name'),
      email: found.get('email'),
      password: found.get('password'), // Senha salva na planilha
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
    
    // Evita cadastrar e-mails duplicados
    const exists = rows.some(r => r.get('email') === email);
    if (exists) throw new Error("Este e-mail já está cadastrado.");

    const rowData = {
      id: (rows.length + 1).toString(),
      name: name,
      email: email,
      password: passwordPlain // Em produção, o ideal é usar bcrypt para criptografar
    };

    await sheet.addRow(rowData);
  } catch (error) {
    console.error("Erro ao registrar usuário no Sheets:", error);
    throw error;
  }
}

// ==========================================
// OPERAÇÕES DE ABASTECIMENTOS (REFUELINGS)
// ==========================================
export async function createRefueling(data: InsertRefueling): Promise<Refueling> {
  const doc = await getSheetDoc();
  const sheet = doc.sheetsByTitle['abastecimentos'];
  if (!sheet) throw new Error("Aba 'abastecimentos' não encontrada");

  const rows = await sheet.getRows();
  const nextId = rows.length + 1;
  const dateStr = data.date ? new Date(data.date).toISOString() : new Date().toISOString();

  const newRow = {
    id: nextId.toString(),
    userId: data.userId.toString(),
    plate: data.plate,
    km: data.km.toString(),
    litersRefueled: data.litersRefueled.toString(),
    totalPrice: data.totalPrice.toString(),
    date: dateStr
  };

  await sheet.addRow(newRow);

  return {
    id: nextId,
    ...data
  };
}

export async function getRefuelingsByUserId(userId: number, limit = 50, offset = 0) {
  const doc = await getSheetDoc();
  const sheet = doc.sheetsByTitle['abastecimentos'];
  if (!sheet) return [];

  const rows = await sheet.getRows();
  const userRows = rows
    .filter(r => r.get('userId') === userId.toString())
    .map(r => ({
      id: Number(r.get('id')),
      userId: Number(r.get('userId')),
      plate: r.get('plate'),
      km: Number(r.get('km')),
      litersRefueled: r.get('litersRefueled'),
      totalPrice: r.get('totalPrice'),
      date: new Date(r.get('date'))
    }));

  return userRows.slice(offset, offset + limit);
}

export async function getRefuelingById(id: number, userId: number) {
  const doc = await getSheetDoc();
  const sheet = doc.sheetsByTitle['abastecimentos'];
  if (!sheet) return null;

  const rows = await sheet.getRows();
  const found = rows.find(r => r.get('id') === id.toString() && r.get('userId') === userId.toString());

  if (!found) return null;

  return {
    id: Number(found.get('id')),
    userId: Number(found.get('userId')),
    plate: found.get('plate'),
    km: Number(found.get('km')),
    litersRefueled: found.get('litersRefueled'),
    totalPrice: found.get('totalPrice'),
    date: new Date(found.get('date'))
  };
}

export async function updateRefueling(id: number, userId: number, data: Partial<InsertRefueling>) {
  const doc = await getSheetDoc();
  const sheet = doc.sheetsByTitle['abastecimentos'];
  if (!sheet) return null;

  const rows = await sheet.getRows();
  const found = rows.find(r => r.get('id') === id.toString() && r.get('userId') === userId.toString());

  if (!found) return null;

  if (data.plate) found.set('plate', data.plate);
  if (data.km) found.set('km', data.km.toString());
  if (data.litersRefueled) found.set('litersRefueled', data.litersRefueled.toString());
  if (data.totalPrice) found.set('totalPrice', data.totalPrice.toString());
  
  await found.save();
  return await getRefuelingById(id, userId);
}

export async function deleteRefueling(id: number, userId: number) {
  const doc = await getSheetDoc();
  const sheet = doc.sheetsByTitle['abastecimentos'];
  if (!sheet) return false;

  const rows = await sheet.getRows();
  const found = rows.find(r => r.get('id') === id.toString() && r.get('userId') === userId.toString());

  if (!found) return false;

  await found.delete();
  return true;
}

// ==========================================
// COMPROVANTES E NOTAS (RECEIPTS)
// ==========================================
export async function createReceipt(data: InsertReceipt): Promise<Receipt> {
  const doc = await getSheetDoc();
  let sheet = doc.sheetsByTitle['comprovantes'];
  
  if (!sheet) {
    sheet = await doc.addSheet({ title: 'comprovantes', headerValues: ['id', 'refuelingId', 'url'] });
  }

  const rows = await sheet.getRows();
  const nextId = rows.length + 1;

  await sheet.addRow({
    id: nextId.toString(),
    refuelingId: data.refuelingId.toString(),
    url: data.url
  });

  return {
    id: nextId,
    ...data
  };
}

export async function getReceiptByRefuelingId(refuelingId: number) {
  const doc = await getSheetDoc();
  const sheet = doc.sheetsByTitle['comprovantes'];
  if (!sheet) return null;

  const rows = await sheet.getRows();
  const found = rows.find(r => r.get('refuelingId') === refuelingId.toString());

  if (!found) return null;

  return {
    id: Number(found.get('id')),
    refuelingId: Number(found.get('refuelingId')),
    url: found.get('url')
  };
}

// ==========================================
// CÁLCULO DE ESTATÍSTICAS (DASHBOARD)
// ==========================================
export async function getRefuelingStats(userId: number) {
  const doc = await getSheetDoc();
  const sheet = doc.sheetsByTitle['abastecimentos'];
  
  if (!sheet) {
    return { totalSpent: 0, averageConsumption: 0, refuelingCount: 0, byPlate: {} };
  }

  const rows = await sheet.getRows();
  const userRefuelings = rows
    .filter(r => r.get('userId') === userId.toString())
    .map(r => ({
      id: Number(r.get('id')),
      userId: Number(r.get('userId')),
      plate: r.get('plate'),
      km: Number(r.get('km')),
      litersRefueled: Number(r.get('litersRefueled')),
      totalPrice: Number(r.get('totalPrice')),
      date: new Date(r.get('date'))
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (userRefuelings.length === 0) {
    return { totalSpent: 0, averageConsumption: 0, refuelingCount: 0, byPlate: {} };
  }

  let totalSpent = 0;
  let totalLiters = 0;
  let totalDistanceKm = 0;
  const byPlate: Record<string, { count: number; totalSpent: number; totalLiters: number; averageConsumption: number }> = {};

  const refuelingsByPlate: Record<string, typeof userRefuelings> = {};
  for (const refueling of userRefuelings) {
    if (!refuelingsByPlate[refueling.plate]) {
      refuelingsByPlate[refueling.plate] = [];
    }
    refuelingsByPlate[refueling.plate].push(refueling);
  }

  for (const [plate, plateRefuelings] of Object.entries(refuelingsByPlate)) {
    let plateTotalSpent = 0;
    let plateTotalLiters = 0;
    let plateDistanceKm = 0;

    for (let i = 1; i < plateRefuelings.length; i++) {
      const prev = plateRefuelings[i - 1];
      const curr = plateRefuelings[i];
      const distanceBetween = curr.km - prev.km;
      const litersUsed = curr.litersRefueled;
      
      if (distanceBetween > 0 && litersUsed > 0) {
        plateDistanceKm += distanceBetween;
        plateTotalLiters += litersUsed;
      }
    }

    for (const refueling of plateRefuelings) {
      plateTotalSpent += refueling.totalPrice;
    }

    const plateAverageConsumption = plateTotalLiters > 0 ? plateDistanceKm / plateTotalLiters : 0;

    byPlate[plate] = {
      count: plateRefuelings.length,
      totalSpent: plateTotalSpent,
      totalLiters: plateTotalLiters,
      averageConsumption: plateAverageConsumption,
    };

    totalSpent += plateTotalSpent;
    totalLiters += plateTotalLiters;
    totalDistanceKm += plateDistanceKm;
  }

  const averageConsumption = totalLiters > 0 ? totalDistanceKm / totalLiters : 0;

  return {
    totalSpent,
    averageConsumption,
    refuelingCount: userRefuelings.length,
    byPlate,
  };
}