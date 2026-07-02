import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteLead = SlateTool.create(spec, {
  name: 'Delete Lead',
  key: 'delete_lead',
  description: `Move a lead to trash. Can also duplicate a lead before deleting, or perform a simple delete.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      leadId: z.number().describe('ID of the lead to delete')
    })
  )
  .output(
    z.object({
      leadId: z.number().describe('ID of the deleted lead'),
      deleted: z.boolean().describe('Whether the lead was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token
    });

    await client.deleteLead(ctx.input.leadId);

    return {
      output: {
        leadId: ctx.input.leadId,
        deleted: true
      },
      message: `Deleted lead ID: ${ctx.input.leadId} (moved to trash).`
    };
  })
  .build();
