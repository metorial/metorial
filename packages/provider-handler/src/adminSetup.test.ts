import { SLATES_PROTOCOL_VERSION, SlatesProviderProtoHandlerManager } from '@slates/proto';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createProviderHandler } from './index';

let createManager = async (method: Record<string, any>) => {
  let slate = {
    spec: {
      key: 'test',
      name: 'Test',
      auth: {
        authStack: [
          {
            type: 'auth.oauth',
            key: 'oauth',
            name: 'OAuth',
            scopes: [],
            ...method
          }
        ],
        outputSchema: z.object({ token: z.string() })
      }
    },
    adapters: [],
    actions: [],
    triggerGroups: []
  };
  let manager = await createProviderHandler(slate as any, []).run();

  await SlatesProviderProtoHandlerManager.handleInput(manager, {
    jsonrpc: '2.0',
    method: 'slates/hello',
    params: { protocol: SLATES_PROTOCOL_VERSION }
  });
  await SlatesProviderProtoHandlerManager.handleInput(manager, {
    jsonrpc: '2.0',
    method: 'slates/participant.set',
    params: { participants: [] }
  });

  return manager;
};

let baseParams = {
  authenticationMethodId: 'oauth',
  state: 'state-123',
  redirectUri: 'https://hub.example/callback',
  input: { tenant: 'acme' },
  clientId: 'client-id',
  clientSecret: 'client-secret',
  scopes: ['read']
};

let getAdminAuthorizationUrl = (manager: SlatesProviderProtoHandlerManager) =>
  SlatesProviderProtoHandlerManager.handleInput(manager, {
    jsonrpc: '2.0',
    id: 'url',
    method: 'slates/auth.admin_authorization_url.get',
    params: baseParams
  });

let handleAdminCallback = (
  manager: SlatesProviderProtoHandlerManager,
  params: { code?: string; callbackParams?: Record<string, string> } = {}
) =>
  SlatesProviderProtoHandlerManager.handleInput(manager, {
    jsonrpc: '2.0',
    id: 'callback',
    method: 'slates/auth.admin_callback.handle',
    params: { ...baseParams, ...params }
  });

let regularMethod = () => ({
  getAuthorizationUrl: vi.fn(async () => ({
    url: 'https://provider.example/authorize',
    callbackState: { verifier: 'regular' }
  })),
  handleCallback: vi.fn(async () => ({ output: { token: 'user-token' } }))
});

describe('slates/auth.admin_authorization_url.get', () => {
  it('falls back to the regular authorization URL', async () => {
    let method = regularMethod();
    let manager = await createManager({ ...method, adminSetup: {} });

    expect(await getAdminAuthorizationUrl(manager)).toEqual({
      jsonrpc: '2.0',
      id: 'url',
      result: {
        authorizationUrl: 'https://provider.example/authorize',
        callbackState: { verifier: 'regular' }
      }
    });
    let { authenticationMethodId: _, ...ctx } = baseParams;
    expect(method.getAuthorizationUrl).toHaveBeenCalledWith({ ...ctx, config: {} });
  });

  it('uses the admin authorization URL override', async () => {
    let method = regularMethod();
    let adminGetAuthorizationUrl = vi.fn(async () => ({
      url: 'https://provider.example/adminconsent',
      input: { tenant: 'acme' }
    }));
    let manager = await createManager({
      ...method,
      adminSetup: { getAuthorizationUrl: adminGetAuthorizationUrl }
    });

    expect(await getAdminAuthorizationUrl(manager)).toMatchObject({
      result: {
        authorizationUrl: 'https://provider.example/adminconsent',
        input: { tenant: 'acme' }
      }
    });
    expect(adminGetAuthorizationUrl).toHaveBeenCalledWith(
      expect.objectContaining({ clientId: 'client-id', state: 'state-123', config: {} })
    );
    expect(method.getAuthorizationUrl).not.toHaveBeenCalled();
  });

  it('rejects methods without admin setup', async () => {
    let manager = await createManager(regularMethod());

    expect(await getAdminAuthorizationUrl(manager)).toMatchObject({
      error: { code: 'request.precondition_failed' }
    });
  });
});

describe('slates/auth.admin_callback.handle', () => {
  it('runs the regular callback and discards its output by default', async () => {
    let method = regularMethod();
    let manager = await createManager({ ...method, adminSetup: {} });

    expect(await handleAdminCallback(manager, { code: 'admin-code' })).toEqual({
      jsonrpc: '2.0',
      id: 'callback',
      result: {}
    });
    expect(method.handleCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'admin-code',
        clientId: 'client-id',
        callbackParams: {},
        callbackState: {},
        config: {}
      })
    );
  });

  it('requires a code when falling back to the regular callback', async () => {
    let method = regularMethod();
    let manager = await createManager({ ...method, adminSetup: {} });

    expect(await handleAdminCallback(manager)).toMatchObject({
      error: { code: 'request.bad', message: expect.stringContaining('authorization code') }
    });
    expect(method.handleCallback).not.toHaveBeenCalled();
  });

  it('uses the admin callback override without a code', async () => {
    let method = regularMethod();
    let adminHandleCallback = vi.fn(async () => ({ instructions: '1. Trust the app.' }));
    let manager = await createManager({
      ...method,
      adminSetup: { handleCallback: adminHandleCallback }
    });

    expect(
      await handleAdminCallback(manager, { callbackParams: { admin_consent: 'True' } })
    ).toMatchObject({ result: { instructions: '1. Trust the app.' } });
    expect(adminHandleCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        code: undefined,
        callbackParams: { admin_consent: 'True' },
        callbackState: {}
      })
    );
    expect(method.handleCallback).not.toHaveBeenCalled();
  });

  it('rejects methods without admin setup', async () => {
    let manager = await createManager(regularMethod());

    expect(await handleAdminCallback(manager, { code: 'admin-code' })).toMatchObject({
      error: { code: 'request.precondition_failed' }
    });
  });
});
