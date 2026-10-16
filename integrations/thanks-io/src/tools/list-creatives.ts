import { SlateTool } from 'slates';
import { z } from 'zod';
import { ThanksIoClient } from '../lib/client';
import { mailerTypeSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listCreatives = SlateTool.create(spec, {
  name: 'List Creatives',
  key: 'list_creatives',
  description:
    'Discover saved creatives with their IDs, mailer types and completion state. Use a complete creative ID to estimate or send its saved design. Results contain 24 creatives per page.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      page: z.number().int().positive().optional(),
      subAccountId: z.number().int().positive().optional(),
      mailerType: mailerTypeSchema.optional(),
      completeOnly: z.boolean().optional().describe('Only creatives ready to send'),
      search: z.string().optional().describe('Filter by creative name'),
      includeHidden: z.boolean().optional()
    })
  )
  .output(
    z.object({
      creatives: z.array(z.record(z.string(), z.unknown())),
      raw: z
        .record(z.string(), z.unknown())
        .describe('Complete provider response with pagination')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new ThanksIoClient({ token: ctx.auth.token }).listCreatives(ctx.input);
    let creatives = (result.data || []) as Record<string, unknown>[];
    return {
      output: { creatives, raw: result },
      message: `Retrieved ${creatives.length} creative(s).`
    };
  })
  .build();
