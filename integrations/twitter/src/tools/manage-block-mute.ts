import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { TwitterClient } from '../lib/client';
import { twitterServiceError } from '../lib/errors';
import { mapUser, userSchema } from '../lib/helpers';
import { spec } from '../spec';

export let manageBlockMute = SlateTool.create(spec, {
  name: 'Manage Block & Mute',
  key: 'manage_block_mute',
  description: `Block, unblock, mute, or unmute a user, or list blocked/muted users.`,
  instructions: [
    'Use **block**, **unblock**, **mute**, or **unmute** actions to manage user relationships.',
    'Use **list_blocked** or **list_muted** to retrieve blocked or muted users.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['block', 'unblock', 'mute', 'unmute', 'list_blocked', 'list_muted'])
        .describe('Action to perform'),
      userId: z.string().describe('Authenticated user ID'),
      targetUserId: z
        .string()
        .optional()
        .describe('Target user ID (required for block/unblock/mute/unmute)'),
      maxResults: z.number().optional().describe('Number of results for list actions'),
      paginationToken: z.string().optional().describe('Pagination token for list actions')
    })
  )
  .output(
    z.object({
      success: z.boolean().optional().describe('Whether the action was successful'),
      users: z.array(userSchema).optional().describe('Blocked or muted users'),
      nextToken: z.string().optional().describe('Pagination token for next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TwitterClient(ctx.auth.token);
    let { action, userId, targetUserId, maxResults, paginationToken } = ctx.input;

    if (action === 'block') {
      if (!targetUserId)
        throw twitterServiceError('targetUserId is required to block a user.');
      await client.blockUser(userId, targetUserId);
      return { output: { success: true }, message: `Blocked user ${targetUserId}.` };
    }

    if (action === 'unblock') {
      if (!targetUserId)
        throw twitterServiceError('targetUserId is required to unblock a user.');
      await client.unblockUser(userId, targetUserId);
      return { output: { success: true }, message: `Unblocked user ${targetUserId}.` };
    }

    if (action === 'mute') {
      if (!targetUserId) throw twitterServiceError('targetUserId is required to mute a user.');
      await client.muteUser(userId, targetUserId);
      return { output: { success: true }, message: `Muted user ${targetUserId}.` };
    }

    if (action === 'unmute') {
      if (!targetUserId)
        throw twitterServiceError('targetUserId is required to unmute a user.');
      await client.unmuteUser(userId, targetUserId);
      return { output: { success: true }, message: `Unmuted user ${targetUserId}.` };
    }

    if (action === 'list_blocked') {
      let result = await client.getBlockedUsers(userId, { maxResults, paginationToken });
      let users = (result.data || []).map(mapUser);
      return {
        output: { users, nextToken: result.meta?.next_token },
        message: `Retrieved **${users.length}** blocked user(s).`
      };
    }

    if (action === 'list_muted') {
      let result = await client.getMutedUsers(userId, { maxResults, paginationToken });
      let users = (result.data || []).map(mapUser);
      return {
        output: { users, nextToken: result.meta?.next_token },
        message: `Retrieved **${users.length}** muted user(s).`
      };
    }

    throw twitterServiceError('Invalid action.');
  })
  .build();
