import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateBooth = SlateTool.create(spec, {
  name: 'Update Booth',
  key: 'update_booth',
  description: `Update a booth's properties such as admin notes, hold status, and metadata. Only provided fields will be updated.`,
  tags: {
    readOnly: false,
    destructive: true
  }
})
  .input(
    z.object({
      eventId: z.number().describe('ID of the event'),
      boothName: z.string().describe('Name of the booth to update'),
      adminNotes: z.string().optional().describe('Admin notes for the booth'),
      isOnHold: z.boolean().optional().describe('Whether to put the booth on hold'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom key-value metadata')
    })
  )
  .output(
    z.object({
      boothName: z.string().describe('Name of the updated booth')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    await client.updateBooth({
      eventId: ctx.input.eventId,
      name: ctx.input.boothName,
      adminNotes: ctx.input.adminNotes,
      isOnHold: ctx.input.isOnHold,
      metadata: ctx.input.metadata
    });

    return {
      output: {
        boothName: ctx.input.boothName
      },
      message: `Updated booth **${ctx.input.boothName}**.`
    };
  })
  .build();
