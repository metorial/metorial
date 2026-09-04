import { QuickBooksClient } from './client';
import { quickBooksServiceError } from './errors';

export interface ContextLike {
  auth: {
    token: string;
    realmId: string;
    environment: 'sandbox' | 'production';
  };
}

export let createClientFromContext = (ctx: ContextLike): QuickBooksClient => {
  if (!ctx.auth.realmId) {
    throw quickBooksServiceError(
      'QuickBooks company Realm ID is missing. Reauthorize the QuickBooks connection.'
    );
  }

  return new QuickBooksClient({
    token: ctx.auth.token,
    companyId: ctx.auth.realmId,
    environment: ctx.auth.environment
  });
};
