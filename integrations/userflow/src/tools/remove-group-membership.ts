import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let removeGroupMembership = SlateTool.create(spec, {
  name: 'Remove Group Membership',
  key: 'remove_group_membership',
  description: `Removes a user from a group (company). Both the user and group remain intact — only the membership link is deleted.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      userId: z.string().describe('ID of the user to remove from the group'),
      groupId: z.string().describe('ID of the group to remove the user from')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the membership was successfully removed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    let result = await client.removeGroupMembership(ctx.input.userId, ctx.input.groupId);

    return {
      output: {
        deleted: result.deleted
      },
      message: `Removed user **${ctx.input.userId}** from group **${ctx.input.groupId}**.`
    };
  })
  .build();
