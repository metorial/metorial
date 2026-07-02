import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCalendars = SlateTool.create(spec, {
  name: 'List Calendars',
  key: 'list_calendars',
  description: `List all calendars available to the authenticated user, including the default calendar and any additional calendars for work, family, etc. Returns calendar metadata and permission details.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      calendars: z.array(
        z.object({
          calendarId: z.string(),
          name: z.string(),
          color: z.string().optional(),
          isDefaultCalendar: z.boolean().optional(),
          canEdit: z.boolean().optional(),
          canShare: z.boolean().optional(),
          ownerEmail: z.string().optional(),
          ownerName: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listCalendars();

    let calendars = result.value.map(c => ({
      calendarId: c.id,
      name: c.name,
      color: c.color,
      isDefaultCalendar: c.isDefaultCalendar,
      canEdit: c.canEdit,
      canShare: c.canShare,
      ownerEmail: c.owner?.address,
      ownerName: c.owner?.name
    }));

    return {
      output: { calendars },
      message: `Found **${calendars.length}** calendar(s).`
    };
  })
  .build();
