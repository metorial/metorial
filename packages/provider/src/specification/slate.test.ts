import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { SlateTool, SlateTrigger, SlateTriggerGroup, toolCategory } from '../action';
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

    expect(slate.triggerGroups.map(group => group.key)).toEqual([
      'manual_group',
      'auto_group'
    ]);
  });

  it('treats omitted adapters, trigger groups, and adapter actions as empty collections', () => {
    let spec = createTestSpec();
    let slate = Slate.create({
      spec,
      tools: [],
      triggers: [],
      adapters: [{ id: 'legacy' } as any]
    });

    expect(slate.adapters).toHaveLength(1);
    expect(slate.actions).toEqual([]);
    expect(slate.triggerGroups).toEqual([]);
  });
});

let createTestTool = (spec: ReturnType<typeof createTestSpec>, key: string) =>
  SlateTool.create(spec, { key, name: key })
    .input(z.object({}))
    .output(z.object({}))
    .handleInvocation(async () => ({ output: {}, message: 'ok' }))
    .build();

describe('Slate.create tool categories', () => {
  it('resolves membership in declared category order', () => {
    let spec = createTestSpec();
    let records = createTestTool(spec, 'records');
    let report = createTestTool(spec, 'report');
    let other = createTestTool(spec, 'other');

    let slate = Slate.create({
      spec,
      tools: [records, report, other],
      triggers: [],
      toolCategories: [
        toolCategory({ key: 'crm', name: 'CRM', tools: [records, report] }),
        toolCategory({ key: 'reporting', name: 'Reporting', tools: [report] })
      ]
    });

    expect(slate.toolCategories.map(category => category.key)).toEqual(['crm', 'reporting']);
    expect(slate.getToolCategoryKeys('records')).toEqual(['crm']);
    expect(slate.getToolCategoryKeys('report')).toEqual(['crm', 'reporting']);
    expect(slate.getToolCategoryKeys('other')).toEqual([]);
  });

  it('ignores a shadowed duplicate tool listed in a category', () => {
    let spec = createTestSpec();
    let writer = createTestTool(spec, 'dup');
    let reader = createTestTool(spec, 'dup');

    let slate = Slate.create({
      spec,
      tools: [writer, reader],
      triggers: [],
      toolCategories: [toolCategory({ key: 'read', name: 'Read', tools: [reader] })]
    });

    expect(slate.getToolCategoryKeys('dup')).toEqual([]);
  });

  it('returns a copy of the membership list', () => {
    let spec = createTestSpec();
    let tool = createTestTool(spec, 'a');
    let slate = Slate.create({
      spec,
      tools: [tool],
      triggers: [],
      toolCategories: [toolCategory({ key: 'crm', name: 'CRM', tools: [tool] })]
    });

    slate.getToolCategoryKeys('a').push('mutated');
    expect(slate.getToolCategoryKeys('a')).toEqual(['crm']);
  });

  it('defaults to no categories', () => {
    let spec = createTestSpec();
    let slate = Slate.create({ spec, tools: [createTestTool(spec, 'a')], triggers: [] });

    expect(slate.toolCategories).toEqual([]);
    expect(slate.getToolCategoryKeys('a')).toEqual([]);
  });

  it('rejects duplicate and malformed category keys', () => {
    let spec = createTestSpec();
    let tool = createTestTool(spec, 'a');

    expect(() =>
      Slate.create({
        spec,
        tools: [tool],
        triggers: [],
        toolCategories: [
          toolCategory({ key: 'crm', name: 'CRM', tools: [tool] }),
          toolCategory({ key: 'crm', name: 'CRM again', tools: [tool] })
        ]
      })
    ).toThrow('Tool category "crm" is registered more than once');

    expect(() =>
      Slate.create({
        spec,
        tools: [tool],
        triggers: [],
        toolCategories: [toolCategory({ key: 'Zoho CRM', name: 'CRM', tools: [tool] })]
      })
    ).toThrow('Tool category key "Zoho CRM" must match');
  });

  it('accepts http(s) category images and rejects anything else', () => {
    let spec = createTestSpec();
    let tool = createTestTool(spec, 'a');
    let slate = Slate.create({
      spec,
      tools: [tool],
      triggers: [],
      toolCategories: [
        toolCategory({
          key: 'crm',
          name: 'CRM',
          imageUrl: 'https://cdn.test/crm.svg',
          tools: [tool]
        })
      ]
    });
    expect(slate.toolCategories[0]?.imageUrl).toBe('https://cdn.test/crm.svg');

    expect(() =>
      Slate.create({
        spec,
        tools: [tool],
        triggers: [],
        toolCategories: [
          toolCategory({ key: 'crm', name: 'CRM', imageUrl: 'crm.svg', tools: [tool] })
        ]
      })
    ).toThrow('Tool category "crm" imageUrl must be an absolute http(s) URL');
  });

  it('rejects a category without tools', () => {
    let spec = createTestSpec();

    expect(() =>
      Slate.create({
        spec,
        tools: [createTestTool(spec, 'a')],
        triggers: [],
        toolCategories: [toolCategory({ key: 'crm', name: 'CRM', tools: [] })]
      })
    ).toThrow('Tool category "crm" must list at least one tool');
  });

  it('rejects unregistered member tools', () => {
    let spec = createTestSpec();

    expect(() =>
      Slate.create({
        spec,
        tools: [],
        triggers: [],
        toolCategories: [
          toolCategory({ key: 'crm', name: 'CRM', tools: [createTestTool(spec, 'stray')] })
        ]
      })
    ).toThrow('Tool category "crm" lists tool "stray", which is not registered in this slate');
  });
});
