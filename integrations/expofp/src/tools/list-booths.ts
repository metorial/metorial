import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listBooths = SlateTool.create(spec, {
  name: 'List Booths',
  key: 'list_booths',
  description: `Retrieve all booths for a given event. Returns booth names, assigned exhibitors, and whether a booth is a special section. Useful for browsing booth availability and assignments.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      eventId: z.number().describe('ID of the event to list booths for')
    })
  )
  .output(
    z.object({
      booths: z
        .array(
          z.object({
            name: z.string().describe('Booth name/identifier'),
            exhibitors: z.array(z.string()).describe('Names of assigned exhibitors'),
            isSpecialSection: z.boolean().describe('Whether booth is a special section')
          })
        )
        .describe('List of booths')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let booths = await client.listBooths(ctx.input.eventId);

    return {
      output: {
        booths: booths.map(b => ({
          name: b.name,
          exhibitors: b.exhibitors ?? [],
          isSpecialSection: b.isSpecialSection ?? false
        }))
      },
      message: `Found **${booths.length}** booth(s) for event ${ctx.input.eventId}.`
    };
  })
  .build();
