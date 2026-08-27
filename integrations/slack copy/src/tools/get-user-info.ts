import { SlateTool } from 'slates';
import { z } from 'zod';
import { SlackClient } from '../lib/client';
import { isSlackApiErrorCode, missingRequiredAlternativeError } from '../lib/errors';
import { slackActionScopes } from '../lib/scopes';
import type { SlackUser } from '../lib/types';
import { spec } from '../spec';

let userOutputSchema = z.object({
  userId: z.string().describe('Slack user ID'),
  teamId: z.string().optional().describe('Workspace team ID'),
  name: z.string().optional().describe('Username'),
  realName: z.string().optional().describe('Full real name'),
  displayName: z.string().optional().describe('Display name'),
  email: z.string().optional().describe('Email address'),
  title: z.string().optional().describe('Job title'),
  phone: z.string().optional().describe('Phone number'),
  statusText: z.string().optional().describe('Custom status text'),
  statusEmoji: z.string().optional().describe('Custom status emoji'),
  timezone: z.string().optional().describe('Timezone label'),
  isAdmin: z.boolean().optional().describe('Whether the user is a workspace admin'),
  isOwner: z.boolean().optional().describe('Whether the user is a workspace owner'),
  isBot: z.boolean().optional().describe('Whether this is a bot user'),
  deleted: z.boolean().optional().describe('Whether the user is deactivated'),
  avatarUrl: z.string().optional().describe('User avatar image URL')
});

export let getUserInfo = SlateTool.create(spec, {
  name: 'Get User Info',
  key: 'get_user_info',
  description: `Look up a Slack user's profile and status. Search by user ID, email address, or list all workspace members.`,
  instructions: [
    'Provide **userId** to look up a specific user.',
    'Provide **email** to find a user by their email address.',
    'Set **listAll** to true to list workspace members (paginated).'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .scopes(slackActionScopes.userInfo)
  .input(
    z.object({
      userId: z.string().optional().describe('Slack user ID to look up'),
      email: z.string().optional().describe('Email address to look up a user'),
      listAll: z.boolean().optional().describe('List all workspace members'),
      limit: z.number().optional().describe('Maximum users to return when listing all'),
      cursor: z.string().optional().describe('Pagination cursor for listing all users')
    })
  )
  .output(
    z.object({
      users: z.array(userOutputSchema).describe('List of user profiles'),
      nextCursor: z.string().optional().describe('Cursor for next page when listing all users')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SlackClient(ctx.auth.token);

    let mapUser = (u: any) => ({
      userId: u.id,
      teamId: u.team_id,
      name: u.name,
      realName: u.real_name || u.profile?.real_name,
      displayName: u.profile?.display_name,
      email: u.profile?.email,
      title: u.profile?.title,
      phone: u.profile?.phone,
      statusText: u.profile?.status_text,
      statusEmoji: u.profile?.status_emoji,
      timezone: u.tz_label,
      isAdmin: u.is_admin,
      isOwner: u.is_owner,
      isBot: u.is_bot,
      deleted: u.deleted,
      avatarUrl: u.profile?.image_192 || u.profile?.image_72
    });

    if (ctx.input.userId) {
      let user = await client.getUserInfo(ctx.input.userId);
      return {
        output: { users: [mapUser(user)] },
        message: `Found user **${user.real_name || user.name}** (\`${user.id}\`).`
      };
    }

    if (ctx.input.email) {
      let user: SlackUser;
      try {
        user = await client.lookupUserByEmail(ctx.input.email);
      } catch (error) {
        if (isSlackApiErrorCode(error, 'users_not_found')) {
          return {
            output: { users: [] },
            message: `No Slack user found for email **${ctx.input.email}**.`
          };
        }

        throw error;
      }

      return {
        output: { users: [mapUser(user)] },
        message: `Found user **${user.real_name || user.name}** (\`${user.id}\`) by email.`
      };
    }

    if (ctx.input.listAll) {
      let result = await client.listUsers({
        limit: ctx.input.limit,
        cursor: ctx.input.cursor
      });
      return {
        output: {
          users: result.members.map(mapUser),
          nextCursor: result.nextCursor
        },
        message: `Listed ${result.members.length} workspace member(s).`
      };
    }

    throw missingRequiredAlternativeError('Provide userId, email, or set listAll to true');
  })
  .build();
