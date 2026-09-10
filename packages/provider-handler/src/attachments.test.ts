import { SLATES_PROTOCOL_VERSION, SlatesProviderProtoHandlerManager } from '@slates/proto';
import {
  Slate,
  SlateAuth,
  SlateConfig,
  SlatePublicTool,
  SlateSpecification
} from '@slates/provider';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createProviderHandler } from './index';

let createManager = async () => {
  let spec = SlateSpecification.create({
    key: 'attachments-test',
    name: 'Attachments Test',
    config: SlateConfig.create(z.object({})),
    auth: SlateAuth.create().output(z.object({}))
  });
  let tool = SlatePublicTool.create(spec, {
    key: 'attach',
    name: 'Attach'
  })
    .input(z.object({}))
    .output(z.object({}))
    .handleInvocation(async ctx => {
      await ctx.addAttachment({
        type: 'content',
        content: new Response('hello', {
          headers: { 'content-type': 'text/plain' }
        }),
        filename: 'hello.txt'
      });

      return { output: {}, message: 'ok' };
    })
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

let invoke = async (manager: SlatesProviderProtoHandlerManager) =>
  SlatesProviderProtoHandlerManager.handleInput(manager, {
    jsonrpc: '2.0',
    id: 'request',
    method: 'slates/action.tool.invoke',
    params: { actionId: 'attach', input: {} }
  });

let expectInlineAttachment = (response: Awaited<ReturnType<typeof invoke>>) => {
  expect(response).toMatchObject({
    result: {
      attachments: [
        {
          mimeType: 'text/plain',
          content: {
            type: 'content',
            encoding: 'base64',
            content: Buffer.from('hello').toString('base64')
          }
        }
      ]
    }
  });
};

describe('addAttachment fallback', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a standard inline attachment when capabilities and a live token are absent', async () => {
    let fetchSpy = vi.spyOn(globalThis, 'fetch');
    let response = await invoke(await createManager());

    expectInlineAttachment(response);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns a standard inline attachment when direct upload is enabled without a live token', async () => {
    let manager = await createManager();
    let fetchSpy = vi.spyOn(globalThis, 'fetch');

    await SlatesProviderProtoHandlerManager.handleInput(manager, {
      jsonrpc: '2.0',
      method: 'slates/hub.capabilities.set',
      params: { capabilities: { attachments: { directUpload: { enabled: true } } } }
    });

    expectInlineAttachment(await invoke(manager));
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns a standard inline attachment when a live token exists without the capability', async () => {
    let manager = await createManager();
    let fetchSpy = vi.spyOn(globalThis, 'fetch');

    await SlatesProviderProtoHandlerManager.handleInput(manager, {
      jsonrpc: '2.0',
      method: 'slates/hub.live_invocation.set',
      params: { token: 'token', baseUrl: 'https://hub.example' }
    });

    expectInlineAttachment(await invoke(manager));
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('uses direct upload only when both the capability and live token exist', async () => {
    let manager = await createManager();
    let fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            attachments: [
              {
                referenceId: 'attachment-reference',
                uploadUrl: 'https://uploads.example/attachment'
              }
            ]
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        )
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }));

    await SlatesProviderProtoHandlerManager.handleInput(manager, {
      jsonrpc: '2.0',
      method: 'slates/hub.capabilities.set',
      params: { capabilities: { attachments: { directUpload: { enabled: true } } } }
    });
    await SlatesProviderProtoHandlerManager.handleInput(manager, {
      jsonrpc: '2.0',
      method: 'slates/hub.live_invocation.set',
      params: { token: 'token', baseUrl: 'https://hub.example' }
    });

    expect(await invoke(manager)).toMatchObject({
      result: {
        attachments: [
          {
            mimeType: 'text/plain',
            content: {
              type: 'upload_reference',
              referenceId: 'attachment-reference'
            }
          }
        ]
      }
    });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
