import { UNAUTHED_ERR_MSG, COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  createRefueling,
  getRefuelingsByUserId,
  getRefuelingById,
  updateRefueling,
  deleteRefueling,
  createReceipt,
  getReceiptByRefuelingId,
  getRefuelingStats,
} from "./db";
import { storagePut, storageGet } from "./storage";
import { TRPCError } from "@trpc/server";

const refuelingInputSchema = z.object({
  date: z.date(),
  plate: z.string().min(1, "Placa é obrigatória"),
  driverName: z.string().min(1, "Nome do motorista é obrigatório"),
  fuelType: z.string().min(1, "Tipo de combustível é obrigatório"),
  pricePerLiter: z.number().positive("Valor por litro deve ser positivo"),
  litersRefueled: z.number().positive("Litros abastecidos deve ser positivo"),
  totalPrice: z.number().positive("Valor total deve ser positivo"),
  gasStation: z.string().min(1, "Posto é obrigatório"),
  km: z.number().int().positive("KM deve ser um número positivo"),
  notes: z.string().optional(),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    
    login: publicProcedure
      .input(
        z.object({
          username: z.string(),
          password: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // CREDENCIAIS ATUALIZADAS
        const expectedUser = process.env.ADMIN_USERNAME || "RODOTRANSFER";
        const expectedPass = process.env.JWT_SECRET || "Rodotransfer2026";

        if (
          input.username.toUpperCase() !== expectedUser.toUpperCase() ||
          input.password !== expectedPass
        ) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Usuário ou senha incorretos.",
          });
        }

        const sessionUser = {
          id: 1,
          openId: "admin",
          name: "Rodotransfer Operador",
          email: "contato@rodotransfer.com",
          role: "admin",
        };

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, "sessao_rodotransfer_ativa", cookieOptions);

        return {
          success: true,
          user: sessionUser,
        };
      }),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  refueling: router({
    create: protectedProcedure
      .input(refuelingInputSchema)
      .mutation(async ({ input, ctx }) => {
        const refueling = await createRefueling({
          userId: ctx.user.id,
          date: input.date,
          plate: input.plate,
          driverName: input.driverName,
          fuelType: input.fuelType,
          pricePerLiter: input.pricePerLiter,
          litersRefueled: input.litersRefueled,
          totalPrice: input.totalPrice,
          gasStation: input.gasStation,
          km: input.km,
          notes: input.notes || "",
        });
        return refueling;
      }),

    list: protectedProcedure
      .input(
        z.object({
          limit: z.number().default(50),
          offset: z.number().default(0),
        })
      )
      .query(async ({ input, ctx }) => {
        const refuelings = await getRefuelingsByUserId(
          ctx.user.id,
          input.limit,
          input.offset
        );
        return refuelings;
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const refueling = await getRefuelingById(input.id, ctx.user.id);
        if (!refueling) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Abastecimento não encontrado",
          });
        }
        return refueling;
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          data: refuelingInputSchema.partial(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const updated = await updateRefueling(input.id, ctx.user.id, input.data);
        if (!updated) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Abastecimento não encontrado",
          });
        }
        return updated;
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const deleted = await deleteRefueling(input.id, ctx.user.id);
        if (!deleted) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Abastecimento não encontrado",
          });
        }
        return { success: true };
      }),

    stats: protectedProcedure.query(async ({ ctx }) => {
      return await getRefuelingStats(ctx.user.id);
    }),

    uploadReceipt: protectedProcedure
      .input(
        z.object({
          refuelingId: z.number(),
          fileData: z.string(),
          fileName: z.string(),
          mimeType: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const refueling = await getRefuelingById(input.refuelingId, ctx.user.id);
        if (!refueling) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Abastecimento não encontrado",
          });
        }

        const buffer = Buffer.from(input.fileData, "base64");
        const storageKey = `receipts/${ctx.user.id}/${input.refuelingId}-${Date.now()}-${input.fileName}`;
        const { url } = await storagePut(storageKey, buffer, input.mimeType);

        const receipt = await createReceipt({
          refuelingId: input.refuelingId,
          url: url,
        });

        return receipt;
      }),

    getReceipt: protectedProcedure
      .input(z.object({ refuelingId: z.number() }))
      .query(async ({ input, ctx }) => {
        const refueling = await getRefuelingById(input.refuelingId, ctx.user.id);
        if (!refueling) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Abastecimento não encontrado",
          });
        }
        return await getReceiptByRefuelingId(input.refuelingId);
      }),

    exportCSV: protectedProcedure
      .input(
        z.object({
          startDate: z.date().optional(),
          endDate: z.date().optional(),
          plate: z.string().optional(),
        })
      )
      .query(async ({ input, ctx }) => {
        const refuelings = await getRefuelingsByUserId(ctx.user.id, 10000, 0);
        let filtered = refuelings;
        if (input.startDate) {
          filtered = filtered.filter(r => new Date(r.date) >= input.startDate!);
        }
        if (input.endDate) {
          filtered = filtered.filter(r => new Date(r.date) <= input.endDate!);
        }
        if (input.plate) {
          filtered = filtered.filter(r => r.plate === input.plate);
        }

        const headers = ["Data", "Placa", "Motorista", "Combustível", "Valor/Litro", "Litros", "Total", "Posto", "KM", "Notas"];
        const rows = filtered.map(r => [
          new Date(r.date).toLocaleDateString("pt-BR"),
          r.plate,
          (r as any).driverName || "",
          (r as any).fuelType || "",
          (r as any).pricePerLiter || "",
          r.litersRefueled,
          r.totalPrice,
          (r as any).gasStation || "",
          r.km,
          (r as any).notes || "",
        ]);

        const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n") + "\n";
        return {
          csv,
          fileName: `abastecimentos-${new Date().toISOString().split("T")[0]}.csv`,
        };
      }),

    exportJSON: protectedProcedure
      .input(
        z.object({
          startDate: z.date().optional(),
          endDate: z.date().optional(),
          plate: z.string().optional(),
        })
      )
      .query(async ({ input, ctx }) => {
        const refuelings = await getRefuelingsByUserId(ctx.user.id, 10000, 0);
        let filtered = refuelings;
        if (input.startDate) {
          filtered = filtered.filter(r => new Date(r.date) >= input.startDate!);
        }
        if (input.endDate) {
          filtered = filtered.filter(r => new Date(r.date) <= input.endDate!);
        }
        if (input.plate) {
          filtered = filtered.filter(r => r.plate === input.plate);
        }
        return {
          json: JSON.stringify(filtered, null, 2),
          fileName: `abastecimentos-${new Date().toISOString().split("T")[0]}.json`,
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;