import { SlateTool } from 'slates';
import { z } from 'zod';
import { CabinPandaClient } from '../lib/client';
import { spec } from '../spec';

export let getProfile = SlateTool.create(spec, {
  name: 'Get Profile',
  key: 'get_profile',
  description: `Retrieve the authenticated user's profile information. Use this to verify API connectivity or get account details like name and email.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string().optional().describe('Unique identifier for the user'),
      name: z.string().optional().describe('Name of the user'),
      email: z.string().optional().describe('Email address of the user'),
      raw: z.any().optional().describe('Full profile response from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CabinPandaClient({ token: ctx.auth.token });
    let profile = await client.getProfile();

    return {
      output: {
        userId: profile?.id?.toString(),
        name: profile?.name,
        email: profile?.email,
        raw: profile
      },
      message: `Retrieved profile for **${profile?.name ?? profile?.email ?? 'user'}**.`
    };
  })
  .build();
