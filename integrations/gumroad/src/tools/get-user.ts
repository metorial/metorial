import { SlateTool } from 'slates';
import { z } from 'zod';
import { GumroadClient } from '../lib/client';
import { spec } from '../spec';

export let getUser = SlateTool.create(spec, {
  name: 'Get User Profile',
  key: 'get_user',
  description: `Retrieve the authenticated Gumroad user's profile information, including name, email, bio, and social links.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string().describe('User ID'),
      name: z.string().optional().describe('Display name'),
      email: z.string().optional().describe('Email address'),
      bio: z.string().optional().describe('User bio'),
      profileUrl: z.string().optional().describe('Profile URL'),
      twitterHandle: z.string().optional().describe('Twitter handle'),
      url: z.string().optional().describe('User website URL')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GumroadClient({ token: ctx.auth.token });
    let user = await client.getUser();

    return {
      output: {
        userId: user.user_id || user.id,
        name: user.name || user.display_name || undefined,
        email: user.email || undefined,
        bio: user.bio || undefined,
        profileUrl: user.profile_url || undefined,
        twitterHandle: user.twitter_handle || undefined,
        url: user.url || undefined
      },
      message: `Retrieved profile for **${user.name || user.display_name || user.email || 'user'}**.`
    };
  })
  .build();
