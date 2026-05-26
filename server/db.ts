import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, refuelings, receipts, Refueling, InsertRefueling, Receipt, InsertReceipt } from "../drizzle/schema";
import { ENV } from './_core/env';


let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function createRefueling(data: InsertRefueling): Promise<Refueling> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(refuelings).values(data);
  const refuelingId = result[0].insertId;
  
  const created = await db.select().from(refuelings).where(eq(refuelings.id, Number(refuelingId))).limit(1);
  return created[0]!;
}

export async function getRefuelingsByUserId(userId: number, limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(refuelings)
    .where(eq(refuelings.userId, userId))
    .orderBy((t) => t.date)
    .limit(limit)
    .offset(offset);
}

export async function getRefuelingById(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(refuelings)
    .where(eq(refuelings.id, id))
    .limit(1);
  
  if (!result[0] || result[0].userId !== userId) {
    return null;
  }
  return result[0];
}

export async function updateRefueling(id: number, userId: number, data: Partial<InsertRefueling>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getRefuelingById(id, userId);
  if (!existing) return null;

  await db.update(refuelings).set(data).where(eq(refuelings.id, id));
  return await getRefuelingById(id, userId);
}

export async function deleteRefueling(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getRefuelingById(id, userId);
  if (!existing) return false;

  await db.delete(refuelings).where(eq(refuelings.id, id));
  return true;
}

export async function createReceipt(data: InsertReceipt): Promise<Receipt> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(receipts).values(data);
  const receiptId = result[0].insertId;
  
  const created = await db.select().from(receipts).where(eq(receipts.id, Number(receiptId))).limit(1);
  return created[0]!;
}

export async function getReceiptByRefuelingId(refuelingId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(receipts)
    .where(eq(receipts.refuelingId, refuelingId))
    .limit(1);
  
  return result[0] || null;
}

export async function getRefuelingStats(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const userRefuelings = await db.select().from(refuelings)
    .where(eq(refuelings.userId, userId))
    .orderBy((t) => t.date);
  
  if (userRefuelings.length === 0) {
    return {
      totalSpent: 0,
      averageConsumption: 0,
      refuelingCount: 0,
      byPlate: {} as Record<string, { count: number; totalSpent: number; totalLiters: number; averageConsumption: number }>,
    };
  }

  let totalSpent = 0;
  let totalLiters = 0;
  let totalDistanceKm = 0;
  let validConsumptionReadings = 0;
  const byPlate: Record<string, { count: number; totalSpent: number; totalLiters: number; averageConsumption: number }> = {};

  // Agrupar por placa e calcular consumo real
  const refuelingsByPlate: Record<string, typeof userRefuelings> = {};
  for (const refueling of userRefuelings) {
    if (!refuelingsByPlate[refueling.plate]) {
      refuelingsByPlate[refueling.plate] = [];
    }
    refuelingsByPlate[refueling.plate].push(refueling);
  }

  // Calcular estatísticas por placa
  for (const [plate, plateRefuelings] of Object.entries(refuelingsByPlate)) {
    let plateTotalSpent = 0;
    let plateTotalLiters = 0;
    let plateDistanceKm = 0;
    let plateValidReadings = 0;

    // Calcular consumo entre abastecimentos consecutivos
    for (let i = 1; i < plateRefuelings.length; i++) {
      const prev = plateRefuelings[i - 1];
      const curr = plateRefuelings[i];
      
      const distanceBetween = curr.km - prev.km;
      const litersUsed = Number(curr.litersRefueled);
      
      if (distanceBetween > 0 && litersUsed > 0) {
        plateDistanceKm += distanceBetween;
        plateTotalLiters += litersUsed;
        plateValidReadings += 1;
      }
    }

    // Somar gastos totais
    for (const refueling of plateRefuelings) {
      plateTotalSpent += Number(refueling.totalPrice);
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
    validConsumptionReadings += plateValidReadings;
  }

  const averageConsumption = totalLiters > 0 ? totalDistanceKm / totalLiters : 0;

  return {
    totalSpent,
    averageConsumption,
    refuelingCount: userRefuelings.length,
    byPlate,
  };
}

// TODO: add more feature queries here as your schema grows.
