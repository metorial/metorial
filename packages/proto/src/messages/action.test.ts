import { describe, expect, it } from 'vitest';
import {
  slatesMessageActionTriggerWebhookBootstrapCaptureRequest,
  slatesMessageActionTriggerWebhookHandleScopedRequest,
  slatesMessageActionTriggerWebhookRegisterRequest,
  slatesMessageActionTriggerWebhookVerifyRequest,
  slatesWebhookBootstrapCaptureOutput,
  slatesWebhookVerifyOutput
} from './action';

let request = {
  url: 'https://hooks.test/inbound',
  method: 'OPTIONS' as const,
  headers: [
    ['X-Duplicate', 'one'],
    ['X-Duplicate', 'two']
  ] as [string, string][],
  body: { present: true as const, base64: Buffer.from([0, 255, 1]).toString('base64') }
};

let verifyInput = {
  actionId: 'webhook.delivery',
  specHash: 'a'.repeat(64),
  ruleId: 'bootstrap.v1',
  requestId: 'rpc-1',
  originalRequest: request,
  originalRequestHash: 'b'.repeat(64)
};

let grant = {
  version: 'scoped_invocation_grant_v1' as const,
  grantId: 'grant-1',
  token: 'opaque-token',
  requestId: 'rpc-1'
};

describe('Task 3 webhook RPC contracts', () => {
  it('preserves OPTIONS, ordered duplicate headers, and binary base64 bodies', () => {
    let parsed = slatesMessageActionTriggerWebhookVerifyRequest.parse({
      jsonrpc: '2.0',
      method: 'slates/action.trigger.webhook_verify',
      id: 'rpc-1',
      invocation: grant,
      params: verifyInput
    });
    expect(parsed.params.originalRequest).toEqual(request);
  });

  it('requires the grant and input to bind the exact JSON-RPC request ID', () => {
    expect(
      slatesMessageActionTriggerWebhookVerifyRequest.safeParse({
        jsonrpc: '2.0',
        method: 'slates/action.trigger.webhook_verify',
        id: 'other',
        invocation: grant,
        params: verifyInput
      }).success
    ).toBe(false);
  });

  it('rejects contradictory verify and bootstrap outputs', () => {
    expect(
      slatesWebhookVerifyOutput.safeParse({
        status: 'accepted',
        selection: { scope: 'receiver_trigger' },
        code: 'credential_invalid'
      }).success
    ).toBe(false);
    expect(
      slatesWebhookVerifyOutput.safeParse({
        status: 'rejected',
        code: 'credential_invalid',
        selection: { scope: 'receiver_trigger' }
      }).success
    ).toBe(false);
    expect(
      slatesWebhookBootstrapCaptureOutput.safeParse({
        status: 'rejected',
        code: 'credential_invalid',
        capturedSecrets: {}
      }).success
    ).toBe(false);
  });

  it('keeps registration public and secret-free at input', () => {
    expect(
      slatesMessageActionTriggerWebhookRegisterRequest.safeParse({
        jsonrpc: '2.0',
        method: 'slates/action.trigger.webhook_register',
        id: 'rpc-register',
        params: {
          actionId: 'webhook.delivery',
          webhookBaseUrl: 'https://hooks.test',
          capturedSecrets: { sentinel: { value: 'never', version: 1 } }
        }
      }).success
    ).toBe(false);
  });

  it('gates bootstrap and scoped mapping with strict request-only envelopes', () => {
    expect(
      slatesMessageActionTriggerWebhookBootstrapCaptureRequest.safeParse({
        jsonrpc: '2.0',
        method: 'slates/action.trigger.webhook_bootstrap_capture',
        id: 'rpc-1',
        invocation: grant,
        params: {
          ...verifyInput,
          phase: 'bootstrap',
          receiverTriggerId: 'receiver-trigger-1',
          registrationVersion: 1,
          acceptedCandidateIds: []
        }
      }).success
    ).toBe(true);
    expect(
      slatesMessageActionTriggerWebhookHandleScopedRequest.safeParse({
        jsonrpc: '2.0',
        method: 'slates/action.trigger.webhook_handle',
        id: 'rpc-1',
        invocation: grant,
        params: {
          actionId: 'webhook.delivery',
          request,
          specHash: 'a'.repeat(64),
          ruleId: 'delivery.v1',
          triggerId: 'receiver-trigger-1',
          originalRequestHash: 'b'.repeat(64),
          dispatchRequestHash: 'c'.repeat(64),
          itemAdapterId: 'graph.body_value.v1'
        }
      }).success
    ).toBe(false);
  });
});
