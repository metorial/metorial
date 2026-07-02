import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getUserProfile = SlateTool.create(spec, {
  name: 'Get User Profile',
  key: 'get_user_profile',
  description: `Retrieve the authenticated user's profile and preferences. Returns account details and user preferences including calendar settings and default configuration.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string().optional().describe('User ID'),
      email: z.string().optional().describe('User email'),
      name: z.string().optional().describe('User name'),
      preferences: z.record(z.string(), z.any()).optional().describe('User preferences')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let user = await client.getCurrentUser();
    let prefs = await client.getUserPreferences();

    return {
      output: {
        userId: user._id,
        email: user.email,
        name: user.name,
        preferences: prefs
      },
      message: `Retrieved profile for ${user.email}.`
    };
  })
  .build();
