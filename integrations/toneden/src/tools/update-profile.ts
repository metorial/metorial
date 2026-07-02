import { SlateTool } from 'slates';
import { z } from 'zod';
import { ToneDenClient } from '../lib/client';
import { spec } from '../spec';

export let updateProfile = SlateTool.create(spec, {
  name: 'Update Profile',
  key: 'update_profile',
  description: `Update the user profile for a specific user. Allows changing display name, username, bio, avatar, location, and notification settings.`
})
  .input(
    z.object({
      userId: z.number().describe('ID of the user to update'),
      displayName: z.string().optional().describe('New display name'),
      username: z.string().optional().describe('New URL-friendly username (must be unique)'),
      about: z.string().optional().describe('New bio/about text'),
      avatarUrl: z.string().optional().describe('New avatar image URL'),
      email: z.string().optional().describe('New email address'),
      city: z.string().optional().describe('City'),
      country: z.string().optional().describe('Country')
    })
  )
  .output(
    z.object({
      userId: z.number().describe('Updated user ID'),
      displayName: z.string().optional().describe('Updated display name'),
      username: z.string().optional().describe('Updated username'),
      email: z.string().optional().describe('Updated email'),
      avatarUrl: z.string().optional().describe('Updated avatar URL')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ToneDenClient({ token: ctx.auth.token });

    let data: Record<string, any> = {};
    if (ctx.input.displayName) data.display_name = ctx.input.displayName;
    if (ctx.input.username) data.username = ctx.input.username;
    if (ctx.input.about) data.about = ctx.input.about;
    if (ctx.input.avatarUrl) data.avatar_url = ctx.input.avatarUrl;
    if (ctx.input.email) data.email = ctx.input.email;
    if (ctx.input.city) data.city = ctx.input.city;
    if (ctx.input.country) data.country = ctx.input.country;

    let user = await client.updateUser(ctx.input.userId, data);

    return {
      output: {
        userId: user.id,
        displayName: user.display_name,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatar_url
      },
      message: `Updated profile for **${user.display_name || user.username}** (ID: ${user.id}).`
    };
  })
  .build();
