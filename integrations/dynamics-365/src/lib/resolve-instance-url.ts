export let resolveDynamicsInstanceUrl = (ctx: {
  auth?: { instanceUrl?: unknown } | null;
  config?: { instanceUrl?: unknown } | null;
}) => {
  let authInstanceUrl = ctx.auth?.instanceUrl;
  if (typeof authInstanceUrl === 'string' && authInstanceUrl.trim().length > 0) {
    return authInstanceUrl.replace(/\/+$/, '');
  }

  let configInstanceUrl = ctx.config?.instanceUrl;
  if (typeof configInstanceUrl === 'string' && configInstanceUrl.trim().length > 0) {
    return configInstanceUrl.replace(/\/+$/, '');
  }

  throw new Error(
    'Missing Dynamics 365 instanceUrl. Run OAuth auth setup to discover it automatically, or set config.instanceUrl for client-credentials use.'
  );
};
