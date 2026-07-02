import { SlateTool } from 'slates';
import { z } from 'zod';
import { TwitchClient } from '../lib/client';
import { spec } from '../spec';

export let manageModeration = SlateTool.create(spec, {
  name: 'Manage Moderation',
  key: 'manage_moderation',
  description: `Perform moderation actions on a channel: ban/unban users, timeout users, delete messages, and manage Shield Mode. Combines all common moderation operations into a single tool.`,
  instructions: [
    'For a **timeout**, set action to "ban" and provide a **durationSeconds** (1-1,209,600).',
    'For a **permanent ban**, set action to "ban" without durationSeconds.',
    'To **unban** a user (also clears timeouts), set action to "unban".'
  ],
  constraints: ['Timeout duration is 1 second to 1,209,600 seconds (2 weeks).'],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      broadcasterId: z.string().describe('Channel broadcaster ID'),
      action: z
        .enum(['ban', 'unban', 'delete_message', 'shield_mode_on', 'shield_mode_off'])
        .describe('Moderation action to perform'),
      targetUserId: z.string().optional().describe('Target user ID (required for ban/unban)'),
      durationSeconds: z
        .number()
        .optional()
        .describe('Timeout duration in seconds (for ban action; omit for permanent ban)'),
      reason: z.string().optional().describe('Reason for the ban or timeout'),
      messageId: z
        .string()
        .optional()
        .describe('Message ID to delete (for delete_message action)')
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      action: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new TwitchClient(ctx.auth.token, ctx.auth.clientId);
    let user = await client.getAuthenticatedUser();
    let moderatorId = user.id;

    switch (ctx.input.action) {
      case 'ban': {
        if (!ctx.input.targetUserId)
          throw new Error('targetUserId is required for ban action');
        await client.banUser(ctx.input.broadcasterId, moderatorId, {
          userId: ctx.input.targetUserId,
          duration: ctx.input.durationSeconds,
          reason: ctx.input.reason
        });
        let actionDesc = ctx.input.durationSeconds
          ? `Timed out user \`${ctx.input.targetUserId}\` for ${ctx.input.durationSeconds}s`
          : `Permanently banned user \`${ctx.input.targetUserId}\``;
        return {
          output: { success: true, action: ctx.input.durationSeconds ? 'timeout' : 'ban' },
          message: actionDesc
        };
      }

      case 'unban': {
        if (!ctx.input.targetUserId)
          throw new Error('targetUserId is required for unban action');
        await client.unbanUser(ctx.input.broadcasterId, moderatorId, ctx.input.targetUserId);
        return {
          output: { success: true, action: 'unban' },
          message: `Unbanned user \`${ctx.input.targetUserId}\``
        };
      }

      case 'delete_message': {
        if (!ctx.input.messageId)
          throw new Error('messageId is required for delete_message action');
        await client.deleteChatMessage(
          ctx.input.broadcasterId,
          moderatorId,
          ctx.input.messageId
        );
        return {
          output: { success: true, action: 'delete_message' },
          message: `Deleted message \`${ctx.input.messageId}\``
        };
      }

      case 'shield_mode_on': {
        await client.updateShieldMode(ctx.input.broadcasterId, moderatorId, true);
        return {
          output: { success: true, action: 'shield_mode_on' },
          message: 'Shield Mode activated'
        };
      }

      case 'shield_mode_off': {
        await client.updateShieldMode(ctx.input.broadcasterId, moderatorId, false);
        return {
          output: { success: true, action: 'shield_mode_off' },
          message: 'Shield Mode deactivated'
        };
      }
    }
  })
  .build();
