import { ServiceError } from '@lowerdeck/error';
import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import {
  assertNoCredentialReflection,
  clientFor,
  invalid,
  validateMemberIds
} from '../lib/client';
import { spec } from '../spec';

export let manageGroupMembers = SlateTool.create(spec, {
  name: 'Manage Group Members',
  key: 'manage_group_members',
  description: `Add or remove users from a permission group. Use "add" to add one or more users, or "remove" to remove the listed users. Removal is sequential; an error can follow a partial change.`
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
        .describe('Users to add or remove. Removal is sequential and can partially complete.')
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
    let client = clientFor(ctx);

    if (!ctx.input.members.length) throw invalid('Provide at least one member.');
    validateMemberIds(
      ctx.input.groupId,
      ctx.input.members.map(m => m.userId)
    );
    assertNoCredentialReflection(ctx.input, ctx.auth.token);
    let affectedUserIds: string[] = [];

    if (ctx.input.action === 'add') {
      await client.addGroupMembers(
        ctx.input.groupId,
        ctx.input.members.map(m => ({ id: m.userId, isGroupAdmin: m.isGroupAdmin }))
      );
      affectedUserIds = ctx.input.members.map(m => m.userId);
    } else {
      for (let [index, member] of ctx.input.members.entries()) {
        try {
          await client.removeGroupMember(ctx.input.groupId, member.userId);
        } catch (error) {
          let notAttemptedUserIds = ctx.input.members.slice(index + 1).map(m => m.userId);
          let failure = createApiServiceError(
            `Removal from group ${ctx.input.groupId} stopped. Native receipts confirmed removal of: ${affectedUserIds.join(', ') || 'none'}. Removal of ${member.userId} is uncertain. These users were not attempted: ${notAttemptedUserIds.join(', ') || 'none'}. Read the exact group before retrying; this operation is not atomic.`,
            {
              reason: 'retool_partial_group_removal',
              upstreamStatus:
                error instanceof ServiceError ? error.data.upstreamStatus : undefined,
              upstreamCode: error instanceof ServiceError ? error.data.upstreamCode : undefined
            }
          );
          failure.data.groupId = ctx.input.groupId;
          failure.data.confirmedRemovedUserIds = [...affectedUserIds];
          failure.data.uncertainUserId = member.userId;
          failure.data.notAttemptedUserIds = notAttemptedUserIds;
          throw failure;
        }
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
