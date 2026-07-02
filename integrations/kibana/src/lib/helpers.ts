import { KibanaClient } from './client';

export let createClient = (ctx: {
  config: { kibanaUrl: string; spaceId?: string };
  auth: { token: string };
}): KibanaClient => {
  return new KibanaClient({
    kibanaUrl: ctx.config.kibanaUrl,
    token: ctx.auth.token,
    spaceId: ctx.config.spaceId
  });
};
