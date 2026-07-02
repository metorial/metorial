import { resolveDataverseInstanceUrl } from '@slates/microsoft-dataverse-recipes';

export let resolveDynamicsInstanceUrl = (ctx: {
  auth?: { dataverseInstanceUrl?: unknown } | null;
  config?: { dataverseInstanceUrl?: unknown } | null;
}) => {
  let authInstanceUrl = ctx.auth?.dataverseInstanceUrl;
  let configInstanceUrl = ctx.config?.dataverseInstanceUrl;

  return resolveDataverseInstanceUrl({
    auth: {
      instanceUrl: typeof authInstanceUrl === 'string' ? authInstanceUrl : undefined
    },
    config: {
      instanceUrl: typeof configInstanceUrl === 'string' ? configInstanceUrl : undefined
    }
  });
};
