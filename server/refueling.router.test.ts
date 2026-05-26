import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import { TRPCError } from "@trpc/server";

describe("Refueling tRPC Router", () => {
  const testUserId = 888;
  const otherUserId = 777;
  let createdRefuelingId: number;

  const mockUser = {
    id: testUserId,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const mockOtherUser = {
    id: otherUserId,
    openId: "other-user",
    email: "other@example.com",
    name: "Other User",
    loginMethod: "manus",
    role: "user" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const mockContext = {
    user: mockUser,
    req: { protocol: "https", headers: {} } as any,
    res: { clearCookie: () => {} } as any,
  };

  const mockOtherContext = {
    user: mockOtherUser,
    req: { protocol: "https", headers: {} } as any,
    res: { clearCookie: () => {} } as any,
  };

  describe("refueling.create", () => {
    it("should create a new refueling", async () => {
      const caller = appRouter.createCaller(mockContext);
      const result = await caller.refueling.create({
        date: new Date("2026-05-20"),
        plate: "ABC-1234",
        driverName: "João Silva",
        fuelType: "gasolina",
        pricePerLiter: 5.5,
        litersRefueled: 40,
        totalPrice: 220,
        gasStation: "Posto Shell",
        km: 50000,
        notes: "Test refueling",
      });

      expect(result).toBeDefined();
      expect(result.plate).toBe("ABC-1234");
      expect(result.userId).toBe(testUserId);
      createdRefuelingId = result.id;
    });

    it("should validate required fields", async () => {
      const caller = appRouter.createCaller(mockContext);
      try {
        await caller.refueling.create({
          date: new Date(),
          plate: "",
          driverName: "João Silva",
          fuelType: "gasolina",
          pricePerLiter: 5.5,
          litersRefueled: 40,
          totalPrice: 220,
          gasStation: "Posto",
          km: 50000,
        });
        expect.fail("Should have thrown validation error");
      } catch (error: any) {
        expect(error.code).toBe("BAD_REQUEST");
      }
    });

    it("should validate positive values", async () => {
      const caller = appRouter.createCaller(mockContext);
      try {
        await caller.refueling.create({
          date: new Date(),
          plate: "ABC-1234",
          driverName: "João Silva",
          fuelType: "gasolina",
          pricePerLiter: -5.5,
          litersRefueled: 40,
          totalPrice: 220,
          gasStation: "Posto",
          km: 50000,
        });
        expect.fail("Should have thrown validation error");
      } catch (error: any) {
        expect(error.code).toBe("BAD_REQUEST");
      }
    });
  });

  describe("refueling.list", () => {
    it("should list refuelings for authenticated user", async () => {
      const caller = appRouter.createCaller(mockContext);
      const result = await caller.refueling.list({
        limit: 10,
        offset: 0,
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result.every((r) => r.userId === testUserId)).toBe(true);
    });

    it("should respect limit parameter", async () => {
      const caller = appRouter.createCaller(mockContext);
      const result = await caller.refueling.list({
        limit: 1,
        offset: 0,
      });

      expect(result.length).toBeLessThanOrEqual(1);
    });
  });

  describe("refueling.get", () => {
    it("should retrieve a specific refueling", async () => {
      const caller = appRouter.createCaller(mockContext);
      const result = await caller.refueling.get({
        id: createdRefuelingId,
      });

      expect(result).toBeDefined();
      expect(result.id).toBe(createdRefuelingId);
    });

    it("should not allow accessing other user's refueling", async () => {
      const caller = appRouter.createCaller(mockOtherContext);
      try {
        await caller.refueling.get({
          id: createdRefuelingId,
        });
        expect.fail("Should have thrown NOT_FOUND error");
      } catch (error: any) {
        expect(error.code).toBe("NOT_FOUND");
      }
    });

    it("should throw NOT_FOUND for non-existent refueling", async () => {
      const caller = appRouter.createCaller(mockContext);
      try {
        await caller.refueling.get({
          id: 99999,
        });
        expect.fail("Should have thrown NOT_FOUND error");
      } catch (error: any) {
        expect(error.code).toBe("NOT_FOUND");
      }
    });
  });

  describe("refueling.update", () => {
    it("should update refueling data", async () => {
      const caller = appRouter.createCaller(mockContext);
      const result = await caller.refueling.update({
        id: createdRefuelingId,
        data: {
          notes: "Updated notes",
          gasStation: "Posto Ipiranga",
        },
      });

      expect(result).toBeDefined();
      expect(result?.notes).toBe("Updated notes");
      expect(result?.gasStation).toBe("Posto Ipiranga");
    });

    it("should not allow updating other user's refueling", async () => {
      const caller = appRouter.createCaller(mockOtherContext);
      try {
        await caller.refueling.update({
          id: createdRefuelingId,
          data: {
            notes: "Hacked",
          },
        });
        expect.fail("Should have thrown NOT_FOUND error");
      } catch (error: any) {
        expect(error.code).toBe("NOT_FOUND");
      }
    });
  });

  describe("refueling.stats", () => {
    it("should return stats for user", async () => {
      const caller = appRouter.createCaller(mockContext);
      const result = await caller.refueling.stats();

      expect(result).toBeDefined();
      expect(result.totalSpent).toBeGreaterThanOrEqual(0);
      expect(result.averageConsumption).toBeGreaterThanOrEqual(0);
      expect(result.refuelingCount).toBeGreaterThanOrEqual(0);
      expect(typeof result.byPlate).toBe("object");
    });

    it("should return zero stats for user with no refuelings", async () => {
      const caller = appRouter.createCaller(mockOtherContext);
      const result = await caller.refueling.stats();

      expect(result.totalSpent).toBe(0);
      expect(result.averageConsumption).toBe(0);
      expect(result.refuelingCount).toBe(0);
    });
  });

  describe("refueling.delete", () => {
    it("should delete a refueling", async () => {
      const caller = appRouter.createCaller(mockContext);
      const created = await caller.refueling.create({
        date: new Date(),
        plate: "DEL-1234",
        driverName: "João Silva",
        fuelType: "gasolina",
        pricePerLiter: 5.5,
        litersRefueled: 40,
        totalPrice: 220,
        gasStation: "Posto",
        km: 50000,
      });

      const result = await caller.refueling.delete({
        id: created.id,
      });

      expect(result.success).toBe(true);

      try {
        await caller.refueling.get({ id: created.id });
        expect.fail("Should have thrown NOT_FOUND");
      } catch (error: any) {
        expect(error.code).toBe("NOT_FOUND");
      }
    });

    it("should not allow deleting other user's refueling", async () => {
      const caller = appRouter.createCaller(mockOtherContext);
      try {
        await caller.refueling.delete({
          id: createdRefuelingId,
        });
        expect.fail("Should have thrown NOT_FOUND error");
      } catch (error: any) {
        expect(error.code).toBe("NOT_FOUND");
      }
    });
  });

  describe("refueling.exportCSV", () => {
    it("should export refuelings as CSV", async () => {
      const caller = appRouter.createCaller(mockContext);
      const result = await caller.refueling.exportCSV({});

      expect(result).toBeDefined();
      expect(result.csv).toBeDefined();
      expect(result.fileName).toMatch(/abastecimentos-\d{4}-\d{2}-\d{2}\.csv/);
      expect(result.csv).toContain("Data");
      expect(result.csv).toContain("Placa");
    });
  });

  describe("refueling.exportJSON", () => {
    it("should export refuelings as JSON", async () => {
      const caller = appRouter.createCaller(mockContext);
      const result = await caller.refueling.exportJSON({});

      expect(result).toBeDefined();
      expect(result.json).toBeDefined();
      expect(result.fileName).toMatch(/abastecimentos-\d{4}-\d{2}-\d{2}\.json/);

      const parsed = JSON.parse(result.json);
      expect(Array.isArray(parsed)).toBe(true);
    });
  });
});
