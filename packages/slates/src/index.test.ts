import * as provider from '@slates/provider';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import * as slates from './index';

describe('slates intermediary contract', () => {
  it('re-exports configV2 and receiver-bound tool declarations from the pinned provider', () => {
    expect(slates.configV2).toBe(provider.configV2);
    expect(slates.SlateTool).toBe(provider.SlateTool);

    let config = slates.configV2({
      fields: {
        endpoint: { schema: z.string().url(), visibility: 'plain', lifecycle: 'none' },
        token: { schema: z.string(), visibility: 'secret', lifecycle: 'reregister' }
      }
    });
    let auth = slates.SlateAuth.create().output(z.object({})).addNone();
    let spec = slates.SlateSpecification.create({
      key: 'intermediary-contract',
      name: 'Intermediary Contract',
      config,
      auth
    });
    let tool = slates.SlateTool.create(spec, {
      key: 'receiver_bound',
      name: 'Receiver Bound',
      description: 'Contract fixture'
    })
      .input(z.object({ value: z.string() }))
      .output(z.object({ value: z.string() }))
      .receiverBoundToolContextV1(['callback_secret'])
      .handleInvocation(async ctx => ({ output: { ...ctx.input }, message: ctx.input.value }))
      .build();

    expect(config.wireSchema).toMatchObject({ version: 2 });
    expect((tool as any)._params.receiverBoundToolContextV1).toEqual({
      secretNames: ['callback_secret']
    });
  });
});
