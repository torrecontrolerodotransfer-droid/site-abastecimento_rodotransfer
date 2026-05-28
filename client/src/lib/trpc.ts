import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
// 1. IMPORTAÇÃO DO SUPERJSON QUE ESTAVA FALTANDO
import superjson from 'superjson';
import type { AppRouter } from '../../../server/routers';

export const trpc = createTRPCReact<AppRouter>();

export const trpcClient = trpc.createClient({
  // 2. ISSO FAZ O FRONT-END E BACK-END FALAREM A MESMA LÍNGUA:
  transformer: superjson,
  links: [
    httpBatchLink({
      url: '/api/trpc',
    }),
  ],
});