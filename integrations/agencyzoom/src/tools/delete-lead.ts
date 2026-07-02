import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteLead = SlateTool.create(spec, {
  name: 'Delete Lead',
  key: 'delete_lead',
  description: `Permanently delete a lead from AgencyZoom by its ID. This action is irreversible and will remove the lead along with all associated data.`,
  constraints: [
    'This action is permanent and cannot be undone.',
    'All associated opportunities, quotes, notes, and files will also be removed.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      leadId: z.string().describe('Unique identifier of the lead to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the lead was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiKey: ctx.auth.apiKey,
      apiSecret: ctx.auth.apiSecret
    });

    await client.deleteLead(ctx.input.leadId);

    return {
      output: {
        success: true
      },
      message: `Deleted lead **${ctx.input.leadId}**.`
    };
  })
  .build();
