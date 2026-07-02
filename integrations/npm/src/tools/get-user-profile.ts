import { SlateTool } from 'slates';
import { z } from 'zod';
import { NpmRegistryClient } from '../lib/client';
import { spec } from '../spec';

export let getUserProfile = SlateTool.create(spec, {
  name: 'Get User Profile',
  key: 'get_user_profile',
  description: `Retrieve the authenticated npm user's profile information including username and email.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z
      .object({
        username: z.string().optional().describe('npm username'),
        email: z.string().optional().describe('Email address associated with the account'),
        tfa: z.any().optional().describe('Two-factor authentication status')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new NpmRegistryClient({ token: ctx.auth.token });
    let profile = await client.getUserProfile();

    return {
      output: {
        username: profile.name,
        email: profile.email,
        tfa: profile.tfa,
        ...profile
      },
      message: `Retrieved profile for **${profile.name || 'unknown user'}**.`
    };
  })
  .build();
