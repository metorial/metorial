import { CodacyClient } from './client';

export let createClient = (ctx: {
  auth: { token: string };
  config: { baseUrl: string; provider: string; organization: string };
}): CodacyClient => {
  return new CodacyClient({
    token: ctx.auth.token,
    baseUrl: ctx.config.baseUrl,
    provider: ctx.config.provider,
    organization: ctx.config.organization
  });
};
