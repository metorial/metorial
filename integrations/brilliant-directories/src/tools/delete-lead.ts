import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteLead = SlateTool.create(spec, {
  name: 'Delete Lead',
  key: 'delete_lead',
  description: `Permanently delete a lead from the directory. Only one lead can be deleted at a time.`,
  constraints: ['Only one lead can be deleted at a time.'],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      leadId: z.string().describe('The lead ID to delete.')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status from the API.'),
      confirmation: z.string().describe('Confirmation message from the API.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      websiteDomain: ctx.config.websiteDomain
    });

    let result = await client.deleteLead(ctx.input.leadId);

    return {
      output: {
        status: result.status,
        confirmation:
          typeof result.message === 'string' ? result.message : JSON.stringify(result.message)
      },
      message: `Deleted lead **${ctx.input.leadId}**.`
    };
  })
  .build();
