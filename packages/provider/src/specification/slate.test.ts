import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { SlateTrigger, SlateTriggerGroup } from '../action';
import { SlateAuth } from '../auth';
import { SlateConfig } from '../config';
import { Slate } from './slate';
import { SlateSpecification } from './specification';

let createTestSpec = () => {
  let config = SlateConfig.create(z.object({}));
  let auth = SlateAuth.create<{}>().output(z.object({}));

  return SlateSpecification.create({
    key: 'demo',
    name: 'Demo',
    config,
    auth
  });
};

let createManualWebhookTriggerGroup = (spec: ReturnType<typeof createTestSpec>, key: string) =>
  SlateTriggerGroup.create(spec, {
    key,
    name: key
  })
    .webhook({
      manualRegistration: {
        userConfigSchema: z.object({}),
        fullConfigSchema: z.object({}),
        setup: async () => ({
          webhookSetupDocument: '',
          partialWebhookRegistrationPayload: {}
        })
      },
      process: async () => ({ events: [] })
    })
    .routingMatchers(async () => [])
    .build();

let createAutoWebhookTriggerGroup = (spec: ReturnType<typeof createTestSpec>, key: string) =>
  SlateTriggerGroup.create(spec, {
    key,
    name: key
  })
    .webhook({
      autoRegistration: {
        webhookTargetList: async () => ({ targets: [], nextPageToken: null }),
        webhookRegister: async () => ({
          webhookRegistrationIdentifier: 'reg',
          webhookRegistrationPayload: {}
        }),
        webhookUnregister: async () => {}
      },
      process: async () => ({ events: [] })
    })
    .routingMatchers(async () => [])
    .build();

describe('Slate.create', () => {
  it('rejects more than one manual webhook trigger group', () => {
    let spec = createTestSpec();
    let first = createManualWebhookTriggerGroup(spec, 'manual_one');
    let second = createManualWebhookTriggerGroup(spec, 'manual_two');

    expect(() =>
      Slate.create({
        spec,
        tools: [],
        triggers: [],
        triggerGroups: [first, second]
      })
    ).toThrow(
      'Only one trigger group may use manual webhook registration, but found: manual_one, manual_two'
    );
  });

  it('allows a single manual webhook trigger group alongside other trigger groups', () => {
    let spec = createTestSpec();
    let manual = createManualWebhookTriggerGroup(spec, 'manual_group');
    let auto = createAutoWebhookTriggerGroup(spec, 'auto_group');

    let manualTrigger = SlateTrigger.create(spec, {
      key: 'manual_trigger',
      name: 'Manual Trigger'
    })
      .input(z.object({}))
      .output(z.object({ type: z.literal('demo') }))
      .triggerGroup(manual)
      .matches(() => true)
      .map(async () => ({ type: 'demo', id: '1', output: { type: 'demo' as const } }))
      .build();

    let slate = Slate.create({
      spec,
      tools: [],
      triggers: [manualTrigger],
      triggerGroups: [manual, auto]
    });

    expect(slate.triggerGroups.map(group => group.key)).toEqual(['manual_group', 'auto_group']);
  });
});
