import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listPromotions = SlateTool.create(spec, {
  key: 'list_promotions',
  name: 'List Promotions',
  description:
    'List checkout promotions with their benefits, triggers, usage, and limitations.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      promotions: z.array(z.object({ id: z.string(), name: z.string() }).passthrough())
    })
  )
  .handleInvocation(async ctx => {
    let promotions = await new Client({
      token: ctx.auth.token,
      testMode: ctx.config.testMode
    }).listPromotions();
    return { output: { promotions }, message: `Found ${promotions.length} promotions.` };
  })
  .build();
