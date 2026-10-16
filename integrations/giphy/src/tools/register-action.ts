import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let registerAction = SlateTool.create(spec, {
  name: 'Register GIF Interaction',
  key: 'register_action',
  description:
    'Register an actual GIF or sticker view, click, or successful send using the corresponding onload, onclick, or onsent URL returned in its analytics metadata. Supply the timestamp when the interaction occurred and the same customerId used for this end user. Call only after that user action occurs.',
  instructions: [
    'Use analytics.onload.url after the GIF becomes visible, analytics.onclick.url for a click, and analytics.onsent.url after a successful send.',
    'Do not register a view or send merely because a GIF was returned by a search.'
  ],
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      analyticsUrl: z
        .string()
        .url()
        .describe(
          'Unmodified HTTPS analytics URL returned by GIPHY for the actual interaction'
        ),
      customerId: z
        .string()
        .min(1)
        .describe(
          'Stable end-user identifier, or the identifier returned by Create Random ID'
        ),
      timestamp: z
        .number()
        .int()
        .nonnegative()
        .describe('Actual interaction time as a Unix timestamp in milliseconds')
    })
  )
  .output(
    z.object({
      registered: z.boolean().describe('Whether GIPHY confirmed the interaction'),
      status: z.number().describe('Actual HTTP response status returned by GIPHY')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).registerAction(ctx.input);
    return {
      output: { registered: true, status: result.status },
      message: 'GIPHY confirmed the interaction.'
    };
  })
  .build();
