import { SlateTool } from 'slates';
import { z } from 'zod';
import { WhopClient } from '../lib/client';
import { spec } from '../spec';

export let getUser = SlateTool.create(spec, {
  name: 'Get User',
  key: 'get_user',
  description: `Retrieve a Whop user's public profile by their user ID or username.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userIdOrUsername: z.string().describe('User ID (e.g. user_xxx) or username')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('User ID'),
      username: z.string().describe('Username'),
      name: z.string().nullable().describe('Display name'),
      bio: z.string().nullable().describe('User bio'),
      profilePictureUrl: z.string().nullable().describe('Profile picture URL'),
      createdAt: z.string().describe('ISO 8601 creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WhopClient(ctx.auth.token);
    let u = await client.getUser(ctx.input.userIdOrUsername);

    return {
      output: {
        userId: u.id,
        username: u.username,
        name: u.name || null,
        bio: u.bio || null,
        profilePictureUrl: u.profile_picture?.url || null,
        createdAt: u.created_at
      },
      message: `User **${u.username}**${u.name ? ` (${u.name})` : ''} (\`${u.id}\`).`
    };
  })
  .build();
