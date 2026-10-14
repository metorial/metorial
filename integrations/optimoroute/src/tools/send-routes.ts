import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendRoutes = SlateTool.create(spec, {
  name: 'Send Routes',
  key: 'send_routes',
  description:
    'Send planned routes for a date to drivers, optionally with the customer notifications configured for the account. Dispatch is asynchronous; call get_dispatch_status to check when routes have been sent.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      date: z.string().describe('Date whose routes will be sent (YYYY-MM-DD)'),
      sendNotifications: z
        .boolean()
        .optional()
        .describe('Send configured customer notifications with the routes. Defaults to true.')
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      date: z.string().optional(),
      code: z.string().optional(),
      message: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.sendRoutes(ctx.input);
    return {
      output: {
        success: result.success,
        date: result.date,
        code: result.code,
        message: result.message
      },
      message: `Routes for **${ctx.input.date}** are queued to be sent. Check Get Dispatch Status to verify completion.`
    };
  })
  .build();
