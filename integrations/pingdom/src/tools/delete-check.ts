import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteCheck = SlateTool.create(spec, {
  name: 'Delete Uptime Check',
  key: 'delete_check',
  description: `Permanently deletes an uptime check and all associated historical data. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      checkId: z.number().describe('ID of the check to delete')
    })
  )
  .output(
    z.object({
      message: z.string().describe('Confirmation message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountEmail: ctx.auth.accountEmail
    });

    let result = await client.deleteCheck(ctx.input.checkId);

    return {
      output: {
        message: result.message || 'Check deleted successfully'
      },
      message: `Deleted uptime check **${ctx.input.checkId}**.`
    };
  })
  .build();
