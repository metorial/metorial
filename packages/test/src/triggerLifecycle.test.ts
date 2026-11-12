import {
  Slate,
  SlateAuth,
  SlateConfig,
  SlateSpecification,
  SlateTrigger,
  triggerGroup
} from '@slates/provider';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  authenticateSlateTriggerGroupWebhookDelivery,
  createLocalSlateTestClient,
  expandSlateTriggerGroupWebhook,
  pollSlateTriggerGroupEvents,
  processSlateTriggerGroupWebhook,
  registerSlateTriggerGroupWebhook,
  renewSlateTriggerGroupWebhook
} from './index';

let fixture = (
  options: {
    selection?: 'required' | 'default';
    legacy?: boolean;
    expiresAt?: string | null;
    renewAfter?: string | null;
    invalidExpansion?: boolean;
    reconcileIntervalSeconds?: number;
    deliveryConfig?: boolean;
  } = {}
) => {
  let contexts: { operation: string; auth: unknown; config: unknown; input: any }[] = [];
  let auth = SlateAuth.create<{ token: string }>()
    .output(z.object({ token: z.string() }))
    .addTokenAuth({
      type: 'auth.token',
      key: 'token',
      name: 'Token',
      inputSchema: z.object({ token: z.string() }),
      getOutput: async ctx => ({ output: ctx.input })
    });
  let spec = SlateSpecification.create({
    key: 'lifecycle',
    name: 'Lifecycle',
    description: 'Trigger lifecycle contract',
    auth,
    config: SlateConfig.create(z.object({ tenant: z.string() }))
  });
  let selectionSchema =
    options.selection === 'required'
      ? z.object({ resource: z.string() })
      : options.selection === 'default'
        ? z.object({ resource: z.string().default('default-resource') })
        : undefined;
  let record = (operation: string, ctx: { auth: unknown; config: unknown; input: any }) => {
    contexts.push({ operation, auth: ctx.auth, config: ctx.config, input: ctx.input });
  };
  let registration = {
    webhookRegistrationIdentifier: 'registration',
    webhookRegistrationPayload: { secret: 'verification' },
    ...(options.expiresAt !== undefined ? { expiresAt: options.expiresAt } : {}),
    ...(options.renewAfter !== undefined ? { renewAfter: options.renewAfter } : {})
  };
  let group = triggerGroup(spec, { key: 'webhook', name: 'Webhook', selectionSchema })
    .webhook({
      reconcileIntervalSeconds: options.reconcileIntervalSeconds,
      deliveryConfig: options.deliveryConfig
        ? {
            userConfigSchema: z.object({ topicName: z.string() }),
            fullConfigSchema: z.object({ topicName: z.string(), audience: z.string() }),
            setup: async ctx => {
              record('setup', ctx);
              return {
                webhookSetupDocument: `Deliver to ${ctx.input.webhookUrl}`,
                partialWebhookRegistrationPayload: {}
              };
            },
            finish: async ctx => {
              record('finish', ctx);
              return {
                webhookRegistrationPayload: {
                  ...ctx.input.userWebhookRegistrationPayload,
                  audience: ctx.input.webhookUrl
                }
              };
            },
            authenticate: async ctx => {
              record('authenticate', ctx);
              let status = Number(ctx.input.request.headers.get('x-reject'));
              if (status) return { rejected: { status } };
              let body = JSON.parse(await ctx.input.request.text()) as { keys: string[] };
              return { routingKeys: body.keys };
            }
          }
        : undefined,
      autoRegistration: {
        webhookTargetList: async ctx => {
          record('targets', ctx);
          return { targets: [], nextPageToken: null };
        },
        webhookRegister: async ctx => {
          record('register', ctx);
          return registration;
        },
        webhookRenew: options.legacy
          ? undefined
          : async ctx => {
              record('renew', ctx);
              return {
                ...registration,
                webhookRegistrationIdentifier: 'renewed-registration'
              };
            },
        webhookUnregister: async () => {}
      },
      process: async ctx => {
        record('process', ctx);
        return {
          events: [
            {
              payload: { raw: true },
              matchers: [{ tenant: 'tenant' }],
              idempotencyKey: 'raw-key'
            }
          ]
        };
      },
      expandWebhook: options.legacy
        ? undefined
        : async ctx => {
            record('expand', ctx);
            // Malformed output deliberately exercises the runtime contract boundary.
            if (options.invalidExpansion) return { events: [{ payload: [] }] };
            let payload = z
              .object({ empty: z.boolean().optional(), preserve: z.boolean().optional() })
              .nullable()
              .parse(ctx.input.payload);
            if (payload?.empty) return { events: [], updatedState: null };
            if (payload?.preserve) return { events: [] };
            return {
              events: [
                { payload: { kind: 'selected', id: 'one' }, idempotencyKey: 'one' },
                { payload: { kind: 'other', id: 'two' }, idempotencyKey: 'two' },
                { payload: { kind: 'selected', id: 'three' }, idempotencyKey: 'three' }
              ],
              updatedState: { cursor: 'next' }
            };
          }
    })
    .routingMatchers(async () => [{ tenant: 'tenant' }])
    .build();
  let poll = triggerGroup(spec, { key: 'poll', name: 'Poll', selectionSchema })
    .polling({
      pollEvents: async ctx => {
        record('poll', ctx);
        return { events: [], updatedState: ctx.input.state };
      }
    })
    .routingMatchers(async () => [])
    .build();
  let matches = 0;
  let selected = SlateTrigger.create(spec, { key: 'selected', name: 'Selected' })
    .triggerGroup(group)
    .input(
      z.object({
        kind: z.string().optional(),
        id: z.string().optional(),
        raw: z.boolean().optional()
      })
    )
    .output(z.object({ id: z.string() }))
    .matches(event => {
      matches++;
      return event.kind === 'selected' || event.raw === true;
    })
    .map(async ctx => ({ type: 'selected', output: { id: ctx.input.id ?? 'raw' } }))
    .build();
  let slate = Slate.create({
    spec,
    tools: [],
    triggers: [selected],
    triggerGroups: [group, poll]
  });
  let client = createLocalSlateTestClient({
    slate,
    state: {
      config: { tenant: 'tenant' },
      auth: { authenticationMethodId: 'token', output: { token: 'credential' } }
    }
  });
  return { client, contexts, matches: () => matches };
};

let registrationInput = {
  triggerGroupId: 'webhook',
  webhookTargetIdentifier: 'target',
  webhookTargetPayload: { resource: 'target' },
  webhookUrl: 'https://example.com/webhook'
};
let renewalInput = {
  ...registrationInput,
  webhookRegistrationIdentifier: 'registration',
  webhookRegistrationPayload: { secret: 'verification' },
  operationId: 'stable-operation'
};
let expansionInput = {
  triggerGroupId: 'webhook',
  payload: { raw: true },
  state: { cursor: 'before' },
  deliveryId: 'delivery',
  webhookRegistrationPayload: { secret: 'verification' }
};

describe('trigger lifecycle protocol helpers', () => {
  it('passes the saved delivery config unchanged and independently from user selection', async () => {
    let { client, contexts } = fixture({ deliveryConfig: true });
    let deliveryConfig = {
      topicName: 'projects/p/topics/t',
      audience: 'https://example.com/delivery',
      nested: { kept: ['as', 'saved'] }
    };
    await registerSlateTriggerGroupWebhook({
      client,
      ...registrationInput,
      operationId: 'initial-registration-operation',
      deliveryConfig
    });
    await renewSlateTriggerGroupWebhook({ client, ...renewalInput, deliveryConfig });
    expect(contexts.map(ctx => [ctx.operation, ctx.input.deliveryConfig])).toEqual([
      ['register', deliveryConfig],
      ['renew', deliveryConfig]
    ]);
    expect(contexts[0]?.input.operationId).toBe('initial-registration-operation');
    await registerSlateTriggerGroupWebhook({
      client,
      ...registrationInput,
      selection: { deliveryConfig }
    });
    expect(contexts.at(-1)?.input.deliveryConfig).toBeUndefined();
    expect(contexts.at(-1)?.input.operationId).toBeUndefined();
  });

  it('exposes the delivery config of an automatic group and completes it without credentials', async () => {
    let { client, contexts } = fixture({ deliveryConfig: true });
    expect((await client.getTriggerGroup('webhook')).triggerGroup.invocation).toMatchObject({
      registration: {
        mode: 'auto',
        deliveryConfig: {
          userConfigSchema: { type: 'object', required: ['topicName'] },
          fullConfigSchema: { type: 'object', required: ['topicName', 'audience'] }
        }
      }
    });
    client.clearAuth();
    let webhookUrl = 'https://example.com/delivery';
    let setup = await client.setupTriggerGroupWebhookManually({
      triggerGroupId: 'webhook',
      webhookUrl
    });
    expect(setup).toEqual({
      webhookSetupDocument: `Deliver to ${webhookUrl}`,
      partialWebhookRegistrationPayload: {}
    });
    let finished = await client.finishTriggerGroupWebhookManualSetup({
      triggerGroupId: 'webhook',
      webhookUrl,
      partialWebhookRegistrationPayload: setup.partialWebhookRegistrationPayload,
      userWebhookRegistrationPayload: { topicName: 'projects/p/topics/t' }
    });
    expect(finished.webhookRegistrationPayload).toEqual({
      topicName: 'projects/p/topics/t',
      audience: webhookUrl
    });
    expect(contexts.map(ctx => [ctx.operation, ctx.auth, ctx.config])).toEqual([
      ['setup', {}, {}],
      ['finish', {}, {}]
    ]);
    await expect(
      fixture().client.setupTriggerGroupWebhookManually({
        triggerGroupId: 'webhook',
        webhookUrl
      })
    ).rejects.toThrow('does not support manual webhook registration');
  });

  it('authenticates a delivery through the delivery config without credentials', async () => {
    let { client, contexts } = fixture({ deliveryConfig: true });
    client.clearAuth();
    let deliveryConfig = {
      topicName: 'projects/p/topics/t',
      audience: 'https://example.com/d'
    };
    let delivery = {
      client,
      triggerGroupId: 'webhook',
      url: 'https://example.com/d',
      deliveryConfig
    };
    expect(
      await authenticateSlateTriggerGroupWebhookDelivery({
        ...delivery,
        body: JSON.stringify({ keys: ['resource:one', 'resource:two'] })
      })
    ).toEqual({ routingKeys: ['resource:one', 'resource:two'], rejected: null });
    expect(
      await authenticateSlateTriggerGroupWebhookDelivery({
        ...delivery,
        body: JSON.stringify({ keys: [] })
      })
    ).toEqual({ routingKeys: [], rejected: null });
    expect(
      await authenticateSlateTriggerGroupWebhookDelivery({
        ...delivery,
        headers: { 'x-reject': '503' }
      })
    ).toEqual({ routingKeys: [], rejected: { status: 503 } });
    expect(contexts.map(ctx => [ctx.operation, ctx.auth, ctx.config])).toEqual(
      Array(3).fill(['authenticate', {}, {}])
    );
    expect(contexts.map(ctx => ctx.input.deliveryConfig)).toEqual(
      Array(3).fill(deliveryConfig)
    );
    await expect(
      authenticateSlateTriggerGroupWebhookDelivery({
        ...delivery,
        client: fixture().client,
        body: JSON.stringify({ keys: [] })
      })
    ).rejects.toThrow('does not support webhook delivery authentication');
  });

  it('advertises schemas and capabilities while preserving old group specifications', async () => {
    let { client } = fixture({ selection: 'default' });
    expect((await client.getTriggerGroup('webhook')).triggerGroup).toMatchObject({
      selectionSchema: {
        type: 'object',
        properties: { resource: { type: 'string', default: 'default-resource' } }
      },
      invocation: { type: 'webhook', supportsExpansion: true, supportsRenewal: true }
    });
    let legacy = fixture({ legacy: true });
    let oldGroup = (await legacy.client.getTriggerGroup('webhook')).triggerGroup;
    expect(oldGroup).not.toHaveProperty('selectionSchema');
    expect(oldGroup.invocation).toEqual({ type: 'webhook', registration: { mode: 'auto' } });
    expect(
      (await client.getTriggerGroup('webhook')).triggerGroup.selectionSchema
    ).not.toHaveProperty('required');
  });

  it('declares bounded reconciliation and passes scheduled null payloads unchanged', async () => {
    for (let reconcileIntervalSeconds of [
      0,
      899,
      900.5,
      Number.NaN,
      Number.POSITIVE_INFINITY
    ]) {
      expect(() => fixture({ reconcileIntervalSeconds })).toThrow(
        'integer of at least 900 seconds'
      );
    }
    expect(() => fixture({ legacy: true, reconcileIntervalSeconds: 900 })).toThrow(
      'requires an expandWebhook handler'
    );
    let { client, contexts } = fixture({ reconcileIntervalSeconds: 900 });
    expect((await client.getTriggerGroup('webhook')).triggerGroup.invocation).toMatchObject({
      reconcileIntervalSeconds: 900,
      supportsExpansion: true
    });
    let result = await expandSlateTriggerGroupWebhook({
      client,
      ...expansionInput,
      payload: null,
      deliveryId: 'scheduled-run'
    });
    expect(result.events).toHaveLength(3);
    expect(contexts[0]?.input).toMatchObject({
      payload: null,
      deliveryId: 'scheduled-run',
      state: expansionInput.state,
      webhookRegistrationPayload: expansionInput.webhookRegistrationPayload
    });
  });

  it('verifies without credentials and expands zero or many events with connection context', async () => {
    let { client, contexts, matches } = fixture({ selection: 'required' });
    let processed = await processSlateTriggerGroupWebhook({
      client,
      triggerGroupId: 'webhook',
      url: registrationInput.webhookUrl,
      webhookRegistrationPayload: expansionInput.webhookRegistrationPayload
    });
    expect(processed).toMatchObject({
      requiresExpansion: true,
      events: [{ triggerIds: [], idempotencyKey: 'raw-key' }]
    });
    expect(matches()).toBe(0);
    expect(contexts[0]).toMatchObject({ operation: 'process', auth: {}, config: {} });
    let expanded = await expandSlateTriggerGroupWebhook({
      client,
      ...expansionInput,
      selection: { resource: 'chosen' }
    });
    expect(expanded).toMatchObject({
      updatedState: { cursor: 'next' },
      events: [
        { idempotencyKey: 'one', triggerIds: ['selected'] },
        { idempotencyKey: 'two', triggerIds: [] },
        { idempotencyKey: 'three', triggerIds: ['selected'] }
      ]
    });
    expect(contexts[1]).toMatchObject({
      operation: 'expand',
      auth: { token: 'credential' },
      config: { tenant: 'tenant' },
      input: {
        payload: expansionInput.payload,
        state: expansionInput.state,
        deliveryId: expansionInput.deliveryId,
        webhookRegistrationPayload: expansionInput.webhookRegistrationPayload,
        selection: { resource: 'chosen' }
      }
    });
    expect(matches()).toBe(3);
    expect(
      await client.mapTriggerEvent('selected', expanded.events[0]!.payload)
    ).toMatchObject({ output: { id: 'one' } });
    let cleared = await expandSlateTriggerGroupWebhook({
      client,
      ...expansionInput,
      payload: { empty: true },
      selection: { resource: 'chosen' }
    });
    expect(cleared).toMatchObject({ events: [], updatedState: null });
    let preserved = await expandSlateTriggerGroupWebhook({
      client,
      ...expansionInput,
      payload: { preserve: true },
      selection: { resource: 'chosen' }
    });
    expect(preserved.events).toEqual([]);
    expect(preserved).not.toHaveProperty('updatedState');
  });

  it('validates selection before every affected handler and applies accepted defaults', async () => {
    let { client, contexts } = fixture({ selection: 'required' });
    let calls = [
      () => client.listTriggerGroupWebhookTargets({ triggerGroupId: 'webhook' }),
      () => registerSlateTriggerGroupWebhook({ client, ...registrationInput }),
      () => renewSlateTriggerGroupWebhook({ client, ...renewalInput }),
      () => expandSlateTriggerGroupWebhook({ client, ...expansionInput }),
      () => pollSlateTriggerGroupEvents({ client, triggerGroupId: 'poll' })
    ];
    for (let call of calls) await expect(call()).rejects.toThrow('Invalid selection');
    expect(contexts).toEqual([]);
    let defaults = fixture({ selection: 'default' });
    await defaults.client.listTriggerGroupWebhookTargets({ triggerGroupId: 'webhook' });
    await registerSlateTriggerGroupWebhook({ client: defaults.client, ...registrationInput });
    await renewSlateTriggerGroupWebhook({ client: defaults.client, ...renewalInput });
    await expandSlateTriggerGroupWebhook({ client: defaults.client, ...expansionInput });
    await pollSlateTriggerGroupEvents({ client: defaults.client, triggerGroupId: 'poll' });
    expect(defaults.contexts.map(ctx => ctx.input.selection)).toEqual(
      Array(5).fill({ resource: 'default-resource' })
    );
    await pollSlateTriggerGroupEvents({
      client: defaults.client,
      triggerGroupId: 'poll',
      selection: { resource: 'explicit' }
    });
    expect(defaults.contexts.at(-1)?.input.selection).toEqual({ resource: 'explicit' });
  });

  it('keeps groups without selection, expansion, or renewal backward compatible', async () => {
    let { client, contexts } = fixture({ legacy: true });
    await registerSlateTriggerGroupWebhook({ client, ...registrationInput });
    await pollSlateTriggerGroupEvents({ client, triggerGroupId: 'poll' });
    expect(contexts.map(ctx => ctx.input.selection)).toEqual([{}, {}]);
    let processed = await processSlateTriggerGroupWebhook({
      client,
      triggerGroupId: 'webhook',
      url: registrationInput.webhookUrl
    });
    expect(processed.events[0]?.triggerIds).toEqual(['selected']);
    expect(processed).not.toHaveProperty('requiresExpansion');
    await expect(renewSlateTriggerGroupWebhook({ client, ...renewalInput })).rejects.toThrow(
      'does not support webhook renewal'
    );
    await expect(
      expandSlateTriggerGroupWebhook({ client, ...expansionInput })
    ).rejects.toThrow('does not support webhook expansion');
  });

  it('requires authenticated context for expansion and renewal', async () => {
    let { client, contexts } = fixture();
    client.clearAuth();
    await expect(
      expandSlateTriggerGroupWebhook({ client, ...expansionInput })
    ).rejects.toMatchObject({
      data: { code: 'request.precondition_failed' }
    });
    await expect(
      renewSlateTriggerGroupWebhook({ client, ...renewalInput })
    ).rejects.toMatchObject({
      data: { code: 'request.precondition_failed' }
    });
    expect(contexts).toEqual([]);
    await processSlateTriggerGroupWebhook({
      client,
      triggerGroupId: 'webhook',
      url: registrationInput.webhookUrl
    });
    expect(contexts[0]).toMatchObject({ operation: 'process', auth: {}, config: {} });
  });

  it('passes stable renewal identity and validates nullable ISO scheduling metadata', async () => {
    let { client, contexts } = fixture({
      expiresAt: '2026-12-01T12:00:00+01:00',
      renewAfter: null
    });
    let registered = await registerSlateTriggerGroupWebhook({ client, ...registrationInput });
    expect(registered).toMatchObject({
      expiresAt: '2026-12-01T12:00:00+01:00',
      renewAfter: null
    });
    let renewed = await renewSlateTriggerGroupWebhook({
      client,
      ...renewalInput,
      selection: { resource: 'chosen' }
    });
    expect(renewed).toMatchObject({
      webhookRegistrationIdentifier: 'renewed-registration',
      expiresAt: registered.expiresAt,
      renewAfter: null
    });
    expect(contexts.at(-1)).toMatchObject({
      operation: 'renew',
      auth: { token: 'credential' },
      config: { tenant: 'tenant' },
      input: {
        operationId: 'stable-operation',
        webhookRegistrationIdentifier: 'registration',
        webhookTargetIdentifier: 'target',
        selection: { resource: 'chosen' }
      }
    });
    let invalid = fixture({ expiresAt: 'tomorrow' });
    await expect(
      registerSlateTriggerGroupWebhook({ client: invalid.client, ...registrationInput })
    ).rejects.toThrow('invalid result');
    await expect(
      renewSlateTriggerGroupWebhook({ client: invalid.client, ...renewalInput })
    ).rejects.toThrow('invalid result');
    let invalidExpansion = fixture({ invalidExpansion: true });
    await expect(
      expandSlateTriggerGroupWebhook({ client: invalidExpansion.client, ...expansionInput })
    ).rejects.toThrow('invalid result');
  });
});
