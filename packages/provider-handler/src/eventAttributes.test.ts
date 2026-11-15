import { SLATES_PROTOCOL_VERSION, SlatesProviderProtoHandlerManager } from '@slates/proto';
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
import { extractEventAttributes } from './eventAttributes';
import { createProviderHandler } from './index';

describe('extractEventAttributes', () => {
  it('turns strings, finite numbers and booleans into one value each', () => {
    expect(
      extractEventAttributes(['id', 'size', 'shared'], { id: 'f1', size: 42, shared: false })
    ).toEqual({ id: ['f1'], size: ['42'], shared: ['false'] });
  });

  it('takes the scalar elements of arrays and skips the rest', () => {
    expect(
      extractEventAttributes(['parents'], {
        parents: ['a', 1, true, null, undefined, { id: 'x' }, ['nested'], Number.NaN]
      })
    ).toEqual({ parents: ['a', '1', 'true'] });
  });

  it('ignores null, undefined, objects, non-finite numbers and missing fields', () => {
    expect(
      extractEventAttributes(['a', 'b', 'c', 'd', 'e', 'missing'], {
        a: null,
        b: undefined,
        c: { id: 'x' },
        d: Number.POSITIVE_INFINITY,
        e: [[1]]
      })
    ).toEqual({});
  });

  it('drops empty and overlong values and removes duplicates', () => {
    expect(
      extractEventAttributes(['ids'], {
        ids: ['', 'a', 'a', 'x'.repeat(257), 'x'.repeat(256), 1, '1']
      })
    ).toEqual({ ids: ['a', 'x'.repeat(256), '1'] });
    expect(extractEventAttributes(['id'], { id: '' })).toEqual({});
  });

  it('keeps at most the first sixteen values', () => {
    let ids = Array.from({ length: 20 }, (_, i) => `id${i}`);
    expect(extractEventAttributes(['ids'], { ids })).toEqual({ ids: ids.slice(0, 16) });
  });

  it('only reads the declared fields', () => {
    expect(extractEventAttributes(['id'], { id: 'f1', other: 'x' })).toEqual({ id: ['f1'] });
    expect(extractEventAttributes([], { id: 'f1' })).toEqual({});
  });
});

let createManager = async () => {
  let spec = SlateSpecification.create({
    key: 'event-attributes-test',
    name: 'Event Attributes Test',
    config: SlateConfig.create(z.object({})),
    auth: SlateAuth.create().output(z.object({}))
  });
  let group = triggerGroup(spec, { key: 'files', name: 'Files' })
    .polling({ pollEvents: async () => ({ events: [] }) })
    .routingMatchers(async () => [])
    .build();
  let output = z.object({ fileId: z.string(), parents: z.array(z.string()) });
  let create = (key: string) =>
    SlateTrigger.create(spec, { key, name: key })
      .input(z.object({ fileId: z.string(), parents: z.array(z.string()) }))
      .output(output)
      .triggerGroup(group)
      .matches(() => true)
      .map(async ctx => ({ type: 'file.changed', id: ctx.input.fileId, output: ctx.input }));

  let slate = Slate.create({
    spec,
    triggers: [
      create('with_attributes').eventAttributes(['fileId', 'parents']).build(),
      create('without_attributes').build()
    ],
    tools: []
  });
  let manager = await createProviderHandler(slate, []).run();

  for (let message of [
    { method: 'slates/hello', params: { protocol: SLATES_PROTOCOL_VERSION } },
    { method: 'slates/participant.set', params: { participants: [] } },
    { method: 'slates/config.set', params: { config: {} } },
    { method: 'slates/session.start', params: { sessionId: 'session', state: {} } }
  ]) {
    await SlatesProviderProtoHandlerManager.handleInput(manager, {
      jsonrpc: '2.0',
      ...message
    } as any);
  }

  return manager;
};

let mapEvent = (manager: SlatesProviderProtoHandlerManager, actionId: string, input: any) =>
  SlatesProviderProtoHandlerManager.handleInput(manager, {
    jsonrpc: '2.0',
    id: 'map',
    method: 'slates/action.trigger.map_event',
    params: { actionId, input }
  }) as Promise<any>;

describe('slates/action.trigger.map_event event attributes', () => {
  it('returns the declared attributes next to the output', async () => {
    let manager = await createManager();
    let response = await mapEvent(manager, 'with_attributes', {
      fileId: 'f1',
      parents: ['p1', 'p2']
    });

    expect(response.result.output).toEqual({ fileId: 'f1', parents: ['p1', 'p2'] });
    expect(response.result.attributes).toEqual({ fileId: ['f1'], parents: ['p1', 'p2'] });
  });

  it('omits attributes when there are none', async () => {
    let manager = await createManager();

    let undeclared = await mapEvent(manager, 'without_attributes', {
      fileId: 'f1',
      parents: ['p1']
    });
    expect(undeclared.result).not.toHaveProperty('attributes');

    let empty = await mapEvent(manager, 'with_attributes', { fileId: '', parents: [] });
    expect(empty.result).not.toHaveProperty('attributes');
  });
});
