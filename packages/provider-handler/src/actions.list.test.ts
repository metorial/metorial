import { SLATES_PROTOCOL_VERSION, SlatesProviderProtoHandlerManager } from '@slates/proto';
import {
  Slate,
  SlateAuth,
  SlateConfig,
  SlateSpecification,
  SlateTrigger,
  SlateTriggerGroup
} from '@slates/provider';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createProviderHandler } from './index';

let createTriggerSlate = () => {
  let spec = SlateSpecification.create({
    key: 'triggers-list-test',
    name: 'Triggers List Test',
    config: SlateConfig.create(z.object({})),
    auth: SlateAuth.create().output(z.object({}))
  });

  let pollGroup = SlateTriggerGroup.create(spec, {
    key: 'poll_group',
    name: 'Poll Group'
  })
    .polling({
      pollEvents: async () => ({ events: [] })
    })
    .routingMatchers(async () => [])
    .build();

  let pollTick = SlateTrigger.create(spec, {
    key: 'poll_tick',
    name: 'Poll Tick'
  })
    .input(z.object({}))
    .output(z.object({}))
    .triggerGroup(pollGroup)
    .matches(() => true)
    .map(async () => ({ type: 'test.tick', id: 'tick', output: {} }))
    .build();

  return Slate.create({
    spec,
    tools: [],
    triggers: [pollTick],
    triggerGroups: [pollGroup]
  });
};

let createManager = async () => {
  let manager = await createProviderHandler(createTriggerSlate(), []).run();

  await SlatesProviderProtoHandlerManager.handleInput(manager, {
    jsonrpc: '2.0',
    method: 'slates/hello',
    params: { protocol: SLATES_PROTOCOL_VERSION }
  });
  await SlatesProviderProtoHandlerManager.handleInput(manager, {
    jsonrpc: '2.0',
    method: 'slates/participant.set',
    params: {
      participants: [
        { type: 'consumer', id: 'consumer', name: 'Consumer' },
        { type: 'hub', id: 'hub', name: 'Hub' }
      ]
    }
  });

  return manager;
};

let listActions = (manager: SlatesProviderProtoHandlerManager) =>
  SlatesProviderProtoHandlerManager.handleInput(manager, {
    jsonrpc: '2.0',
    id: 'list-actions',
    method: 'slates/actions.list',
    params: {}
  });

let listTriggerGroups = (manager: SlatesProviderProtoHandlerManager) =>
  SlatesProviderProtoHandlerManager.handleInput(manager, {
    jsonrpc: '2.0',
    id: 'list-groups',
    method: 'slates/trigger_groups.list',
    params: {}
  });

describe('actions.list trigger-group compatibility', () => {
  it('lists trigger groups even when the hub has not announced trigger support', async () => {
    let manager = await createManager();
    let groups = await listTriggerGroups(manager);

    expect(groups).toMatchObject({
      result: {
        triggerGroups: [{ id: 'poll_group' }]
      }
    });
  });

  it('hides triggers from actions.list until the hub announces trigger support', async () => {
    let manager = await createManager();
    let before = await listActions(manager);

    expect(before).toMatchObject({ result: { actions: [] } });

    await SlatesProviderProtoHandlerManager.handleInput(manager, {
      jsonrpc: '2.0',
      method: 'slates/hub.capabilities.set',
      params: { capabilities: { triggers: true } }
    });

    let after = await listActions(manager);

    expect(after).toMatchObject({
      result: {
        actions: [
          {
            id: 'poll_tick',
            type: 'action.trigger',
            triggerGroupId: 'poll_group'
          }
        ]
      }
    });
  });
});
