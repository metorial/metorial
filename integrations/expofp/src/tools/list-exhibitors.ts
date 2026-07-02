import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listExhibitors = SlateTool.create(spec, {
  name: 'List Exhibitors',
  key: 'list_exhibitors',
  description: `Retrieve all exhibitors for a given event. Returns exhibitor names, IDs, external IDs, and assigned booth names. Useful for browsing all exhibitors at an event or finding a specific exhibitor's ID for further operations.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      eventId: z.number().describe('ID of the event to list exhibitors for')
    })
  )
  .output(
    z.object({
      exhibitors: z
        .array(
          z.object({
            exhibitorId: z.number().describe('Unique exhibitor ID'),
            name: z.string().describe('Exhibitor name'),
            externalId: z.string().describe('External ID for integration'),
            boothNames: z.array(z.string()).describe('Names of assigned booths')
          })
        )
        .describe('List of exhibitors')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let exhibitors = await client.listExhibitors(ctx.input.eventId);

    return {
      output: {
        exhibitors: exhibitors.map(e => ({
          exhibitorId: e.id,
          name: e.name,
          externalId: e.externalId ?? '',
          boothNames: e.boothNames ?? []
        }))
      },
      message: `Found **${exhibitors.length}** exhibitor(s) for event ${ctx.input.eventId}.`
    };
  })
  .build();
