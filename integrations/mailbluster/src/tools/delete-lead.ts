import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteLead = SlateTool.create(spec, {
  name: 'Delete Lead',
  key: 'delete_lead',
  description: `Permanently deletes a lead by their email address. This action cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      email: z.string().describe('Email address of the lead to delete')
    })
  )
  .output(
    z.object({
      message: z.string().describe('Confirmation message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.deleteLead(ctx.input.email);

    return {
      output: {
        message: result.message || `Lead ${ctx.input.email} deleted`
      },
      message: `Lead **${ctx.input.email}** deleted successfully.`
    };
  })
  .build();
