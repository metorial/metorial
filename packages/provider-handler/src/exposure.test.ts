import { SLATES_PROTOCOL_VERSION, SlatesProviderProtoHandlerManager } from '@slates/proto';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createProviderHandler } from './index';

let createManager = async () => {
  let providerGroup = {
    key: 'provider_group',
    name: 'Provider Group',
    description: undefined,
    metadata: {},
    source: 'polling',
    polling: { intervalSeconds: 60 }
  };
  let adapterGroup = {
    key: 'adapter_group',
    name: 'Adapter Group',
    description: undefined,
    metadata: {},
    source: 'polling',
    polling: { intervalSeconds: 60 }
  };
  let emptyGroup = {
    key: 'empty_group',
    name: 'Empty Group',
    description: undefined,
    metadata: {},
    source: 'polling',
    polling: { intervalSeconds: 60 }
  };
  let action = {
    name: 'Action',
    description: undefined,
    instructions: undefined,
    constraints: undefined,
    tags: [],
    metadata: {},
    scopes: [],
    authMethods: [],
    docs: [],
    inputSchema: z.object({}),
    outputSchema: z.object({}),
    matches: () => true,
    map: async () => ({ type: 'event', output: {} })
  };
  let slate = {
    spec: { key: 'test', name: 'Test' },
    adapters: [{ id: 'chat', name: 'Chat', capabilities: [] }],
    actions: [
      { ...action, key: 'provider_tool', type: 'tool', isPublic: false },
      {
        ...action,
        key: 'adapter_tool',
        type: 'tool',
        adapter: 'chat',
        isPublic: false
      },
      { ...action, key: 'provider_trigger', type: 'trigger', triggerGroup: providerGroup },
      {
        ...action,
        key: 'adapter_trigger',
        type: 'trigger',
        adapter: 'chat',
        triggerGroup: adapterGroup
      }
    ],
    triggerGroups: [providerGroup, adapterGroup, emptyGroup]
  };
  let manager = await createProviderHandler(slate as any, []).run();

  await SlatesProviderProtoHandlerManager.handleInput(manager, {
    jsonrpc: '2.0',
    method: 'slates/hello',
    params: { protocol: SLATES_PROTOCOL_VERSION }
  });
  await SlatesProviderProtoHandlerManager.handleInput(manager, {
    jsonrpc: '2.0',
    method: 'slates/participant.set',
    params: { participants: [] }
  });

  return manager;
};

let request = async (
  manager: SlatesProviderProtoHandlerManager,
  method:
    | 'slates/actions.list'
    | 'slates/action.get'
    | 'slates/adapters.list'
    | 'slates/adapter.get'
    | 'slates/trigger_groups.list',
  params: Record<string, unknown> = {}
) =>
  SlatesProviderProtoHandlerManager.handleInput(manager, {
    jsonrpc: '2.0',
    id: method,
    method,
    params
  } as any);

describe('adapter capability exposure', () => {
  it('hides adapter surfaces from a legacy hub that only supports triggers', async () => {
    let manager = await createManager();

    await SlatesProviderProtoHandlerManager.handleInput(manager, {
      jsonrpc: '2.0',
      method: 'slates/hub.capabilities.set',
      params: { capabilities: { triggers: true } }
    });

    expect(await request(manager, 'slates/adapters.list')).toMatchObject({
      result: { adapters: [] }
    });
    expect(
      await request(manager, 'slates/actions.list', { includeAdapterActions: true })
    ).toMatchObject({
      result: { actions: [{ id: 'provider_tool' }, { id: 'provider_trigger' }] }
    });
    expect(await request(manager, 'slates/trigger_groups.list')).toMatchObject({
      result: { triggerGroups: [{ id: 'provider_group' }] }
    });
    expect(await request(manager, 'slates/adapter.get', { adapterId: 'chat' })).toHaveProperty(
      'error'
    );
    expect(
      await request(manager, 'slates/action.get', { actionId: 'adapter_tool' })
    ).toHaveProperty('error');
  });

  it('exposes adapters and their actions when the hub enables them', async () => {
    let manager = await createManager();

    await SlatesProviderProtoHandlerManager.handleInput(manager, {
      jsonrpc: '2.0',
      method: 'slates/hub.capabilities.set',
      params: { capabilities: { adapters: true, triggers: true } }
    });

    expect(await request(manager, 'slates/adapters.list')).toMatchObject({
      result: { adapters: [{ id: 'chat' }] }
    });
    expect(
      await request(manager, 'slates/actions.list', { includeAdapterActions: true })
    ).toMatchObject({
      result: {
        actions: [
          { id: 'provider_tool' },
          { id: 'adapter_tool' },
          { id: 'provider_trigger' },
          { id: 'adapter_trigger' }
        ]
      }
    });
    expect(await request(manager, 'slates/trigger_groups.list')).toMatchObject({
      result: {
        triggerGroups: [{ id: 'provider_group' }, { id: 'adapter_group' }]
      }
    });
  });
});
