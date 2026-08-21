import {
  computeOriginalWebhookRequestHash,
  SLATES_PROTOCOL_VERSION,
  SlatesProviderProtoHandlerManager
} from '@slates/proto';
import {
  auth,
  config,
  Slate,
  SlateContext,
  SlateLogger,
  spec,
  trigger
} from '@slates/provider';
import { describe, expect, it, vi } from 'vitest';
import z from 'zod';
import { createProviderHandler } from './index';
import { mapAction } from './spec';
import { EphemeralRequestState, State } from './state';
import { deserializeWebhookWireRequest, serializeWebhookWireRequest } from './webhook';

describe('Task 3 provider-handler webhook security boundaries', () => {
  let buildRuntime = async (
    verifyWebhook: (context: SlateContext<any, any, any>) => Promise<any>,
    security: any,
    handleRequest: (context: SlateContext<any, any, any>) => Promise<any> = async () => ({
      inputs: []
    }),
    allowedSecretRefs: any[] = [
      {
        source: 'registration',
        name: 'signing_secret',
        registrationKey: 'signing_secret',
        encoding: 'utf8'
      }
    ]
  ) => {
    let specification = spec({
      key: 'test',
      name: 'Test',
      config: config(z.object({})),
      auth: auth().addNone().output(z.object({}))
    });
    let action = trigger(specification, { key: 'delivery', name: 'Delivery' })
      .input(z.object({ candidateId: z.string().optional() }))
      .output(z.object({ type: z.string() }))
      .webhook({
        handleEvent: async () => ({ type: 'event', id: 'event', output: { type: 'event' } }),
        handleRequest,
        verifyWebhook,
        http: {
          methods: ['POST'],
          ingress: {
            kind: 'receiver_route',
            baseline: 'receiver_path_secret',
            verification: {
              mechanism: 'provider',
              baseline: 'receiver_path_secret',
              reason: 'Provider-specific verification fixture',
              allowedSecretRefs,
              rules: [
                {
                  id: 'delivery.v1',
                  phase: 'delivery',
                  when: { methods: ['POST'] },
                  verify: {
                    type: 'provider',
                    verifierId: 'notion.delivery.v1',
                    allowedSecretRefs: allowedSecretRefs.map(secretRef => secretRef.name),
                    allowedBootstrapCaptureRefs: []
                  },
                  result: { type: 'dispatch', scope: 'receiver_trigger' },
                  replay: {
                    kind: 'enforced',
                    deduplicate: {
                      source: 'header',
                      headerName: 'X-Delivery-Id',
                      ttlSeconds: 60,
                      scope: 'request'
                    }
                  }
                }
              ]
            }
          }
        }
      })
      .build();
    let slate = Slate.create({ spec: specification, triggers: [action], tools: [] });
    let manager = await createProviderHandler(slate, [], security).run();
    await SlatesProviderProtoHandlerManager.handleInput(manager, {
      jsonrpc: '2.0',
      method: 'slates/hello',
      params: { protocol: SLATES_PROTOCOL_VERSION }
    });
    await SlatesProviderProtoHandlerManager.handleInput(manager, {
      jsonrpc: '2.0',
      method: 'slates/participant.set',
      params: { participants: [{ type: 'hub', id: 'hub', name: 'Hub' }] }
    });
    return { manager, action, slate };
  };

  it('executes verification with named projection and mandatory terminal cleanup', async () => {
    let sentinel = 'task3-runtime-sentinel';
    let invoked = vi.fn();
    let clear = vi.fn();
    let { manager, action, slate } = await buildRuntime(
      async context => {
        invoked({
          config: context.config,
          auth: context.auth,
          secrets: context.secrets,
          egress: context.networkEgress,
          sideEffects: context.sideEffects
        });
        return { status: 'accepted', selection: { scope: 'receiver_trigger' } };
      },
      {
        redeemScopedInvocationGrant: async ({ envelope }: any) => ({
          bindings: {
            grantId: envelope.grantId,
            tenantId: 'tenant',
            slateInstanceId: 'instance',
            hubInvocationId: 'invocation',
            requestId: 'rpc-runtime',
            operation: 'webhook_verify',
            actionId: 'delivery',
            specHash: (mapAction(slate, action) as any).specHash,
            ruleId: 'delivery.v1',
            originalRequestHash: computeOriginalWebhookRequestHash({
              url: 'https://hooks.test',
              method: 'POST',
              headers: [],
              body: { present: false }
            }),
            dispatchRequestHash: computeOriginalWebhookRequestHash({
              url: 'https://hooks.test',
              method: 'POST',
              headers: [],
              body: { present: false }
            }),
            receiverId: 'receiver',
            receiverTriggerId: 'receiver-trigger',
            registrationStatus: 'registered',
            registrationGeneration: 1,
            registrationVersion: 1,
            issuedAtMs: 0,
            expiresAtMs: 2_000,
            authConfigId: null,
            callbackSecretIds: { signing_secret: 'secret-signing' },
            candidateBindings: []
          },
          secrets: { signing_secret: { value: sentinel } },
          clear
        }),
        now: () => 1_000
      }
    );
    let published = mapAction(slate, action) as any;
    let request = {
      url: 'https://hooks.test',
      method: 'POST' as const,
      headers: [] as [string, string][],
      body: { present: false as const }
    };
    let response = await SlatesProviderProtoHandlerManager.handleInput(manager, {
      jsonrpc: '2.0',
      id: 'rpc-runtime',
      method: 'slates/action.trigger.webhook_verify',
      invocation: {
        version: 'scoped_invocation_grant_v1',
        grantId: 'grant-runtime',
        token: 'opaque',
        requestId: 'rpc-runtime'
      },
      params: {
        actionId: 'delivery',
        specHash: published.specHash,
        ruleId: 'delivery.v1',
        requestId: 'rpc-runtime',
        originalRequest: request,
        originalRequestHash: computeOriginalWebhookRequestHash(request)
      }
    });
    expect(response).toMatchObject({ result: { status: 'accepted' } });
    expect(invoked).toHaveBeenCalledWith({
      config: {},
      auth: {},
      secrets: { signing_secret: { value: sentinel } },
      egress: 'deny_all',
      sideEffects: 'deny_all'
    });
    expect(clear).toHaveBeenCalledOnce();
  });

  it('requires an authentication config binding for auth-backed secret refs', async () => {
    let invoked = vi.fn();
    let clear = vi.fn();
    let request = {
      url: 'https://hooks.test',
      method: 'POST' as const,
      headers: [] as [string, string][],
      body: { present: false as const }
    };
    let requestHash = computeOriginalWebhookRequestHash(request);
    let security: any = { now: () => 1_000 };
    let { manager, action, slate } = await buildRuntime(
      async () => {
        invoked();
        return { status: 'accepted', selection: { scope: 'receiver_trigger' } };
      },
      security,
      undefined,
      [
        {
          source: 'auth_config',
          name: 'app_secret',
          credentialKey: 'webhookAppSecret',
          authMethods: ['token'],
          encoding: 'utf8'
        }
      ]
    );
    let published = mapAction(slate, action) as any;
    security.redeemScopedInvocationGrant = vi.fn(async ({ envelope, expected }: any) => {
      expect(expected).toMatchObject({
        callbackSecretNames: [],
        requiresAuthConfig: true
      });
      return {
        bindings: {
          grantId: envelope.grantId,
          tenantId: 'tenant',
          slateInstanceId: 'instance',
          hubInvocationId: 'invocation',
          requestId: 'rpc-auth-ref',
          operation: 'webhook_verify',
          actionId: 'delivery',
          specHash: published.specHash,
          ruleId: 'delivery.v1',
          originalRequestHash: requestHash,
          dispatchRequestHash: requestHash,
          receiverId: 'receiver',
          receiverTriggerId: 'receiver-trigger',
          registrationStatus: 'registered',
          registrationGeneration: 1,
          registrationVersion: 1,
          issuedAtMs: 0,
          expiresAtMs: 2_000,
          authConfigId: null,
          callbackSecretIds: {},
          candidateBindings: []
        },
        secrets: { app_secret: { value: 'sentinel' } },
        clear
      };
    });

    let response = await SlatesProviderProtoHandlerManager.handleInput(manager, {
      jsonrpc: '2.0',
      id: 'rpc-auth-ref',
      method: 'slates/action.trigger.webhook_verify',
      invocation: {
        version: 'scoped_invocation_grant_v1',
        grantId: 'grant-auth-ref',
        token: 'opaque',
        requestId: 'rpc-auth-ref'
      },
      params: {
        actionId: 'delivery',
        specHash: published.specHash,
        ruleId: 'delivery.v1',
        requestId: 'rpc-auth-ref',
        originalRequest: request,
        originalRequestHash: requestHash
      }
    });

    expect(response).toHaveProperty('error');
    expect(invoked).not.toHaveBeenCalled();
    expect(clear).toHaveBeenCalledOnce();
  });

  it.each([
    'provider_error',
    'invalid_result',
    'timeout',
    'cancel'
  ] as const)('cleans and redacts executable verification on %s', async outcome => {
    let sentinel = `task3-${outcome}-sentinel`;
    let clear = vi.fn();
    let controller = new AbortController();
    let invoked = vi.fn();
    let security: any = {
      operationTimeoutMs: outcome === 'timeout' ? 1 : 1_000,
      getOperationSignal: () => (outcome === 'cancel' ? controller.signal : undefined),
      now: () => 1_000
    };
    let { manager, action, slate } = await buildRuntime(async context => {
      invoked();
      if (outcome === 'provider_error') throw new Error(`failure ${sentinel}`);
      if (outcome === 'invalid_result') return { status: 'accepted', secret: sentinel };
      await new Promise<void>(resolve => {
        context.abortSignal?.addEventListener('abort', () => resolve(), { once: true });
        if (outcome === 'cancel') controller.abort();
      });
      return { status: 'accepted', selection: { scope: 'receiver_trigger' } };
    }, security);
    let published = mapAction(slate, action) as any;
    let request = {
      url: 'https://hooks.test',
      method: 'POST' as const,
      headers: [] as [string, string][],
      body: { present: false as const }
    };
    security.redeemScopedInvocationGrant = async ({ envelope }: any) => ({
      bindings: {
        grantId: envelope.grantId,
        tenantId: 'tenant',
        slateInstanceId: 'instance',
        hubInvocationId: 'invocation',
        requestId: 'rpc-outcome',
        operation: 'webhook_verify',
        actionId: 'delivery',
        specHash: published.specHash,
        ruleId: 'delivery.v1',
        originalRequestHash: computeOriginalWebhookRequestHash(request),
        dispatchRequestHash: computeOriginalWebhookRequestHash(request),
        receiverId: 'receiver',
        receiverTriggerId: 'receiver-trigger',
        registrationStatus: 'registered',
        registrationGeneration: 1,
        registrationVersion: 1,
        issuedAtMs: 0,
        expiresAtMs: 2_000,
        authConfigId: null,
        callbackSecretIds: { signing_secret: 'secret-signing' },
        candidateBindings: []
      },
      secrets: { signing_secret: { value: sentinel } },
      clear
    });
    let consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    let response = await SlatesProviderProtoHandlerManager.handleInput(manager, {
      jsonrpc: '2.0',
      id: 'rpc-outcome',
      method: 'slates/action.trigger.webhook_verify',
      invocation: {
        version: 'scoped_invocation_grant_v1',
        grantId: 'grant-outcome',
        token: 'opaque',
        requestId: 'rpc-outcome'
      },
      params: {
        actionId: 'delivery',
        specHash: published.specHash,
        ruleId: 'delivery.v1',
        requestId: 'rpc-outcome',
        originalRequest: request,
        originalRequestHash: computeOriginalWebhookRequestHash(request)
      }
    });
    await new Promise(resolve => setTimeout(resolve, 15));
    expect(response).toHaveProperty('error');
    expect(invoked).toHaveBeenCalledOnce();
    expect(clear).toHaveBeenCalledOnce();
    expect(JSON.stringify(response)).not.toContain(sentinel);
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(sentinel);
    consoleError.mockRestore();
  });

  it('rejects undeclared secret projections before provider execution', async () => {
    let invoked = vi.fn();
    let clear = vi.fn();
    let security: any = { now: () => 1_000 };
    let { manager, action, slate } = await buildRuntime(async () => {
      invoked();
      return { status: 'accepted', selection: { scope: 'receiver_trigger' } };
    }, security);
    let published = mapAction(slate, action) as any;
    let request = {
      url: 'https://hooks.test',
      method: 'POST' as const,
      headers: [] as [string, string][],
      body: { present: false as const }
    };
    security.redeemScopedInvocationGrant = async ({ envelope }: any) => ({
      bindings: {
        grantId: envelope.grantId,
        tenantId: 'tenant',
        slateInstanceId: 'instance',
        hubInvocationId: 'invocation',
        requestId: 'rpc-ref',
        operation: 'webhook_verify',
        actionId: 'delivery',
        specHash: published.specHash,
        ruleId: 'delivery.v1',
        originalRequestHash: computeOriginalWebhookRequestHash(request),
        dispatchRequestHash: computeOriginalWebhookRequestHash(request),
        receiverId: 'receiver',
        receiverTriggerId: 'receiver-trigger',
        registrationStatus: 'registered',
        registrationGeneration: 1,
        registrationVersion: 1,
        issuedAtMs: 0,
        expiresAtMs: 2_000,
        authConfigId: null,
        callbackSecretIds: {
          signing_secret: 'secret-signing',
          undeclared: 'secret-undeclared'
        },
        candidateBindings: []
      },
      secrets: {
        signing_secret: { value: 'allowed' },
        undeclared: { value: 'forbidden' }
      },
      clear
    });
    let response = await SlatesProviderProtoHandlerManager.handleInput(manager, {
      jsonrpc: '2.0',
      id: 'rpc-ref',
      method: 'slates/action.trigger.webhook_verify',
      invocation: {
        version: 'scoped_invocation_grant_v1',
        grantId: 'grant-ref',
        token: 'opaque',
        requestId: 'rpc-ref'
      },
      params: {
        actionId: 'delivery',
        specHash: published.specHash,
        ruleId: 'delivery.v1',
        requestId: 'rpc-ref',
        originalRequest: request,
        originalRequestHash: computeOriginalWebhookRequestHash(request)
      }
    });
    expect(response).toHaveProperty('error');
    expect(invoked).not.toHaveBeenCalled();
    expect(clear).toHaveBeenCalledOnce();
  });

  it.each([
    'receiverId',
    'receiverTriggerId',
    'registrationGeneration',
    'registrationVersion',
    'specHash',
    'ruleId',
    'originalRequestHash',
    'dispatchRequestHash'
  ] as const)('rejects a grant missing mandatory %s before provider execution', async missing => {
    let invoked = vi.fn();
    let clear = vi.fn();
    let security: any = {};
    let { manager, action, slate } = await buildRuntime(async () => {
      invoked();
      return { status: 'accepted', selection: { scope: 'receiver_trigger' } };
    }, security);
    let published = mapAction(slate, action) as any;
    let request = {
      url: 'https://hooks.test',
      method: 'POST' as const,
      headers: [] as [string, string][],
      body: { present: false as const }
    };
    let bindings: Record<string, unknown> = {
      grantId: 'grant-missing',
      tenantId: 'tenant',
      slateInstanceId: 'instance',
      hubInvocationId: 'invocation',
      requestId: 'rpc-missing',
      operation: 'webhook_verify',
      actionId: 'delivery',
      specHash: published.specHash,
      ruleId: 'delivery.v1',
      originalRequestHash: computeOriginalWebhookRequestHash(request),
      dispatchRequestHash: computeOriginalWebhookRequestHash(request),
      receiverId: 'receiver',
      receiverTriggerId: 'receiver-trigger',
      registrationStatus: 'registered',
      registrationGeneration: 1,
      registrationVersion: 1,
      issuedAtMs: 0,
      expiresAtMs: 2_000,
      authConfigId: null,
      callbackSecretIds: { signing_secret: 'secret-signing' },
      candidateBindings: []
    };
    delete bindings[missing];
    security.redeemScopedInvocationGrant = async () => ({
      bindings,
      secrets: { signing_secret: { value: 'sentinel' } },
      clear
    });
    let response = await SlatesProviderProtoHandlerManager.handleInput(manager, {
      jsonrpc: '2.0',
      id: 'rpc-missing',
      method: 'slates/action.trigger.webhook_verify',
      invocation: {
        version: 'scoped_invocation_grant_v1',
        grantId: 'grant-missing',
        token: 'opaque',
        requestId: 'rpc-missing'
      },
      params: {
        actionId: 'delivery',
        specHash: published.specHash,
        ruleId: 'delivery.v1',
        requestId: 'rpc-missing',
        originalRequest: request,
        originalRequestHash: computeOriginalWebhookRequestHash(request)
      }
    });
    expect(response).toHaveProperty('error');
    expect(invoked).not.toHaveBeenCalled();
    expect(clear).toHaveBeenCalledOnce();
  });
  it('round-trips OPTIONS, ordered duplicate headers, and binary bodies', () => {
    let request = {
      url: 'https://hooks.test/inbound',
      method: 'OPTIONS' as const,
      headers: [
        ['X-Header', 'one'],
        ['X-Header', 'two']
      ] as [string, string][],
      body: { present: true as const, base64: Buffer.from([0, 255, 1]).toString('base64') }
    };
    expect(deserializeWebhookWireRequest(serializeWebhookWireRequest(request))).toEqual(
      request
    );
  });

  it('executes accepted-only exhaustive mapping with complete triples and deny-all authority', async () => {
    let clear = vi.fn();
    let mapped = vi.fn(async (context: SlateContext<any, any, any>) => {
      expect(context.networkEgress).toBe('deny_all');
      expect(context.sideEffects).toBe('deny_all');
      expect(context.config).toEqual({});
      expect(context.auth).toEqual({});
      return {
        inputs: [
          { candidateId: 'candidate-1', type: 'one' },
          { candidateId: 'candidate-2', type: 'two' }
        ]
      };
    });
    let security: any = { now: () => 1_000 };
    let { manager, action, slate } = await buildRuntime(
      async () => ({ status: 'accepted', selection: { scope: 'receiver_trigger' } }),
      security,
      mapped
    );
    let request = {
      url: 'https://hooks.test/mapping',
      method: 'POST' as const,
      headers: [] as [string, string][],
      body: { present: false as const }
    };
    let requestHash = computeOriginalWebhookRequestHash(request);
    let candidates = [
      {
        candidateId: 'candidate-1',
        index: 0,
        bindingHash: 'a'.repeat(64),
        deliveryIds: ['delivery-1']
      },
      {
        candidateId: 'candidate-2',
        index: 1,
        bindingHash: 'b'.repeat(64),
        deliveryIds: ['delivery-2']
      }
    ];
    let published = mapAction(slate, action) as any;
    security.redeemScopedInvocationGrant = async ({ envelope }: any) => ({
      bindings: {
        grantId: envelope.grantId,
        tenantId: 'tenant',
        slateInstanceId: 'instance',
        hubInvocationId: 'mapping-invocation',
        requestId: 'rpc-mapping',
        operation: 'webhook_handle',
        actionId: 'delivery',
        specHash: published.specHash,
        ruleId: 'delivery.v1',
        originalRequestHash: requestHash,
        dispatchRequestHash: requestHash,
        receiverId: 'receiver',
        receiverTriggerId: 'receiver-trigger',
        registrationStatus: 'registered',
        registrationGeneration: 1,
        registrationVersion: 1,
        issuedAtMs: 0,
        expiresAtMs: 2_000,
        authConfigId: null,
        callbackSecretIds: {},
        candidateBindings: candidates
      },
      secrets: {},
      clear
    });
    let response = await SlatesProviderProtoHandlerManager.handleInput(manager, {
      jsonrpc: '2.0',
      id: 'rpc-mapping',
      method: 'slates/action.trigger.webhook_handle',
      invocation: {
        version: 'scoped_invocation_grant_v1',
        grantId: 'grant-mapping',
        token: 'opaque',
        requestId: 'rpc-mapping'
      },
      params: {
        actionId: 'delivery',
        request,
        specHash: published.specHash,
        ruleId: 'delivery.v1',
        triggerId: 'receiver-trigger',
        originalRequestHash: requestHash,
        dispatchRequestHash: requestHash,
        itemAdapterId: 'graph.body_value.v1',
        selectedItems: candidates
      }
    });
    expect(response).toMatchObject({
      result: {
        inputs: [{ candidateId: 'candidate-1' }, { candidateId: 'candidate-2' }]
      }
    });
    expect(mapped).toHaveBeenCalledOnce();
    expect(clear).toHaveBeenCalledOnce();
  });

  it('exposes only an immutable named secret projection and clears it terminally', () => {
    let context = new SlateContext(
      {},
      { requestId: 'rpc-1' },
      {},
      {} as never,
      new SlateLogger(),
      {
        secrets: { allowed: { value: 'sentinel' } },
        networkEgress: 'deny_all'
      }
    );
    expect(context.config).toEqual({});
    expect(context.auth).toEqual({});
    expect(context.secrets).toEqual({ allowed: { value: 'sentinel' } });
    expect(context.networkEgress).toBe('deny_all');
    expect(() => ((context.secrets.allowed as any).value = 'changed')).toThrow();
    context.clearScopedInvocation();
    expect(context.secrets).toEqual({});
  });

  it('never stores classified request state in reusable State and cleans every outcome', async () => {
    let reusable = new State({ session: 'ordinary' });
    let ephemeral = new EphemeralRequestState<{ sentinel: string }>();
    let invoked = vi.fn();
    await expect(
      ephemeral.run('rpc-1', { sentinel: 'secret' }, async value => {
        invoked(value);
        throw new Error('provider error');
      })
    ).rejects.toThrow('provider error');
    expect(invoked).toHaveBeenCalledWith({ sentinel: 'secret' });
    expect(ephemeral.size).toBe(0);
    expect(reusable.get()).toEqual({ session: 'ordinary' });
  });
});
