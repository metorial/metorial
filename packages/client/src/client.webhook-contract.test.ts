import { describe, expect, it, vi } from 'vitest';
import { SlatesProtocolClient } from './client';
import { sendScopedWithTermination } from './transport';

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

describe('Task 3 client webhook capability negotiation', () => {
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
