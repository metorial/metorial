import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageGroupMembers = SlateTool.create(spec, {
  name: 'Manage Group Members',
  key: 'manage_group_members',
  description: `Add or remove users from a permission group. Use "add" to add one or more users, or "remove" to remove a single user from the group.`
})
  .input(
    z.object({
      groupId: z.number().describe('The numeric ID of the group'),
      action: z.enum(['add', 'remove']).describe('Whether to add or remove members'),
      members: z
        .array(
          z.object({
            userId: z.string().describe('User ID to add or remove'),
            isGroupAdmin: z
              .boolean()
              .optional()
              .describe('Whether the user should be a group admin (only for "add" action)')
          })
        )
        .describe('Users to add or remove. For "remove", only the first user is processed.')
    })
  )
  .output(
    z.object({
      groupId: z.number(),
      action: z.string(),
      success: z.boolean(),
      affectedUserIds: z.array(z.string())
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });

    let affectedUserIds: string[] = [];

    if (ctx.input.action === 'add') {
      await client.addGroupMembers(
        ctx.input.groupId,
        ctx.input.members.map(m => ({ id: m.userId, isGroupAdmin: m.isGroupAdmin }))
      );
      affectedUserIds = ctx.input.members.map(m => m.userId);
    } else {
      for (let member of ctx.input.members) {
        await client.removeGroupMember(ctx.input.groupId, member.userId);
        affectedUserIds.push(member.userId);
      }
    }

    return {
      output: {
        groupId: ctx.input.groupId,
        action: ctx.input.action,
        success: true,
        affectedUserIds
      },
      message: `${ctx.input.action === 'add' ? 'Added' : 'Removed'} **${affectedUserIds.length}** member(s) ${ctx.input.action === 'add' ? 'to' : 'from'} group \`${ctx.input.groupId}\`.`
    };
  })
  .build();
