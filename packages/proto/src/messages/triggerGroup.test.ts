import { describe, expect, it } from 'vitest';
import { slatesTriggerGroup } from '../types';
import {
  slatesMessageTriggerGroupWebhookDeliveryAuthenticateRequest,
  slatesMessageTriggerGroupWebhookDeliveryAuthenticateResponse,
  slatesMessageTriggerGroupWebhookExpandRequest,
  slatesMessageTriggerGroupWebhookExpandResponse,
  slatesMessageTriggerGroupWebhookProcessRequest,
  slatesMessageTriggerGroupWebhookRegisterRequest,
  slatesMessageTriggerGroupWebhookRenewRequest,
  slatesMessageTriggerGroupWebhookRenewResponse,
  slatesTriggerGroupRequestsByMethod,
  slatesTriggerGroupResponsesByMethod,
  slatesTriggerGroupWebhookRegistrationResult
} from './triggerGroup';

describe('trigger lifecycle wire contracts', () => {
  it('registers additive request and response methods', () => {
    expect(slatesTriggerGroupRequestsByMethod['slates/trigger_group.webhook.expand']).toBe(
      slatesMessageTriggerGroupWebhookExpandRequest
    );
    expect(slatesTriggerGroupResponsesByMethod['slates/trigger_group.webhook.expand']).toBe(
      slatesMessageTriggerGroupWebhookExpandResponse
    );
    expect(slatesTriggerGroupRequestsByMethod['slates/trigger_group.webhook.renew']).toBe(
      slatesMessageTriggerGroupWebhookRenewRequest
    );
    expect(slatesTriggerGroupResponsesByMethod['slates/trigger_group.webhook.renew']).toBe(
      slatesMessageTriggerGroupWebhookRenewResponse
    );
    expect(
      slatesTriggerGroupRequestsByMethod['slates/trigger_group.webhook.delivery_authenticate']
    ).toBe(slatesMessageTriggerGroupWebhookDeliveryAuthenticateRequest);
    expect(
      slatesTriggerGroupResponsesByMethod['slates/trigger_group.webhook.delivery_authenticate']
    ).toBe(slatesMessageTriggerGroupWebhookDeliveryAuthenticateResponse);
  });

  it('preserves state omission versus explicit null across serialized responses', () => {
    let parse = (result: unknown) =>
      slatesMessageTriggerGroupWebhookExpandResponse.parse(
        JSON.parse(JSON.stringify({ jsonrpc: '2.0', id: 'id', result }))
      ).result;
    expect(parse({ events: [] })).not.toHaveProperty('updatedState');
    expect(parse({ events: [], updatedState: null })).toHaveProperty('updatedState', null);
    expect(parse({ events: [], updatedState: ['cursor', 1] })).toHaveProperty('updatedState', [
      'cursor',
      1
    ]);
  });

  it('requires stable lifecycle identities while accepting omitted selection', () => {
    let request = {
      jsonrpc: '2.0',
      id: 'id',
      method: 'slates/trigger_group.webhook.expand',
      params: {
        triggerGroupId: 'group',
        payload: {},
        deliveryId: 'delivery',
        webhookRegistrationPayload: {}
      }
    };
    expect(slatesMessageTriggerGroupWebhookExpandRequest.safeParse(request).success).toBe(
      true
    );
    expect(
      slatesMessageTriggerGroupWebhookExpandRequest.safeParse({
        ...request,
        params: { ...request.params, deliveryId: undefined }
      }).success
    ).toBe(false);
    expect(
      slatesMessageTriggerGroupWebhookExpandRequest.safeParse({
        ...request,
        params: { ...request.params, selection: null }
      }).success
    ).toBe(false);
  });

  it('validates ISO scheduling strings and retains legacy registration output', () => {
    let registration = {
      webhookRegistrationIdentifier: 'registration',
      webhookRegistrationPayload: {}
    };
    expect(slatesTriggerGroupWebhookRegistrationResult.parse(registration)).toEqual(
      registration
    );
    for (let value of ['2026-12-01T12:00:00Z', '2026-12-01T12:00:00+01:00', null]) {
      expect(
        slatesTriggerGroupWebhookRegistrationResult.safeParse({
          ...registration,
          expiresAt: value,
          renewAfter: value
        }).success
      ).toBe(true);
    }
    for (let value of ['2026-02-30T12:00:00Z', 'tomorrow', 100, new Date()]) {
      expect(
        slatesTriggerGroupWebhookRegistrationResult.safeParse({
          ...registration,
          expiresAt: value
        }).success
      ).toBe(false);
    }
  });

  it('carries bounded routing keys for registrations on a shared delivery channel', () => {
    let registration = {
      webhookRegistrationIdentifier: 'registration',
      webhookRegistrationPayload: {}
    };
    expect(
      slatesTriggerGroupWebhookRegistrationResult.parse({
        ...registration,
        routingKeys: ['mailbox:user@example.com']
      }).routingKeys
    ).toEqual(['mailbox:user@example.com']);
    for (let routingKeys of [[''], ['x'.repeat(513)], Array(17).fill('key'), 'key']) {
      expect(
        slatesTriggerGroupWebhookRegistrationResult.safeParse({ ...registration, routingKeys })
          .success
      ).toBe(false);
    }
  });

  it('accepts old group metadata without new capability flags', () => {
    let group = {
      id: 'group',
      name: 'Group',
      invocation: { type: 'webhook', registration: { mode: 'auto' } }
    };
    expect(slatesTriggerGroup.parse(group)).toEqual(group);
  });

  it('carries an optional delivery config on automatic webhook registration', () => {
    let config = {
      userConfigSchema: { type: 'object', properties: { topicName: { type: 'string' } } },
      fullConfigSchema: { type: 'object', properties: { audience: { type: 'string' } } }
    };
    let group = (registration: Record<string, unknown>) => ({
      id: 'group',
      name: 'Group',
      invocation: { type: 'webhook', registration }
    });
    let configured = group({ mode: 'auto', deliveryConfig: config });
    expect(slatesTriggerGroup.parse(configured)).toEqual(configured);
    let manual = group({ mode: 'manual', ...config });
    expect(slatesTriggerGroup.parse(manual)).toEqual(manual);
    for (let invalid of [{}, { userConfigSchema: {} }, { fullConfigSchema: {} }, 'config']) {
      expect(
        slatesTriggerGroup.safeParse(group({ mode: 'auto', deliveryConfig: invalid })).success
      ).toBe(false);
    }
  });

  it('passes the saved delivery config to register and renew unchanged', () => {
    let deliveryConfig = { topic: 'topic', nested: { secret: 'kept' } };
    let register = {
      jsonrpc: '2.0',
      id: 'id',
      method: 'slates/trigger_group.webhook.register',
      params: {
        triggerGroupId: 'group',
        webhookTargetIdentifier: 'target',
        webhookTargetPayload: {},
        webhookUrl: 'https://hooks.example/receive',
        deliveryConfig
      }
    };
    expect(
      slatesMessageTriggerGroupWebhookRegisterRequest.parse(register).params.deliveryConfig
    ).toEqual(deliveryConfig);
    let renew = {
      ...register,
      method: 'slates/trigger_group.webhook.renew',
      params: {
        ...register.params,
        webhookRegistrationIdentifier: 'registration',
        webhookRegistrationPayload: {},
        operationId: 'operation'
      }
    };
    expect(
      slatesMessageTriggerGroupWebhookRenewRequest.parse(renew).params.deliveryConfig
    ).toEqual(deliveryConfig);
    let { deliveryConfig: _, ...withoutConfig } = register.params;
    expect(
      slatesMessageTriggerGroupWebhookRegisterRequest.parse({
        ...register,
        params: withoutConfig
      }).params
    ).not.toHaveProperty('deliveryConfig');
  });
});

describe('webhook delivery authentication wire contract', () => {
  let request = {
    jsonrpc: '2.0',
    id: 'id',
    method: 'slates/trigger_group.webhook.delivery_authenticate',
    params: {
      triggerGroupId: 'group',
      url: 'https://hooks.example/receive/config',
      method: 'POST',
      headers: { authorization: 'Bearer token' },
      body: { encoding: 'base64', content: 'e30=' },
      deliveryConfig: { audience: 'https://hooks.example/receive/config' }
    }
  };
  let response = (result: unknown) =>
    slatesMessageTriggerGroupWebhookDeliveryAuthenticateResponse.safeParse({
      jsonrpc: '2.0',
      id: 'id',
      result
    });

  it('carries the received request in the shape of webhook processing plus the saved config', () => {
    expect(slatesMessageTriggerGroupWebhookDeliveryAuthenticateRequest.parse(request)).toEqual(
      request
    );
    let { deliveryConfig: _, ...http } = request.params;
    expect(
      slatesMessageTriggerGroupWebhookProcessRequest.safeParse({
        ...request,
        method: 'slates/trigger_group.webhook.process',
        params: { ...http, webhookRegistrationPayload: {} }
      }).success
    ).toBe(true);
    expect(
      slatesMessageTriggerGroupWebhookDeliveryAuthenticateRequest.safeParse({
        ...request,
        params: { ...request.params, body: null }
      }).success
    ).toBe(true);
    for (let change of [
      { url: undefined },
      { headers: { count: 1 } },
      { body: { encoding: 'utf-8', content: '{}' } },
      { triggerGroupId: undefined }
    ]) {
      expect(
        slatesMessageTriggerGroupWebhookDeliveryAuthenticateRequest.safeParse({
          ...request,
          params: { ...request.params, ...change }
        }).success
      ).toBe(false);
    }
  });

  it('returns routing keys, an unroutable empty list, or a rejection status', () => {
    for (let result of [
      { routingKeys: ['mailbox:user@example.com'] },
      { routingKeys: [] },
      { routingKeys: ['a', 'b'], rejected: null },
      { routingKeys: [], rejected: { status: 401 } },
      { routingKeys: [], rejected: { status: 503 } }
    ]) {
      expect(response(result)).toMatchObject({ success: true, data: { result } });
    }
  });

  it('bounds routing keys and rejection statuses', () => {
    for (let result of [
      {},
      { rejected: { status: 401 } },
      { routingKeys: [''] },
      { routingKeys: ['x'.repeat(513)] },
      { routingKeys: Array(17).fill('key') },
      { routingKeys: 'key' },
      { routingKeys: [], rejected: { status: 200 } },
      { routingKeys: [], rejected: { status: 399 } },
      { routingKeys: [], rejected: { status: 600 } },
      { routingKeys: [], rejected: { status: 401.5 } },
      { routingKeys: [], rejected: {} }
    ]) {
      expect(response(result).success).toBe(false);
    }
    expect(response({ routingKeys: Array(16).fill('k'.repeat(512)) }).success).toBe(true);
  });
});
