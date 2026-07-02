import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteGroup = SlateTool.create(spec, {
  name: 'Delete Group',
  key: 'delete_group',
  description: `Permanently delete a VEO group (community). This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      groupId: z.string().describe('ID of the group to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, environment: ctx.auth.environment });
    await client.deleteGroup(ctx.input.groupId);

    return {
      output: { success: true },
      message: `Deleted group \`${ctx.input.groupId}\`.`
    };
  })
  .build();
