import { SlateTool } from 'slates';
import { z } from 'zod';
import { TwitchClient } from '../lib/client';
import { spec } from '../spec';

export let getUserInfo = SlateTool.create(spec, {
  name: 'Get User Info',
  key: 'get_user_info',
  description: `Retrieve Twitch user profiles by user ID or login name. Returns display names, profile images, account type, creation date, and description. Can fetch the authenticated user's own profile or look up other users.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userIds: z.array(z.string()).optional().describe('Twitch user IDs to look up (max 100)'),
      logins: z
        .array(z.string())
        .optional()
        .describe('Twitch login names to look up (max 100)')
    })
  )
  .output(
    z.object({
      users: z.array(
        z.object({
          userId: z.string().describe('The user ID'),
          login: z.string().describe('The user login name'),
          displayName: z.string().describe('The user display name'),
          type: z.string().describe('User type (admin, global_mod, staff, or empty)'),
          broadcasterType: z
            .string()
            .describe('Broadcaster type (affiliate, partner, or empty)'),
          description: z.string().describe('User bio/description'),
          profileImageUrl: z.string().describe('URL of the user profile image'),
          offlineImageUrl: z.string().describe('URL of the user offline image'),
          createdAt: z.string().describe('Account creation date'),
          email: z.string().optional().describe('User email (requires user:read:email scope)')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new TwitchClient(ctx.auth.token, ctx.auth.clientId);

    let hasFilters =
      (ctx.input.userIds && ctx.input.userIds.length > 0) ||
      (ctx.input.logins && ctx.input.logins.length > 0);
    let users: any;

    if (hasFilters) {
      users = await client.getUsers({ ids: ctx.input.userIds, logins: ctx.input.logins });
    } else {
      let user = await client.getAuthenticatedUser();
      users = [user];
    }

    let mapped = users.map((u: any) => ({
      userId: u.id,
      login: u.login,
      displayName: u.display_name,
      type: u.type,
      broadcasterType: u.broadcaster_type,
      description: u.description,
      profileImageUrl: u.profile_image_url,
      offlineImageUrl: u.offline_image_url,
      createdAt: u.created_at,
      email: u.email
    }));

    return {
      output: { users: mapped },
      message:
        mapped.length === 1 && mapped[0]
          ? `Found user **${mapped[0].displayName}** (${mapped[0].login})`
          : `Found **${mapped.length}** users`
    };
  })
  .build();
