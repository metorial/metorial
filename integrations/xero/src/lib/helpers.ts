import { XeroClient } from './client';

export let createClientFromContext = (ctx: {
  auth: { token: string; tenantId?: string };
  config: { tenantId?: string };
}): XeroClient => {
  let tenantId = ctx.config.tenantId || ctx.auth.tenantId;

  return new XeroClient({
    token: ctx.auth.token,
    tenantId
  });
};
