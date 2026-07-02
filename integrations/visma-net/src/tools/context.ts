import { VismaNetClient } from '../lib/client';
import { vismaNetServiceError } from '../lib/errors';

export type VismaNetToolContextBase = {
  auth: {
    token: string;
    tenantId?: string;
  };
  config: {
    tenantId: string;
  };
};

let validateTenantMatch = (ctx: VismaNetToolContextBase) => {
  let authTenantId = ctx.auth.tenantId?.trim();

  if (authTenantId && authTenantId !== ctx.config.tenantId.trim()) {
    throw vismaNetServiceError(
      'Configured Visma Net tenantId does not match the tenant used for OAuth. Re-authenticate or update the tenantId configuration.'
    );
  }
};

export let createVismaNetClient = (ctx: VismaNetToolContextBase) => {
  validateTenantMatch(ctx);
  return new VismaNetClient({
    token: ctx.auth.token
  });
};
