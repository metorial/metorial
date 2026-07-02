import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCredits = SlateTool.create(spec, {
  name: 'Get Credits',
  key: 'get_credits',
  description: `Retrieve the current credit balance for your account. Shows remaining credits, total credits per subscription period, and whether credits are unlimited, broken down by credit type (image downloads, generations, upscaling, etc.).`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      credits: z
        .array(
          z.object({
            type: z
              .string()
              .optional()
              .describe(
                'Credit type (e.g., global, f_images, f_images_print, f_images_upscaleHD, f_images_upscaleUHD)'
              ),
            credit: z.number().describe('Number of remaining credits'),
            creditTotal: z
              .number()
              .optional()
              .describe('Total credits renewed per subscription period'),
            unlimited: z.boolean().optional().describe('Whether credits are unlimited')
          })
        )
        .describe('Credit balances by type')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let credits = await client.getCredits();

    let summary = credits
      .map(
        c =>
          `${c.type ?? 'unknown'}: ${c.unlimited ? 'unlimited' : `${c.credit}${c.creditTotal ? `/${c.creditTotal}` : ''}`}`
      )
      .join(', ');

    return {
      output: { credits },
      message: `Credit balances: ${summary}`
    };
  })
  .build();
