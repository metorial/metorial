import { XeroClient } from './client';

export let createClientFromContext = (ctx: {
  auth: { token: string; tenantId?: string };
}): XeroClient => {
  return new XeroClient({
    token: ctx.auth.token,
    tenantId: ctx.auth.tenantId
  });
};
