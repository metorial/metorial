import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getProfile = SlateTool.create(spec, {
  name: 'Get Profile',
  key: 'get_profile',
  description: `Retrieve the authenticated user's CalendarHero profile. Returns account information including name, email, organization, and scheduling preferences.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string().optional().describe('Unique user ID'),
      name: z.string().optional().describe('User display name'),
      email: z.string().optional().describe('User email address'),
      organization: z.string().optional().describe('Organization name'),
      timezone: z.string().optional().describe('User timezone'),
      photo: z.string().optional().describe('Profile photo URL'),
      raw: z.any().optional().describe('Full user profile object from CalendarHero')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let user = await client.getUser();

    return {
      output: {
        userId: user._id || user.id,
        name:
          user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || undefined,
        email: user.email,
        organization: user.organization,
        timezone: user.timezone,
        photo: user.photo,
        raw: user
      },
      message: `Retrieved profile for **${user.name || user.email || 'user'}**.`
    };
  })
  .build();
