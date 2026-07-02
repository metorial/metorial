import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCalendars = SlateTool.create(spec, {
  name: 'List Calendars',
  key: 'list_calendars',
  description: `Retrieve all calendars in the eTermin account, or get a specific calendar by ID. Returns calendar details including name, time slot configuration, capacity, and location.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      calendarId: z
        .string()
        .optional()
        .describe('Specific calendar ID to retrieve. Omit to list all calendars.')
    })
  )
  .output(
    z.object({
      calendars: z.array(z.record(z.string(), z.any())).describe('List of calendar records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      publicKey: ctx.auth.publicKey,
      privateKey: ctx.auth.privateKey
    });

    let result = await client.listCalendars(ctx.input.calendarId);

    let calendars = Array.isArray(result) ? result : [result];

    return {
      output: { calendars },
      message: `Found **${calendars.length}** calendar(s).`
    };
  })
  .build();
