import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCalendars = SlateTool.create(spec, {
  name: 'List Calendars',
  key: 'list_calendars',
  description: `Retrieve all connected calendars for the authenticated user. Shows calendar connections used for conflict checking and booking destinations, including Google, Outlook, Apple, and ICS feeds.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      calendars: z.any().describe('List of connected calendars and their details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let calendars = await client.listCalendars();

    return {
      output: { calendars },
      message: `Retrieved connected calendars.`
    };
  })
  .build();
