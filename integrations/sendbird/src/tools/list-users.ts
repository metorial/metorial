import { SlateTool } from 'slates';
import { z } from 'zod';
import { SendbirdChatClient } from '../lib/client';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List users in your Sendbird application with pagination. Filter by nickname, active status, or specific user IDs. Use the returned **nextToken** to fetch the next page.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .optional()
        .describe('Max number of users to return (default 10, max 100)'),
      nextToken: z.string().optional().describe('Pagination token from a previous response'),
      activeMode: z
        .enum(['activated', 'deactivated', 'all'])
        .optional()
        .describe('Filter by activation status'),
      showBot: z.boolean().optional().describe('Whether to include bot users'),
      userIds: z.array(z.string()).optional().describe('Filter to specific user IDs'),
      nickname: z.string().optional().describe('Filter by exact nickname'),
      nicknameStartswith: z.string().optional().describe('Filter by nickname prefix')
    })
  )
  .output(
    z.object({
      users: z
        .array(
          z.object({
            userId: z.string().describe('Unique user ID'),
            nickname: z.string().describe('Display name'),
            profileUrl: z.string().describe('Profile image URL'),
            isActive: z.boolean().describe('Whether the user is active'),
            isOnline: z.boolean().optional().describe('Whether the user is online'),
            lastSeenAt: z.number().optional().describe('Last seen timestamp'),
            createdAt: z.number().describe('Creation timestamp')
          })
        )
        .describe('List of users'),
      nextToken: z.string().optional().describe('Token for the next page of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SendbirdChatClient({
      applicationId: ctx.config.applicationId,
      token: ctx.auth.token
    });

    let result = await client.listUsers({
      limit: ctx.input.limit,
      token: ctx.input.nextToken,
      activeMode: ctx.input.activeMode,
      showBot: ctx.input.showBot,
      userIds: ctx.input.userIds,
      nickname: ctx.input.nickname,
      nicknameStartswith: ctx.input.nicknameStartswith
    });

    let users = (result.users ?? []).map((u: any) => ({
      userId: u.user_id,
      nickname: u.nickname,
      profileUrl: u.profile_url ?? '',
      isActive: u.is_active ?? true,
      isOnline: u.is_online,
      lastSeenAt: u.last_seen_at,
      createdAt: u.created_at ?? 0
    }));

    return {
      output: {
        users,
        nextToken: result.next || undefined
      },
      message: `Found **${users.length}** user(s).${result.next ? ' More results available.' : ''}`
    };
  })
  .build();
