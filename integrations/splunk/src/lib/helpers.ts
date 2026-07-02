import { SplunkClient } from './client';

export let createSplunkClient = (ctx: {
  config: { host: string; managementPort: string; hecPort: string; scheme: string };
  auth: { token: string; hecToken?: string };
}): SplunkClient => {
  return new SplunkClient({
    token: ctx.auth.token,
    hecToken: ctx.auth.hecToken,
    host: ctx.config.host,
    managementPort: ctx.config.managementPort,
    hecPort: ctx.config.hecPort,
    scheme: ctx.config.scheme
  });
};
