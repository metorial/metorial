import { SlateTool } from 'slates';
import { z } from 'zod';
import { ThanksIoClient } from '../lib/client';
import { spec } from '../spec';

export let getCreative = SlateTool.create(spec, {
  name: 'Get Creative',
  key: 'get_creative',
  description:
    'Read a saved creative, including the image and message templates it pairs and its completion state. Use list_creatives to discover creative IDs.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      creativeId: z.number().int().positive().describe('Creative ID from list_creatives')
    })
  )
  .output(
    z.object({
      creative: z.record(z.string(), z.unknown()),
      raw: z.record(z.string(), z.unknown()).describe('Complete provider response')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new ThanksIoClient({ token: ctx.auth.token }).getCreative(
      ctx.input.creativeId
    );
    return {
      output: { creative: (result.data || result) as Record<string, unknown>, raw: result },
      message: `Retrieved creative #${ctx.input.creativeId}.`
    };
  })
  .build();
