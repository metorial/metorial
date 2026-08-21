import { computeOriginalWebhookRequestHash } from '@slates/proto';
import { auth, config, Slate, spec, trigger } from '@slates/provider';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { SlatesProtocolClient } from './client';
import { createSlatesClient } from './index';
import { createLocalSlateTransport, sendScopedWithTermination } from './transport';

let client = () =>
  new SlatesProtocolClient({
    transport: { send: vi.fn(async () => []) }
  });

let webhookAction = (capabilities: Record<string, boolean>) =>
  ({
    type: 'action.trigger',
    capabilities,
    invocation: { type: 'webhook' }
  }) as any;

let createMethodAwareWebhookSlate = (seenSecrets: Record<string, string>[]) => {
  let authentication = auth<{
    oauthClientSecret: string;
    authConfigSecret: string;
  }>()
    .output(
      z.object({
        oauthClientSecret: z.string(),
        authConfigSecret: z.string()
      })
    )
    .addTokenAuth({
      type: 'auth.token',
      key: 'oauth',
      name: 'OAuth fixture',
      inputSchema: z.object({}),
      getOutput: async () => ({
        output: { oauthClientSecret: '', authConfigSecret: '' }
      })
    })
    .addTokenAuth({
      type: 'auth.token',
      key: 'token',
      name: 'Token fixture',
      inputSchema: z.object({}),
      getOutput: async () => ({
        output: { oauthClientSecret: '', authConfigSecret: '' }
      })
    });
  let specification = spec({
    key: 'method-aware-webhook',
    name: 'Method-aware webhook',
    config: config(z.object({})),
    auth: authentication
  });
  let action = trigger(specification, { key: 'delivery', name: 'Delivery' })
    .input(z.object({ value: z.string() }))
    .output(z.object({ type: z.string(), value: z.string() }))
    .webhook({
      http: {
        methods: ['POST'],
        ingress: {
          kind: 'receiver_route',
          baseline: 'receiver_path_secret',
          verification: {
            mechanism: 'provider',
            baseline: 'receiver_path_secret',
            reason: 'Exercises method-aware local secret projection.',
            allowedSecretRefs: [
              {
                source: 'oauth_credentials',
                name: 'app_secret',
                credentialKey: 'oauthClientSecret',
                authMethods: ['oauth'],
                encoding: 'utf8'
              },
              {
                source: 'auth_config',
                name: 'app_secret',
                credentialKey: 'authConfigSecret',
                authMethods: ['token'],
                encoding: 'utf8'
              },
              {
                source: 'generated',
                name: 'verify_token',
                binding: 'receiver_trigger',
                encoding: 'utf8'
              },
              {
                source: 'callback_secret',
                name: 'callback_signing_secret',
                callbackSecretKey: 'signingSecret',
                encoding: 'utf8'
              }
            ],
            rules: [
              {
                id: 'delivery.v1',
                phase: 'delivery',
                when: { methods: ['POST'] },
                verify: {
                  type: 'provider',
                  verifierId: 'notion.delivery.v1',
                  allowedSecretRefs: ['app_secret', 'verify_token', 'callback_signing_secret'],
                  allowedBootstrapCaptureRefs: []
                },
                result: { type: 'dispatch', scope: 'receiver_trigger' },
                replay: {
                  kind: 'enforced',
                  deduplicate: {
                    source: 'header',
                    headerName: 'x-delivery-id',
                    ttlSeconds: 60,
                    scope: 'request'
                  }
                }
              }
            ]
          }
        }
      },
      verifyWebhook: async context => {
        seenSecrets.push(
          Object.fromEntries(
            Object.entries(context.secrets).map(([name, secret]) => [name, secret.value])
          )
        );
        return { status: 'accepted', selection: { scope: 'receiver_trigger' } };
      },
      handleRequest: async () => ({ inputs: [{ value: 'handled' }] }),
      handleEvent: async context => ({
        type: 'delivery',
        id: 'delivery',
        output: { type: 'delivery', value: context.input.value }
      })
    })
    .build();

  return Slate.create({ spec: specification, tools: [], triggers: [action] });
};

let verifyLocally = async (
  client: ReturnType<typeof createSlatesClient>,
  requestId: string
) => {
  let { action } = await client.getAction('delivery');
  if (action.type !== 'action.trigger' || !action.specHash) {
    throw new Error('Method-aware webhook action has no spec hash');
  }
  let originalRequest = {
    url: 'https://hooks.test/receiver-secret',
    method: 'POST' as const,
    headers: [['x-delivery-id', requestId]] as [string, string][],
    body: { present: false as const }
  };
  return client.verifyTriggerWebhook(
    {
      actionId: 'delivery',
      specHash: action.specHash,
      ruleId: 'delivery.v1',
      requestId,
      originalRequest,
      originalRequestHash: computeOriginalWebhookRequestHash(originalRequest)
    },
    {
      version: 'scoped_invocation_grant_v1',
      grantId: `grant-${requestId}`,
      token: 'local-only',
      requestId
    }
  );
};

describe('Task 3 client webhook capability negotiation', () => {
  it.each([
    ['oauth', 'oauth-secret'],
    ['token', 'auth-config-secret']
  ] as const)('resolves duplicate named credentials through the selected %s method', async (authenticationMethodId, expectedAppSecret) => {
    let seenSecrets: Record<string, string>[] = [];
    let slate = createMethodAwareWebhookSlate(seenSecrets);
    let client = createSlatesClient({
      transport: createLocalSlateTransport({
        slate,
        scopedState: {
          authenticationMethodId,
          auth: {
            oauthClientSecret: 'oauth-secret',
            authConfigSecret: 'auth-config-secret'
          },
          secrets: {
            app_secret: 'must-not-bypass-auth-selection',
            verify_token: 'generated-token',
            signingSecret: 'callback-secret'
          }
        }
      }),
      state: {
        config: {},
        auth: {
          authenticationMethodId,
          output: {
            oauthClientSecret: 'oauth-secret',
            authConfigSecret: 'auth-config-secret'
          }
        }
      }
    });

    await expect(verifyLocally(client, `verify-${authenticationMethodId}`)).resolves.toEqual({
      status: 'accepted',
      selection: { scope: 'receiver_trigger' }
    });
    expect(seenSecrets).toEqual([
      {
        app_secret: expectedAppSecret,
        callback_signing_secret: 'callback-secret',
        verify_token: 'generated-token'
      }
    ]);
  });

  it('fails closed when an auth-backed named credential has no selected method', async () => {
    let seenSecrets: Record<string, string>[] = [];
    let slate = createMethodAwareWebhookSlate(seenSecrets);
    let client = createSlatesClient({
      transport: createLocalSlateTransport({
        slate,
        scopedState: {
          auth: {
            oauthClientSecret: 'oauth-secret',
            authConfigSecret: 'auth-config-secret'
          },
          secrets: {
            app_secret: 'must-not-bypass-auth-selection',
            verify_token: 'generated-token',
            signingSecret: 'callback-secret'
          }
        }
      }),
      state: { config: {} }
    });

    await expect(verifyLocally(client, 'verify-no-method')).rejects.toMatchObject({
      code: 'internal.unexpected',
      kind: 'internal'
    });
    expect(seenSecrets).toEqual([]);
  });

  it('does not infer verification from route presence', async () => {
    let subject = client();
    vi.spyOn(subject, 'identify').mockResolvedValue({
      capabilities: {
        webhookActionSpecHashV1: true,
        webhookVerificationRulesV1: true,
        webhookWireV1: true,
        scopedInvocationGrantV1: true,
        webhookSecretNegotiationV1: true,
        webhookInboundVerificationV1: true,
        webhookInboundBootstrapCaptureV1: true
      }
    } as any);
    vi.spyOn(subject, 'getAction').mockResolvedValue({ action: webhookAction({}) });
    await expect(subject.negotiateWebhookCapabilities('webhook.delivery')).resolves.toEqual({
      registration: {
        status: 'fail_closed',
        code: 'webhook_registration_capabilities_inconsistent'
      },
      verification: {
        status: 'fail_closed',
        code: 'webhook_verification_capabilities_inconsistent'
      },
      bootstrapCapture: {
        status: 'fail_closed',
        code: 'webhook_bootstrap_capabilities_inconsistent'
      }
    });
  });

  it('enables each v1 operation only when provider and action advertise it', async () => {
    let subject = client();
    vi.spyOn(subject, 'identify').mockResolvedValue({
      capabilities: {
        webhookActionSpecHashV1: true,
        webhookVerificationRulesV1: true,
        webhookWireV1: true,
        scopedInvocationGrantV1: true,
        webhookSecretNegotiationV1: true,
        webhookInboundVerificationV1: true,
        webhookInboundBootstrapCaptureV1: true
      }
    } as any);
    vi.spyOn(subject, 'getAction').mockResolvedValue({
      action: webhookAction({
        webhookSecretNegotiationV1: true,
        webhookInboundVerificationV1: true,
        webhookInboundBootstrapCaptureV1: true
      })
    });
    await expect(subject.negotiateWebhookCapabilities('webhook.delivery')).resolves.toEqual({
      registration: { status: 'v1' },
      verification: { status: 'v1' },
      bootstrapCapture: { status: 'v1' }
    });
  });

  it.each([
    [
      'provider verifier only',
      { scopedInvocationGrantV1: true, webhookInboundVerificationV1: true },
      {},
      'verification',
      'webhook_verification_capabilities_inconsistent'
    ],
    [
      'action verifier only',
      { scopedInvocationGrantV1: true },
      { webhookInboundVerificationV1: true },
      'verification',
      'webhook_verification_capabilities_inconsistent'
    ],
    [
      'verifier without scoped grants',
      { webhookInboundVerificationV1: true },
      { webhookInboundVerificationV1: true },
      'verification',
      'webhook_verification_capabilities_inconsistent'
    ],
    [
      'provider bootstrap only',
      {
        scopedInvocationGrantV1: true,
        webhookInboundVerificationV1: true,
        webhookInboundBootstrapCaptureV1: true
      },
      { webhookInboundVerificationV1: true },
      'bootstrapCapture',
      'webhook_bootstrap_capabilities_inconsistent'
    ],
    [
      'action bootstrap only',
      { scopedInvocationGrantV1: true, webhookInboundVerificationV1: true },
      {
        webhookInboundVerificationV1: true,
        webhookInboundBootstrapCaptureV1: true
      },
      'bootstrapCapture',
      'webhook_bootstrap_capabilities_inconsistent'
    ],
    [
      'registration mismatch',
      { scopedInvocationGrantV1: true, webhookSecretNegotiationV1: true },
      {},
      'registration',
      'webhook_registration_capabilities_inconsistent'
    ]
  ] as const)('fails closed for partial advertisement: %s', async (_name, providerCapabilities, actionCapabilities, operation, code) => {
    let subject = client();
    vi.spyOn(subject, 'identify').mockResolvedValue({
      capabilities: providerCapabilities
    } as any);
    vi.spyOn(subject, 'getAction').mockResolvedValue({
      action: webhookAction(actionCapabilities as Record<string, boolean>)
    });
    let decision = await subject.negotiateWebhookCapabilities('webhook.delivery');
    expect(decision[operation]).toEqual({ status: 'fail_closed', code });
  });

  it('keeps explicit legacy verification only when both verifier advertisements are absent', async () => {
    let subject = client();
    vi.spyOn(subject, 'identify').mockResolvedValue({
      capabilities: { scopedInvocationGrantV1: true }
    } as any);
    vi.spyOn(subject, 'getAction').mockResolvedValue({ action: webhookAction({}) });
    await expect(
      subject.negotiateWebhookCapabilities('webhook.delivery')
    ).resolves.toMatchObject({
      verification: { status: 'legacy', code: 'capability_absent' }
    });
  });

  it('never invokes transport or recommends legacy for partial verifier advertisement', async () => {
    let subject = client();
    vi.spyOn(subject, 'identify').mockResolvedValue({
      capabilities: { webhookInboundVerificationV1: true }
    } as any);
    vi.spyOn(subject, 'getAction').mockResolvedValue({
      action: webhookAction({ webhookInboundVerificationV1: true })
    });
    let send = vi.spyOn(subject.transport, 'send');
    await expect(
      subject.verifyTriggerWebhook(
        {
          actionId: 'webhook.delivery',
          specHash: 'a'.repeat(64),
          ruleId: 'delivery.v1',
          requestId: 'rpc-partial',
          originalRequest: {
            url: 'https://hooks.test',
            method: 'POST',
            headers: [],
            body: { present: false }
          },
          originalRequestHash: 'b'.repeat(64)
        },
        {
          version: 'scoped_invocation_grant_v1',
          grantId: 'grant-partial',
          token: 'opaque',
          requestId: 'rpc-partial'
        }
      )
    ).rejects.toThrow('webhook_verification_capabilities_inconsistent');
    expect(send).not.toHaveBeenCalled();
  });

  it('has an explicit legacy registration fallback but no secret-bearing verify fallback', async () => {
    let subject = client();
    vi.spyOn(subject, 'identify').mockResolvedValue({ capabilities: undefined } as any);
    vi.spyOn(subject, 'getAction').mockResolvedValue({ action: webhookAction({}) });
    let send = vi.spyOn(subject.transport, 'send');
    await expect(
      subject.verifyTriggerWebhook(
        {
          actionId: 'webhook.delivery',
          specHash: 'a'.repeat(64),
          ruleId: 'delivery.v1',
          requestId: 'rpc-1',
          originalRequest: {
            url: 'https://hooks.test',
            method: 'POST',
            headers: [],
            body: { present: false }
          },
          originalRequestHash: 'b'.repeat(64)
        },
        {
          version: 'scoped_invocation_grant_v1',
          grantId: 'grant-1',
          token: 'opaque',
          requestId: 'rpc-1'
        }
      )
    ).rejects.toThrow('explicit legacy Hub fallback');
    expect(send).not.toHaveBeenCalled();
  });

  it('terminates a non-cooperative scoped transport before returning a timeout', async () => {
    let sendScoped = vi.fn(() => new Promise<never>(() => {}));
    let terminateScoped = vi.fn(async ({ requestId }: { requestId: string }) => ({
      status: 'terminated' as const,
      requestId
    }));

    await expect(
      sendScopedWithTermination({
        transport: {
          send: vi.fn(async () => []),
          sendScoped,
          terminateScoped,
          scopedTimeoutMs: 1
        },
        requestId: 'rpc-timeout',
        messages: []
      })
    ).rejects.toThrow('timed out after confirmed termination');

    expect(sendScoped).toHaveBeenCalledWith({
      requestId: 'rpc-timeout',
      messages: []
    });
    expect(terminateScoped).toHaveBeenCalledWith({
      requestId: 'rpc-timeout',
      reason: 'timeout'
    });
  });

  it('fails closed when scoped transport termination acknowledges another request', async () => {
    await expect(
      sendScopedWithTermination({
        transport: {
          send: vi.fn(async () => []),
          sendScoped: vi.fn(() => new Promise<never>(() => {})),
          terminateScoped: vi.fn(async () => ({
            status: 'terminated' as const,
            requestId: 'rpc-other'
          })),
          scopedTimeoutMs: 1
        },
        requestId: 'rpc-timeout',
        messages: []
      })
    ).rejects.toThrow('termination was not acknowledged');
  });
});
