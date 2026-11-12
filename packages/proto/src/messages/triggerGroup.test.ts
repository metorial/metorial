import { describe, expect, it } from 'vitest';
import {
  slatesGooglePubSubCapability,
  slatesTriggerGroup,
  slatesTriggerGroupInfrastructure
} from '../types';
import {
  slatesMessageTriggerGroupWebhookExpandRequest,
  slatesMessageTriggerGroupWebhookExpandResponse,
  slatesMessageTriggerGroupWebhookRenewRequest,
  slatesMessageTriggerGroupWebhookRenewResponse,
  slatesTriggerGroupRequestsByMethod,
  slatesTriggerGroupResponsesByMethod,
  slatesTriggerGroupWebhookRegistrationResult
} from './triggerGroup';

describe('trigger lifecycle wire contracts', () => {
  it('restricts managed products and requires complete nonsecret infrastructure descriptors', () => {
    for (let product of ['gmail', 'forms', 'meet', 'storage']) {
      expect(slatesGooglePubSubCapability.parse({ product })).toEqual({ product });
    }
    expect(slatesGooglePubSubCapability.safeParse({ product: 'arbitrary' }).success).toBe(
      false
    );
    expect(
      slatesGooglePubSubCapability.safeParse({ product: 'gmail', publisher: 'untrusted' })
        .success
    ).toBe(false);
    let googlePubSub = {
      projectId: 'project',
      topicName: 'topic',
      subscriptionName: 'subscription',
      pushServiceAccountEmail: 'push@example.com',
      audience: 'audience'
    };
    expect(slatesTriggerGroupInfrastructure.parse({ googlePubSub })).toEqual({ googlePubSub });
    for (let key of Object.keys(googlePubSub)) {
      expect(
        slatesTriggerGroupInfrastructure.safeParse({
          googlePubSub: { ...googlePubSub, [key]: '' }
        }).success
      ).toBe(false);
      expect(
        slatesTriggerGroupInfrastructure.safeParse({
          googlePubSub: { ...googlePubSub, [key]: undefined }
        }).success
      ).toBe(false);
    }
  });

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
        routingKeys: ['gmail:user@example.com']
      }).routingKeys
    ).toEqual(['gmail:user@example.com']);
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
      fullConfigSchema: { type: 'object', properties: { googlePubSub: { type: 'object' } } }
    };
    let group = (registration: Record<string, unknown>) => ({
      id: 'group',
      name: 'Group',
      invocation: { type: 'webhook', registration }
    });
    let configured = group({ mode: 'auto', config });
    expect(slatesTriggerGroup.parse(configured)).toEqual(configured);
    let manual = group({ mode: 'manual', ...config });
    expect(slatesTriggerGroup.parse(manual)).toEqual(manual);
    for (let invalid of [{}, { userConfigSchema: {} }, { fullConfigSchema: {} }, 'config']) {
      expect(
        slatesTriggerGroup.safeParse(group({ mode: 'auto', config: invalid })).success
      ).toBe(false);
    }
  });
});
