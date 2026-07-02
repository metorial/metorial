import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getNotifications = SlateTool.create(spec, {
  name: 'Get Notifications',
  key: 'get_notifications',
  description: `Retrieve recent notifications from DataScope within a date range. Notifications include generated PDF or Excel reports, with file URLs, form names, user info, and creation dates.`,
  instructions: ['Dates should be in YYYY-MM-DD format.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      start: z.string().optional().describe('Start date for filtering (YYYY-MM-DD)'),
      end: z.string().optional().describe('End date for filtering (YYYY-MM-DD)')
    })
  )
  .output(
    z.object({
      notifications: z.array(z.any()).describe('Array of notification records with file URLs'),
      count: z.number().describe('Number of notifications returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let results = await client.getNotifications({
      start: ctx.input.start,
      end: ctx.input.end
    });

    let notifications = Array.isArray(results) ? results : [];

    return {
      output: {
        notifications,
        count: notifications.length
      },
      message: `Retrieved **${notifications.length}** notification(s)${ctx.input.start ? ` from ${ctx.input.start}` : ''}${ctx.input.end ? ` to ${ctx.input.end}` : ''}.`
    };
  })
  .build();
