import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getUserTool = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_user',
  description: `Retrieve information about the currently authenticated SavvyCal user. Returns profile details such as name, email, and avatar.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string().describe('Unique user identifier'),
      displayName: z.string().optional().describe('Display name'),
      email: z.string().optional().describe('Email address'),
      avatarUrl: z.string().nullable().optional().describe('Avatar image URL'),
      timeZone: z.string().optional().describe('User time zone'),
      slug: z.string().optional().describe('User profile slug')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let user = await client.getMe();

    return {
      output: {
        userId: user.id,
        displayName: user.display_name ?? user.name,
        email: user.email,
        avatarUrl: user.avatar_url,
        timeZone: user.time_zone,
        slug: user.slug
      },
      message: `Authenticated as **${user.display_name ?? user.name}** (${user.email}).`
    };
  })
  .build();
