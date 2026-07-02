import { Client } from './client';

export let createClient = (ctx: {
  auth: { token: string; linkname: string };
  config: { domain: string };
}) => {
  return new Client({
    token: ctx.auth.token,
    linkname: ctx.auth.linkname,
    domain: ctx.config.domain
  });
};

export let searchQuerySchema = (_moduleName: string) => ({
  group: {
    operator: 'AND' as const,
    rules: [] as Array<{
      moduleName: string;
      field: { fieldName: string };
      condition: string;
      data: string;
    }>
  }
});
