import { SlateTool } from 'slates';
import { z } from 'zod';
import { providerId, TypefullyClient } from '../lib/client';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  key: 'get_current_user',
  name: 'Get Current User',
  description: 'Retrieve the Typefully user associated with the connected API key.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string().describe('Authenticated user identifier'),
      name: z.string().nullable().optional(),
      email: z.string().nullable().optional(),
      profileImageUrl: z.string().nullable().optional(),
      signupDate: z.string().nullable().optional(),
      apiKeyLabel: z
        .string()
        .nullable()
        .optional()
        .describe('User-assigned API key label; never the secret key')
    })
  )
  .handleInvocation(async ctx => {
    let user = await new TypefullyClient(ctx.auth.token).getCurrentUser();
    return {
      output: {
        userId: providerId(user.id),
        name: user.name,
        email: user.email,
        profileImageUrl: user.profile_image_url,
        signupDate: user.signup_date,
        apiKeyLabel: user.api_key_label
      },
      message: 'Retrieved the connected Typefully user.'
    };
  })
  .build();

export let getSocialSet = SlateTool.create(spec, {
  key: 'get_social_set',
  name: 'Get Social Set',
  description:
    'Inspect connected platform accounts and profile information for a social set. Use list_social_sets to discover its ID.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({ socialSetId: z.string().describe('Social set ID from list_social_sets.') })
  )
  .output(
    z.object({
      socialSet: z
        .record(z.string(), z.unknown())
        .describe('Actual social set and connected-platform details returned by Typefully')
    })
  )
  .handleInvocation(async ctx => ({
    output: {
      socialSet: await new TypefullyClient(ctx.auth.token).getSocialSet(ctx.input.socialSetId)
    },
    message: 'Retrieved social set details.'
  }))
  .build();
