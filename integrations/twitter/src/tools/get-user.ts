import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { TwitterClient } from '../lib/client';
import { twitterServiceError } from '../lib/errors';
import { mapUser, userSchema } from '../lib/helpers';
import { spec } from '../spec';

export let getUser = SlateTool.create(spec, {
  name: 'Get User',
  key: 'get_user',
  description: `Look up Twitter/X user profiles. Retrieve by user ID, username, or get the authenticated user's own profile. Returns profile details, bio, metrics (followers, following, post count), and account status.`,
  instructions: [
    'Provide either a userId, a username, or set getMe to true to retrieve the authenticated user.',
    'You can also look up multiple users by providing an array of usernames.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z.string().optional().describe('User ID to look up'),
      username: z
        .string()
        .optional()
        .describe('Username (handle) to look up, without the @ prefix'),
      usernames: z
        .array(z.string())
        .optional()
        .describe('Multiple usernames to look up at once'),
      getMe: z
        .boolean()
        .optional()
        .describe('Set to true to retrieve the authenticated user profile')
    })
  )
  .output(
    z.object({
      users: z.array(userSchema).describe('Retrieved user profiles')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TwitterClient(ctx.auth.token);

    if (ctx.input.getMe) {
      let result = await client.getMe();
      let user = mapUser(result.data);
      return {
        output: { users: [user] },
        message: `Retrieved profile for **@${user.username}** (${user.name}).`
      };
    }

    if (ctx.input.userId) {
      let result = await client.getUserById(ctx.input.userId);
      let user = mapUser(result.data);
      return {
        output: { users: [user] },
        message: `Retrieved profile for **@${user.username}** (${user.name}).`
      };
    }

    if (ctx.input.usernames && ctx.input.usernames.length > 0) {
      let result = await client.getUsersByUsernames(ctx.input.usernames);
      let users = (result.data || []).map(mapUser);
      return {
        output: { users },
        message: `Retrieved **${users.length}** user profile(s).`
      };
    }

    if (ctx.input.username) {
      let result = await client.getUserByUsername(ctx.input.username);
      let user = mapUser(result.data);
      return {
        output: { users: [user] },
        message: `Retrieved profile for **@${user.username}** (${user.name}).`
      };
    }

    throw twitterServiceError(
      'Provide a userId, username, usernames array, or set getMe to true.'
    );
  })
  .build();
