import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteGage = SlateTool.create(spec, {
  name: 'Delete Gage',
  key: 'delete_gage',
  description: `Delete a gage record from GageList by its ID.
This permanently removes the gage record and its associated data.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      gageId: z.number().describe('ID of the gage to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation was successful'),
      message: z.string().optional().describe('Response message from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.deleteGage(ctx.input.gageId);

    return {
      output: {
        success: result.success,
        message: result.message
      },
      message: `Deleted gage **${ctx.input.gageId}**.`
    };
  })
  .build();
