import { SlateTool } from 'slates';
import { z } from 'zod';
import { SendbirdChatClient } from '../lib/client';
import { spec } from '../spec';

export let manageGroupChannelMembers = SlateTool.create(spec, {
  name: 'Manage Group Channel Members',
  key: 'manage_group_channel_members',
  description: `Invite users to or remove users from a group channel. Also supports listing current members with read/delivery receipt information.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      channelUrl: z.string().describe('URL of the group channel'),
      action: z
        .enum(['invite', 'remove', 'list'])
        .describe(
          '"invite" to add members, "remove" to remove members, "list" to list current members'
        ),
      userIds: z
        .array(z.string())
        .optional()
        .describe('User IDs to invite or remove (required for invite/remove)'),
      limit: z.number().optional().describe('Max members to return when listing (default 10)'),
      nextToken: z.string().optional().describe('Pagination token for listing members')
    })
  )
  .output(
    z.object({
      members: z
        .array(
          z.object({
            userId: z.string().describe('Member user ID'),
            nickname: z.string().describe('Member nickname'),
            profileUrl: z.string().describe('Profile image URL'),
            isActive: z.boolean().describe('Whether the member is active'),
            isOnline: z.boolean().optional().describe('Whether the member is online')
          })
        )
        .optional()
        .describe('List of members (only for list action)'),
      nextToken: z.string().optional().describe('Pagination token for next page'),
      success: z.boolean().describe('Whether the action was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SendbirdChatClient({
      applicationId: ctx.config.applicationId,
      token: ctx.auth.token
    });

    if (ctx.input.action === 'list') {
      let result = await client.listGroupChannelMembers(ctx.input.channelUrl, {
        limit: ctx.input.limit,
        token: ctx.input.nextToken
      });

      let members = (result.members ?? []).map((m: any) => ({
        userId: m.user_id,
        nickname: m.nickname,
        profileUrl: m.profile_url ?? '',
        isActive: m.is_active ?? true,
        isOnline: m.is_online
      }));

      return {
        output: {
          members,
          nextToken: result.next || undefined,
          success: true
        },
        message: `Found **${members.length}** member(s) in channel.${result.next ? ' More results available.' : ''}`
      };
    }

    if (ctx.input.action === 'invite') {
      await client.inviteToGroupChannel(ctx.input.channelUrl, ctx.input.userIds ?? []);
      return {
        output: { success: true },
        message: `Invited **${(ctx.input.userIds ?? []).length}** user(s) to channel **${ctx.input.channelUrl}**.`
      };
    }

    // remove
    await client.leaveGroupChannel(ctx.input.channelUrl, ctx.input.userIds ?? []);
    return {
      output: { success: true },
      message: `Removed **${(ctx.input.userIds ?? []).length}** user(s) from channel **${ctx.input.channelUrl}**.`
    };
  })
  .build();
