import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteUser = SlateTool.create(spec, {
  name: 'Delete User',
  key: 'delete_user',
  description: `Permanently deletes a user and all associated data including attributes, memberships, events, and flow history. Groups the user was a member of are left intact. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      userId: z.string().describe('ID of the user to delete')
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

    let result = await client.deleteUser(ctx.input.userId);

    return {
      output: {
        deleted: result.deleted
      },
      message: `User **${ctx.input.userId}** has been permanently deleted.`
    };
  })
  .build();
