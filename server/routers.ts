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
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  refueling: router({
    // Criar novo abastecimento
    create: protectedProcedure
      .input(refuelingInputSchema)
      .mutation(async ({ input, ctx }) => {
        const refueling = await createRefueling({
          userId: ctx.user.id,
          date: input.date,
          plate: input.plate,
          driverName: input.driverName,
          fuelType: input.fuelType,
          pricePerLiter: input.pricePerLiter.toString(),
          litersRefueled: input.litersRefueled.toString(),
          totalPrice: input.totalPrice.toString(),
          gasStation: input.gasStation,
          km: input.km,
          notes: input.notes,
        });
        return refueling;
      }),

    // Listar abastecimentos do usuário
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

    // Obter detalhes de um abastecimento
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

    // Atualizar abastecimento
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          data: refuelingInputSchema.partial(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const updateData: any = { ...input.data };
        if (updateData.pricePerLiter !== undefined) {
          updateData.pricePerLiter = updateData.pricePerLiter.toString();
        }
        if (updateData.litersRefueled !== undefined) {
          updateData.litersRefueled = updateData.litersRefueled.toString();
        }
        const updated = await updateRefueling(input.id, ctx.user.id, updateData);
        if (!updated) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Abastecimento não encontrado",
          });
        }
        return updated;
      }),

    // Deletar abastecimento
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

    // Obter estatísticas do usuário
    stats: protectedProcedure.query(async ({ ctx }) => {
      return await getRefuelingStats(ctx.user.id);
    }),

    // Upload de cupom fiscal
    uploadReceipt: protectedProcedure
      .input(
        z.object({
          refuelingId: z.number(),
          fileData: z.string(), // base64 encoded
          fileName: z.string(),
          mimeType: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // Verificar se o abastecimento pertence ao usuário
        const refueling = await getRefuelingById(input.refuelingId, ctx.user.id);
        if (!refueling) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Abastecimento não encontrado",
          });
        }

        // Converter base64 para buffer
        const buffer = Buffer.from(input.fileData, "base64");

        // Fazer upload para S3
        const storageKey = `receipts/${ctx.user.id}/${input.refuelingId}-${Date.now()}-${input.fileName}`;
        const { key, url } = await storagePut(
          storageKey,
          buffer,
          input.mimeType
        );

        // Salvar referência no banco de dados
        const receipt = await createReceipt({
          refuelingId: input.refuelingId,
          storageKey: key,
          storageUrl: url,
          fileName: input.fileName,
          mimeType: input.mimeType,
          fileSize: buffer.length,
        });

        return receipt;
      }),

    // Obter cupom de um abastecimento
    getReceipt: protectedProcedure
      .input(z.object({ refuelingId: z.number() }))
      .query(async ({ input, ctx }) => {
        // Verificar se o abastecimento pertence ao usuário
        const refueling = await getRefuelingById(input.refuelingId, ctx.user.id);
        if (!refueling) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Abastecimento não encontrado",
          });
        }

        const receipt = await getReceiptByRefuelingId(input.refuelingId);
        return receipt;
      }),

    // Exportar dados em CSV
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

        // Filtrar por datas e placa se fornecido
        let filtered = refuelings;
        if (input.startDate) {
          filtered = filtered.filter(
            (r) => new Date(r.date) >= input.startDate!
          );
        }
        if (input.endDate) {
          filtered = filtered.filter(
            (r) => new Date(r.date) <= input.endDate!
          );
        }
        if (input.plate) {
          filtered = filtered.filter((r) => r.plate === input.plate);
        }

        // Gerar CSV
        const headers = [
          "Data",
          "Placa",
          "Tipo Combustível",
          "Valor por Litro",
          "Litros Abastecidos",
          "Valor Total",
          "Posto",
          "KM",
          "Notas",
        ];

        const rows = filtered.map((r) => [
          new Date(r.date).toLocaleDateString("pt-BR"),
          r.plate,
          r.fuelType,
          r.pricePerLiter,
          r.litersRefueled,
          r.totalPrice,
          r.gasStation,
          r.km,
          r.notes || "",
        ]);

        const csv =
          [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n") +
          "\n";

        return {
          csv,
          fileName: `abastecimentos-${new Date().toISOString().split("T")[0]}.csv`,
        };
      }),

    // Exportar dados em JSON
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

        // Filtrar por datas e placa se fornecido
        let filtered = refuelings;
        if (input.startDate) {
          filtered = filtered.filter(
            (r) => new Date(r.date) >= input.startDate!
          );
        }
        if (input.endDate) {
          filtered = filtered.filter(
            (r) => new Date(r.date) <= input.endDate!
          );
        }
        if (input.plate) {
          filtered = filtered.filter((r) => r.plate === input.plate);
        }

        const json = JSON.stringify(filtered, null, 2);

        return {
          json,
          fileName: `abastecimentos-${new Date().toISOString().split("T")[0]}.json`,
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
