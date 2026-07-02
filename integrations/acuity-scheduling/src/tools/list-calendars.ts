import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCalendars = SlateTool.create(spec, {
  name: 'List Calendars',
  key: 'list_calendars',
  description: `Retrieve all calendars (staff members or locations) configured in the account. Use calendar IDs when creating appointments or checking availability.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      calendars: z
        .array(
          z.object({
            calendarId: z.number().describe('Calendar ID'),
            name: z.string().describe('Calendar name'),
            email: z.string().optional().describe('Calendar email'),
            description: z.string().optional().describe('Calendar description'),
            thumbnail: z.string().optional().describe('Thumbnail image URL'),
            timezone: z.string().optional().describe('Calendar timezone')
          })
        )
        .describe('List of calendars')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    let results = await client.listCalendars();

    let calendars = (results as any[]).map((c: any) => ({
      calendarId: c.id,
      name: c.name || '',
      email: c.email || undefined,
      description: c.description || undefined,
      thumbnail: c.thumbnail || undefined,
      timezone: c.timezone || undefined
    }));

    return {
      output: { calendars },
      message: `Found **${calendars.length}** calendar(s).`
    };
  })
  .build();
