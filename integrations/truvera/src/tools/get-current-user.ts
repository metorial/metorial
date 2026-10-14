import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description: 'Retrieve the user profile associated with the authenticated Truvera account.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      name: z.string().optional().describe('User display name'),
      image: z.string().optional().describe('User profile image URL'),
      profile: z.any().describe('Full user profile')
    })
  )
  .handleInvocation(async ctx => {
    let profile = await createClient(ctx).getCurrentUser();
    return {
      output: {
        name: profile?.name ?? undefined,
        image: profile?.image ?? undefined,
        profile
      },
      message: `Retrieved the authenticated user profile${profile?.name ? ` for **${profile.name}**` : ''}.`
    };
  })
  .build();
