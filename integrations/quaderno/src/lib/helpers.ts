import { Client, type Environment } from './client';
import { invalid } from './validation';
export function createClient(ctx: {
  auth: {
    token: string;
    authMethod?: 'oauth' | 'api_key';
    environment?: Environment;
    accountName?: string;
  };
  config: { accountName?: string; environment?: Environment };
}) {
  if (
    ctx.auth.environment &&
    ctx.config.environment &&
    ctx.auth.environment !== ctx.config.environment
  )
    throw invalid(
      'The connection and configuration environments differ. Reconnect in the selected environment.'
    );
  if (
    ctx.auth.accountName &&
    ctx.config.accountName &&
    ctx.auth.accountName !== ctx.config.accountName
  )
    throw invalid(
      'The stored connection and accountName configuration refer to different accounts.'
    );
  return new Client({
    token: ctx.auth.token,
    authMethod: ctx.auth.authMethod,
    accountName: ctx.auth.accountName ?? ctx.config.accountName,
    environment: ctx.config.environment ?? ctx.auth.environment
  });
}
