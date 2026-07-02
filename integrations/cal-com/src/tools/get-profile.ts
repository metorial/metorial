import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getProfile = SlateTool.create(spec, {
  name: 'Get Profile',
  key: 'get_profile',
  description: `Retrieve the authenticated user's profile information including name, email, time zone, and other account details.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      profile: z.any().describe('User profile information')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let profile = await client.getMe();

    return {
      output: { profile },
      message: `Retrieved profile for **${profile?.name || profile?.email || 'user'}**.`
    };
  })
  .build();
