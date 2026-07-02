import type { FabricRuntimeConfig } from '../config';
import { resolveFabricRuntimeConfig } from '../config';
import { FabricClient, OneLakeClient } from '../lib/client';
import { fabricValidationError } from '../lib/errors';

type InvocationContext = {
  auth: Record<string, unknown>;
  config?: Record<string, unknown>;
};

export let resolveAuthToken = (
  ctx: InvocationContext,
  key: 'fabricToken' | 'storageToken'
) => {
  let token = ctx.auth[key];
  if (typeof token === 'string' && token.trim()) return token;

  throw fabricValidationError(
    key === 'storageToken'
      ? 'No Storage-audience token is available. Reconnect Microsoft Fabric with Azure Storage delegated consent.'
      : 'No Fabric API token is available. Reconnect Microsoft Fabric.'
  );
};

export let resolveRuntimeConfig = (ctx: InvocationContext): FabricRuntimeConfig =>
  resolveFabricRuntimeConfig(ctx.config);

export let createFabricClient = (ctx: InvocationContext) =>
  new FabricClient({
    token: resolveAuthToken(ctx, 'fabricToken'),
    config: resolveRuntimeConfig(ctx)
  });

export let createOneLakeClient = (ctx: InvocationContext) =>
  new OneLakeClient({
    token: resolveAuthToken(ctx, 'storageToken'),
    config: resolveRuntimeConfig(ctx)
  });

export let stringifyAttachment = (value: unknown) => JSON.stringify(value, null, 2);
