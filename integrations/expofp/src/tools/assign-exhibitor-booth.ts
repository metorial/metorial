import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let assignExhibitorBooth = SlateTool.create(spec, {
  name: 'Assign Exhibitor to Booth',
  key: 'assign_exhibitor_booth',
  description: `Assign an exhibitor to a booth or remove an exhibitor from a booth. Use "assign" to link an exhibitor to a booth, or "remove" to unlink them.`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['assign', 'remove'])
        .describe('Whether to assign or remove the exhibitor from the booth'),
      eventId: z.number().describe('ID of the event'),
      exhibitorId: z.number().describe('ID of the exhibitor'),
      boothName: z.string().describe('Name of the booth')
    })
  )
  .output(
    z.object({
      eventId: z.number().describe('Event ID'),
      exhibitorId: z.number().describe('Exhibitor ID'),
      boothName: z.string().describe('Booth name'),
      action: z.string().describe('Action performed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let { action, eventId, exhibitorId, boothName } = ctx.input;

    if (action === 'assign') {
      await client.addExhibitorBooth(eventId, exhibitorId, boothName);
    } else {
      await client.removeExhibitorBooth(eventId, exhibitorId, boothName);
    }

    return {
      output: {
        eventId,
        exhibitorId,
        boothName,
        action
      },
      message:
        action === 'assign'
          ? `Assigned exhibitor **${exhibitorId}** to booth **${boothName}**.`
          : `Removed exhibitor **${exhibitorId}** from booth **${boothName}**.`
    };
  })
  .build();
