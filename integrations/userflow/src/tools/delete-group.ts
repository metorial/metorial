import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteGroup = SlateTool.create(spec, {
  name: 'Delete Group',
  key: 'delete_group',
  description: `Permanently deletes a group (company) and all associated data including attributes, memberships, and events. Users who were members are left intact. This action cannot be undone.`,
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
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    let result = await client.deleteGroup(ctx.input.groupId);

    return {
      output: {
        deleted: result.deleted
      },
      message: `Group **${ctx.input.groupId}** has been permanently deleted.`
    };
  })
  .build();
