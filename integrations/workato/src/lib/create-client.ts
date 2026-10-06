import { WorkatoClient } from './client';
export const createClient = (ctx: {
  auth: { token: string; dataCenter?: string };
  config: Record<string, unknown>;
}) =>
  new WorkatoClient({
    token: ctx.auth.token,
    dataCenter:
      ctx.auth.dataCenter ??
      (typeof ctx.config.dataCenter === 'string' ? ctx.config.dataCenter : 'us')
  });
