import { Client } from './client';
export const createClient = (ctx: {
  auth: { token: string; baseUrl?: string };
  config: { organizationName?: string; baseUrl?: string };
  input?: unknown;
}) => {
  const input = ctx.input;
  const selected =
    input &&
    typeof input === 'object' &&
    'organizationName' in input &&
    typeof input.organizationName === 'string'
      ? input.organizationName
      : undefined;
  return new Client({
    token: ctx.auth.token,
    baseUrl: ctx.auth.baseUrl ?? ctx.config.baseUrl,
    organizationName: selected ?? ctx.config.organizationName
  });
};
