import { SlateTool } from 'slates';
import { z } from 'zod';
import { ToneDenClient } from '../lib/client';
import { spec } from '../spec';

let profileOutputSchema = z.object({
  userId: z.number().describe('User ID'),
  username: z.string().optional().describe('URL-friendly username'),
  displayName: z.string().optional().describe('Display name'),
  email: z.string().optional().describe('Email address'),
  avatarUrl: z.string().optional().describe('Avatar image URL'),
  type: z.string().optional().describe('Account type (manager or artist)'),
  about: z.string().optional().describe('Bio/about text'),
  city: z.string().optional().describe('City'),
  country: z.string().optional().describe('Country'),
  accountCount: z.number().optional().describe('Number of connected accounts')
});

export let getProfile = SlateTool.create(spec, {
  name: 'Get Profile',
  key: 'get_profile',
  description: `Retrieve the user profile for the authenticated artist or a specific user by ID. Returns profile details including display name, email, avatar, location, and account type.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z
        .number()
        .optional()
        .describe('Specific user ID to look up. Omit to get the authenticated profile.')
    })
  )
  .output(
    z.object({
      profile: profileOutputSchema.describe('User profile details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ToneDenClient({ token: ctx.auth.token });
    let user = ctx.input.userId
      ? await client.getUser(ctx.input.userId)
      : await client.getMe();

    return {
      output: {
        profile: {
          userId: user.id,
          username: user.username,
          displayName: user.display_name,
          email: user.email,
          avatarUrl: user.avatar_url,
          type: user.type,
          about: user.about,
          city: user.city,
          country: user.country,
          accountCount: user.account_count
        }
      },
      message: `Retrieved profile for **${user.display_name || user.username}** (ID: ${user.id}).`
    };
  })
  .build();
