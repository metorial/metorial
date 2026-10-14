import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let sendStatus = z.object({
  state: z.string().describe('not_sent, scheduled, or sent'),
  sentAtUtc: z.string().nullable(),
  scheduledForUtc: z.string().nullable(),
  changes: z
    .object({
      totalCnt: z.number(),
      addedCnt: z.number(),
      modifiedCnt: z.number(),
      removedCnt: z.number()
    })
    .optional()
});

export let getDispatchStatus = SlateTool.create(spec, {
  name: 'Get Dispatch Status',
  key: 'get_dispatch_status',
  description:
    'Check the send status of routes and configured customer notifications for a date, or for the current live routes. Optionally include counts of route changes since dispatch.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      date: z
        .string()
        .optional()
        .describe('Date to query (YYYY-MM-DD). Omit to query the current live routes.'),
      includeRouteChanges: z
        .boolean()
        .optional()
        .describe('Include counts of routes added, modified, or removed since dispatch')
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      date: z.string().nullable(),
      live: z.boolean(),
      routes: sendStatus,
      notifications: sendStatus,
      code: z.string().optional(),
      message: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getDispatchStatus(ctx.input);
    return {
      output: {
        success: result.success,
        date: result.date,
        live: result.live,
        routes: result.routes,
        notifications: result.notifications,
        code: result.code,
        message: result.message
      },
      message: `Route dispatch status${result.date ? ` for **${result.date}**` : ''}: **${result.routes.state}**. Customer notifications: **${result.notifications.state}**.`
    };
  })
  .build();
