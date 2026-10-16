import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { requiredNumber } from '../lib/response';
import { spec } from '../spec';

export let calculateCredits = SlateTool.create(spec, {
  name: 'Calculate Credits',
  key: 'calculate_credits',
  description:
    'Preview the loyalty credits for a unit value without awarding them. Time-based loyalty rules can make the final award differ from this preview.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      shopUuid: z
        .string()
        .optional()
        .describe('Shop UUID from list_shops; falls back to the configured shop'),
      unitValue: z
        .number()
        .describe('Value to calculate credits for, such as purchase amount in currency units'),
      unitName: z.string().optional().describe('Unit name; omit to use the provider default'),
      contactUuid: z
        .string()
        .optional()
        .describe('Contact UUID for contact-specific loyalty rules')
    })
  )
  .output(z.object({ credits: z.number(), raw: z.record(z.string(), z.any()) }))
  .handleInvocation(async ctx => {
    let shopUuid = ctx.input.shopUuid || ctx.config.shopUuid;
    if (!shopUuid)
      throw createApiServiceError(
        'Provide shopUuid from list_shops or configure a default shop.'
      );
    let result = await new Client({ token: ctx.auth.token }).calculateCredits({
      ...ctx.input,
      shopUuid
    });
    return {
      output: { credits: requiredNumber(result.data.credits, 'credits'), raw: result.data },
      message: `Calculated loyalty credits for ${ctx.input.unitValue}.`
    };
  })
  .build();
