import { SLATES_PROTOCOL_VERSION, SlatesProviderProtoHandlerManager } from '@slates/proto';
import {
  getRuntimeInfo,
  Slate,
  SlateAuth,
  SlateConfig,
  SlatePublicTool,
  SlateSpecification
} from '@slates/provider';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createProviderHandler } from './index';

let runtimeInfo = {
  metorial: {
    apiUrl: 'https://api-us1.metorial.test',
    region: 'us1',
    environment: 'staging'
  }
};

let createManager = async () => {
  let spec = SlateSpecification.create({
    key: 'runtime-info-test',
    name: 'Runtime Info Test',
    config: SlateConfig.create(z.object({ apiUrl: z.string().nullable() })).getDefaultConfig(
      () => ({ apiUrl: getRuntimeInfo()?.metorial?.apiUrl ?? null })
    ),
    auth: SlateAuth.create().output(z.object({}))
  });
  let tool = SlatePublicTool.create(spec, {
    key: 'read_runtime_info',
    name: 'Read Runtime Info'
  })
    .input(z.object({}))
    .output(z.object({ fromContext: z.any(), fromHelper: z.any() }))
    .handleInvocation(async ctx => ({
      output: { fromContext: ctx.runtimeInfo, fromHelper: getRuntimeInfo() },
      message: 'ok'
    }))
    .build();
  let slate = Slate.create({ spec, triggers: [], tools: [tool] });
  let manager = await createProviderHandler(slate, []).run();

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

let setRuntimeInfo = (manager: SlatesProviderProtoHandlerManager) =>
  SlatesProviderProtoHandlerManager.handleInput(manager, {
    jsonrpc: '2.0',
    method: 'slates/hub.runtime_info.set',
    params: { runtimeInfo }
  });

let invokeTool = (manager: SlatesProviderProtoHandlerManager) =>
  SlatesProviderProtoHandlerManager.handleInput(manager, {
    jsonrpc: '2.0',
    id: 'tool',
    method: 'slates/action.tool.invoke',
    params: { actionId: 'read_runtime_info', input: {} }
  });

let getDefaultConfig = (manager: SlatesProviderProtoHandlerManager) =>
  SlatesProviderProtoHandlerManager.handleInput(manager, {
    jsonrpc: '2.0',
    id: 'config',
    method: 'slates/config.get_default',
    params: {}
  });

describe('hub runtime info', () => {
  it('advertises the runtime info capability', async () => {
    let response = await SlatesProviderProtoHandlerManager.handleInput(await createManager(), {
      jsonrpc: '2.0',
      id: 'capabilities',
      method: 'slates/provider.capabilities.get',
      params: {}
    });

    expect(response).toMatchObject({
      result: { capabilities: { hub: { runtimeInfo: true } } }
    });
  });

  it('exposes runtime info to tools through ctx and the context helper', async () => {
    let manager = await createManager();
    await setRuntimeInfo(manager);

    expect(await invokeTool(manager)).toMatchObject({
      result: { output: { fromContext: runtimeInfo, fromHelper: runtimeInfo } }
    });
  });

  it('exposes runtime info to handlers that receive no ctx argument', async () => {
    let manager = await createManager();
    await setRuntimeInfo(manager);

    expect(await getDefaultConfig(manager)).toMatchObject({
      result: { config: { apiUrl: runtimeInfo.metorial.apiUrl } }
    });
  });

  it('returns null when the host sent no runtime info', async () => {
    let manager = await createManager();

    expect(await invokeTool(manager)).toMatchObject({
      result: { output: { fromContext: null, fromHelper: null } }
    });
    expect(await getDefaultConfig(manager)).toMatchObject({
      result: { config: { apiUrl: null } }
    });
  });
});
