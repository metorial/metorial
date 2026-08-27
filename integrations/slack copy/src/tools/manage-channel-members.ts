import { SlateTool } from 'slates';
import { z } from 'zod';
import { SlackClient } from '../lib/client';
import { missingRequiredFieldError } from '../lib/errors';
import { slackActionScopes } from '../lib/scopes';
import { spec } from '../spec';

export let manageChannelMembers = SlateTool.create(spec, {
  name: 'Manage Channel Members',
  key: 'manage_channel_members',
  description: `Invite users to or remove users from a Slack channel. Also supports listing current channel members and joining/leaving channels.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(slackActionScopes.channelMembership)
  .input(
    z.object({
      action: z
        .enum(['invite', 'kick', 'join', 'leave', 'list'])
        .describe('The membership action to perform'),
      channelId: z.string().describe('Channel ID'),
      userIds: z
        .array(z.string())
        .optional()
        .describe(
          'User IDs to invite or a single user ID to remove (for invite/kick actions)'
        ),
      limit: z.number().optional().describe('Maximum members to return (for list action)'),
      cursor: z.string().optional().describe('Pagination cursor (for list action)')
    })
  )
  .output(
    z.object({
      channelId: z.string().describe('Channel ID'),
      members: z
        .array(z.string())
        .optional()
        .describe('List of member user IDs (for list action)'),
      nextCursor: z.string().optional().describe('Cursor for next page (for list action)'),
      actionPerformed: z.string().describe('Description of the action that was performed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SlackClient(ctx.auth.token);
    let { action, channelId, userIds } = ctx.input;

    if (action === 'invite') {
      if (!userIds || userIds.length === 0)
        throw missingRequiredFieldError('userIds', 'invite action');
      await client.inviteToConversation(channelId, userIds);
      return {
        output: {
          channelId,
          actionPerformed: `Invited ${userIds.length} user(s)`
        },
        message: `Invited ${userIds.length} user(s) to channel \`${channelId}\`.`
      };
    }

    if (action === 'kick') {
      if (!userIds || userIds.length === 0)
        throw missingRequiredFieldError('userIds', 'kick action');
      for (let userId of userIds) {
        await client.kickFromConversation(channelId, userId);
      }
      return {
        output: {
          channelId,
          actionPerformed: `Removed ${userIds.length} user(s)`
        },
        message: `Removed ${userIds.length} user(s) from channel \`${channelId}\`.`
      };
    }

    if (action === 'join') {
      await client.joinConversation(channelId);
      return {
        output: {
          channelId,
          actionPerformed: 'Joined channel'
        },
        message: `Joined channel \`${channelId}\`.`
      };
    }

    if (action === 'leave') {
      await client.leaveConversation(channelId);
      return {
        output: {
          channelId,
          actionPerformed: 'Left channel'
        },
        message: `Left channel \`${channelId}\`.`
      };
    }

    // list
    let result = await client.getConversationMembers(channelId, {
      limit: ctx.input.limit,
      cursor: ctx.input.cursor
    });

    return {
      output: {
        channelId,
        members: result.members,
        nextCursor: result.nextCursor,
        actionPerformed: `Listed ${result.members.length} member(s)`
      },
      message: `Listed ${result.members.length} member(s) in channel \`${channelId}\`.`
    };
  })
  .build();
