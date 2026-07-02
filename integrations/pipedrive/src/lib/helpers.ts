import { PipedriveClient } from './client';
import { pipedriveServiceError } from './errors';

export interface SlateContext {
  config: { companyDomain: string };
  auth: {
    token: string;
    companyDomain?: string;
    refreshToken?: string;
    expiresAt?: string;
    authType?: 'oauth' | 'api_token';
  };
}

export let createClient = (ctx: SlateContext): PipedriveClient => {
  let companyDomain = ctx.auth.companyDomain || ctx.config.companyDomain;
  if (!companyDomain) {
    throw pipedriveServiceError('companyDomain is required to call the Pipedrive API.');
  }

  let isApiToken =
    ctx.auth.authType === 'api_token' ||
    (ctx.auth.authType === undefined &&
      ctx.auth.refreshToken === undefined &&
      ctx.auth.expiresAt === undefined &&
      ctx.auth.companyDomain === undefined);

  return new PipedriveClient({
    token: ctx.auth.token,
    companyDomain,
    isApiToken
  });
};
