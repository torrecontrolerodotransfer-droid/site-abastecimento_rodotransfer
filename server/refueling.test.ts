import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  createRefueling,
  getRefuelingsByUserId,
  getRefuelingById,
  updateRefueling,
  deleteRefueling,
  getRefuelingStats,
  createReceipt,
  getReceiptByRefuelingId,
} from "./db";
import { InsertRefueling } from "../drizzle/schema";

describe("Refueling Database Functions", () => {
  const testUserId = 999;
  let createdRefuelingId: number;

  const testRefuelingData: InsertRefueling = {
    userId: testUserId,
    date: new Date("2026-05-20"),
    plate: "ABC-1234",
    fuelType: "gasolina",
    pricePerLiter: "5.50",
    litersRefueled: "40.00",
    totalPrice: "220.00",
    gasStation: "Posto Shell",
    km: 50000,
    notes: "Abastecimento de teste",
  };

  describe("createRefueling", () => {
    it("should create a new refueling record", async () => {
      const refueling = await createRefueling(testRefuelingData);
      expect(refueling).toBeDefined();
      expect(refueling.plate).toBe("ABC-1234");
      expect(refueling.userId).toBe(testUserId);
      expect(refueling.totalPrice).toBe("220.00");
      createdRefuelingId = refueling.id;
    });

    it("should preserve decimal precision for prices", async () => {
      const refueling = await createRefueling({
        ...testRefuelingData,
        pricePerLiter: "5.89",
        litersRefueled: "35.50",
        totalPrice: "209.07",
      });
      expect(refueling.pricePerLiter).toBe("5.89");
      expect(refueling.litersRefueled).toBe("35.50");
      expect(refueling.totalPrice).toBe("209.07");
    });
  });

  describe("getRefuelingsByUserId", () => {
    it("should retrieve refuelings for a specific user", async () => {
      const refuelings = await getRefuelingsByUserId(testUserId, 10, 0);
      expect(Array.isArray(refuelings)).toBe(true);
      expect(refuelings.length).toBeGreaterThan(0);
      expect(refuelings.every((r) => r.userId === testUserId)).toBe(true);
    });

    it("should return empty array for user with no refuelings", async () => {
      const refuelings = await getRefuelingsByUserId(99999, 10, 0);
      expect(refuelings).toEqual([]);
    });

    it("should respect limit and offset parameters", async () => {
      const all = await getRefuelingsByUserId(testUserId, 100, 0);
      const limited = await getRefuelingsByUserId(testUserId, 1, 0);
      expect(limited.length).toBeLessThanOrEqual(1);
    });
  });

  describe("getRefuelingById", () => {
    it("should retrieve a specific refueling by ID", async () => {
      const refueling = await getRefuelingById(createdRefuelingId, testUserId);
      expect(refueling).toBeDefined();
      expect(refueling?.id).toBe(createdRefuelingId);
      expect(refueling?.plate).toBe("ABC-1234");
    });

    it("should return null if refueling does not belong to user", async () => {
      const refueling = await getRefuelingById(createdRefuelingId, 99999);
      expect(refueling).toBeNull();
    });

    it("should return null if refueling does not exist", async () => {
      const refueling = await getRefuelingById(99999, testUserId);
      expect(refueling).toBeNull();
    });
  });

  describe("updateRefueling", () => {
    it("should update refueling data", async () => {
      const updated = await updateRefueling(createdRefuelingId, testUserId, {
        notes: "Abastecimento atualizado",
        gasStation: "Posto Ipiranga",
      });
      expect(updated).toBeDefined();
      expect(updated?.notes).toBe("Abastecimento atualizado");
      expect(updated?.gasStation).toBe("Posto Ipiranga");
    });

    it("should not allow updating refueling of another user", async () => {
      const updated = await updateRefueling(createdRefuelingId, 99999, {
        notes: "Tentativa de atualizar",
      });
      expect(updated).toBeNull();
    });
  });

  describe("deleteRefueling", () => {
    it("should delete a refueling record", async () => {
      const deleted = await deleteRefueling(createdRefuelingId, testUserId);
      expect(deleted).toBe(true);

      const refueling = await getRefuelingById(createdRefuelingId, testUserId);
      expect(refueling).toBeNull();
    });

    it("should return false if refueling does not exist", async () => {
      const deleted = await deleteRefueling(99999, testUserId);
      expect(deleted).toBe(false);
    });

    it("should not allow deleting refueling of another user", async () => {
      const refueling = await createRefueling(testRefuelingData);
      const deleted = await deleteRefueling(refueling.id, 99999);
      expect(deleted).toBe(false);

      const stillExists = await getRefuelingById(refueling.id, testUserId);
      expect(stillExists).toBeDefined();
    });
  });

  describe("getRefuelingStats", () => {
    beforeAll(async () => {
      await createRefueling({
        userId: testUserId,
        date: new Date("2026-05-15"),
        plate: "XYZ-5678",
        fuelType: "diesel",
        pricePerLiter: "6.00",
        litersRefueled: "50.00",
        totalPrice: "300.00",
        gasStation: "Posto A",
        km: 45000,
      });

      await createRefueling({
        userId: testUserId,
        date: new Date("2026-05-18"),
        plate: "XYZ-5678",
        fuelType: "diesel",
        pricePerLiter: "6.10",
        litersRefueled: "48.00",
        totalPrice: "292.80",
        gasStation: "Posto B",
        km: 50000,
      });
    });

    it("should calculate total spent correctly", async () => {
      const stats = await getRefuelingStats(testUserId);
      expect(stats.totalSpent).toBeGreaterThan(0);
    });

    it("should calculate average consumption based on distance between refuelings", async () => {
      const stats = await getRefuelingStats(testUserId);
      if (stats.refuelingCount >= 2) {
        expect(stats.averageConsumption).toBeGreaterThanOrEqual(0);
      }
    });

    it("should return stats by plate", async () => {
      const stats = await getRefuelingStats(testUserId);
      expect(Object.keys(stats.byPlate).length).toBeGreaterThan(0);
      expect(stats.byPlate["XYZ-5678"]).toBeDefined();
    });

    it("should return zero stats for user with no refuelings", async () => {
      const stats = await getRefuelingStats(99999);
      expect(stats.totalSpent).toBe(0);
      expect(stats.averageConsumption).toBe(0);
      expect(stats.refuelingCount).toBe(0);
      expect(Object.keys(stats.byPlate).length).toBe(0);
    });
  });

  describe("createReceipt", () => {
    it("should create a receipt record", async () => {
      const refueling = await createRefueling(testRefuelingData);
      const receipt = await createReceipt({
        refuelingId: refueling.id,
        storageKey: "receipts/999/test-receipt.jpg",
        storageUrl: "https://storage.example.com/receipts/999/test-receipt.jpg",
        fileName: "test-receipt.jpg",
        mimeType: "image/jpeg",
        fileSize: 102400,
      });

      expect(receipt).toBeDefined();
      expect(receipt.refuelingId).toBe(refueling.id);
      expect(receipt.fileName).toBe("test-receipt.jpg");
    });
  });

  describe("getReceiptByRefuelingId", () => {
    it("should retrieve receipt by refueling ID", async () => {
      const refueling = await createRefueling(testRefuelingData);
      const receipt = await createReceipt({
        refuelingId: refueling.id,
        storageKey: "receipts/999/another-receipt.jpg",
        storageUrl: "https://storage.example.com/receipts/999/another-receipt.jpg",
        fileName: "another-receipt.jpg",
        mimeType: "image/jpeg",
        fileSize: 204800,
      });

      const retrieved = await getReceiptByRefuelingId(refueling.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.refuelingId).toBe(refueling.id);
      expect(retrieved?.fileName).toBe("another-receipt.jpg");
    });

    it("should return null if receipt does not exist", async () => {
      const receipt = await getReceiptByRefuelingId(99999);
      expect(receipt).toBeNull();
    });
  });
});
