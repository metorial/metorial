import { SlateTool } from 'slates';
import { z } from 'zod';
import { ApifyClient } from '../lib/client';
import { spec } from '../spec';

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account',
  key: 'get_account',
  description: `Get the authenticated Apify account profile and available account metadata from the API token.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string().optional().describe('Apify user ID'),
      username: z.string().optional().describe('Apify username'),
      email: z.string().optional().describe('Account email'),
      name: z.string().optional().describe('Display name'),
      profileImageUrl: z.string().optional().describe('Profile image URL'),
      plan: z.record(z.string(), z.any()).optional().describe('Plan metadata if returned'),
      usage: z.record(z.string(), z.any()).optional().describe('Usage metadata if returned'),
      limits: z.record(z.string(), z.any()).optional().describe('Limit metadata if returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ApifyClient({ token: ctx.auth.token });
    let user = await client.getUser();
    let output = {
      userId: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      profileImageUrl: user.profile?.pictureUrl,
      plan: user.plan,
      usage: user.usage,
      limits: user.limits
    };

    return {
      output,
      message: `Authenticated as **${output.username ?? output.email ?? output.userId ?? 'Apify user'}**.`
    };
  })
  .build();
