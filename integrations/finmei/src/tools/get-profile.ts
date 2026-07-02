import { SlateTool } from 'slates';
import { z } from 'zod';
import { FinmeiClient } from '../lib/client';
import { spec } from '../spec';

export let getProfile = SlateTool.create(spec, {
  name: 'Get Profile',
  key: 'get_profile',
  description: `Retrieve the authenticated user's profile information from Finmei, including business details and account info.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string().optional().describe('User ID'),
      name: z.string().optional().describe('User or business name'),
      email: z.string().optional().describe('Email address'),
      businessName: z.string().optional().describe('Business name'),
      rawProfile: z.any().optional().describe('Full profile data from API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FinmeiClient(ctx.auth.token);

    let result = await client.getProfile();
    let profile = result?.data ?? result;

    return {
      output: {
        userId: profile?.id ? String(profile.id) : undefined,
        name: profile?.name,
        email: profile?.email,
        businessName: profile?.business_name ?? profile?.company_name,
        rawProfile: profile
      },
      message: `Retrieved profile for **${profile?.name ?? profile?.email ?? 'current user'}**.`
    };
  })
  .build();
