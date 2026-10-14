import { SlateTool } from 'slates';
import { z } from 'zod';
import { DiffbotClient } from '../lib/client';
import { spec } from '../spec';

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account',
  key: 'get_account',
  description:
    'Get the connected Diffbot account name, email, plan, status, and recent API usage.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      days: z
        .number()
        .refine(value => Number.isSafeInteger(value) && value > 0)
        .optional()
        .describe('Number of days of API usage to retrieve. Defaults to 31.')
    })
  )
  .output(
    z
      .object({
        name: z.string().optional(),
        email: z.string().optional(),
        plan: z.string().optional(),
        planCredits: z.number().optional(),
        status: z.string().optional(),
        created: z.string().optional(),
        usage: z.array(z.record(z.string(), z.unknown())).optional()
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let account = await new DiffbotClient(ctx.auth).getAccount(ctx.input.days);
    return {
      output: account,
      message: `Retrieved Diffbot account details${account.name ? ` for **${account.name}**` : ''}.`
    };
  })
  .build();
