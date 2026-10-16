import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { rawSchema } from '../lib/types';
import { spec } from '../spec';

export let deleteCheck = SlateTool.create(spec, {
  name: 'Delete Check',
  key: 'delete_check',
  description: `Permanently delete an uptime monitoring check. This removes the check and all its historical data including downtimes and metrics.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      checkToken: z.string().describe('The unique token identifier of the check to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the check was successfully deleted'),
      raw: rawSchema.optional().describe('Complete original deletion response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.deleteCheck(ctx.input.checkToken);

    return {
      output: result,
      message: result.deleted
        ? `Deleted check \`${ctx.input.checkToken}\`.`
        : 'Updown.io did not confirm check deletion.'
    };
  })
  .build();
