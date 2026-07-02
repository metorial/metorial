import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getBooth = SlateTool.create(spec, {
  name: 'Get Booth',
  key: 'get_booth',
  description: `Retrieve full details of a specific booth by event ID and booth name. Returns admin notes, hold status, metadata, and assigned exhibitors with their IDs.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      eventId: z.number().describe('ID of the event'),
      boothName: z.string().describe('Name of the booth to retrieve')
    })
  )
  .output(
    z.object({
      name: z.string().describe('Booth name'),
      adminNotes: z.string().describe('Admin notes'),
      isOnHold: z.boolean().describe('Whether booth is on hold'),
      isSpecialSection: z.boolean().describe('Whether booth is a special section'),
      metadata: z.record(z.string(), z.string()).describe('Custom key-value metadata'),
      exhibitors: z
        .array(
          z.object({
            exhibitorId: z.number().describe('Exhibitor ID'),
            name: z.string().describe('Exhibitor name')
          })
        )
        .describe('Exhibitors assigned to this booth')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let booth = await client.getBooth(ctx.input.eventId, ctx.input.boothName);

    return {
      output: {
        name: booth.name,
        adminNotes: booth.adminNotes ?? '',
        isOnHold: booth.isOnHold ?? false,
        isSpecialSection: booth.isSpecialSection ?? false,
        metadata: booth.metadata ?? {},
        exhibitors: (booth.exhibitors ?? []).map(e => ({
          exhibitorId: e.id,
          name: e.name
        }))
      },
      message: `Retrieved booth **${booth.name}**.`
    };
  })
  .build();
