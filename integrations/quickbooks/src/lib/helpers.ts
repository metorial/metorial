import { QuickBooksClient } from './client';
import { quickBooksServiceError } from './errors';

export interface ContextLike {
  config: { environment: 'sandbox' | 'production'; companyId?: string };
  auth: { token: string; realmId?: string };
}

export let createClientFromContext = (ctx: ContextLike): QuickBooksClient => {
  let companyId = ctx.config.companyId ?? ctx.auth.realmId;
  if (!companyId) {
    throw quickBooksServiceError(
      'QuickBooks companyId is required. Reauthorize OAuth to capture realmId, or set companyId in config.'
    );
  }

  return new QuickBooksClient({
    token: ctx.auth.token,
    companyId,
    environment: ctx.config.environment
  });
};
