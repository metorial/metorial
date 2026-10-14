import { SlateTool } from 'slates';
import { z } from 'zod';
import { PublicClient } from '../lib/public-client';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User Context',
  key: 'get_current_user',
  description:
    'Retrieve the authenticated public API token context, including its workspace ID and abilities. Requires a Public API Key connection.',
  tags: { readOnly: true, destructive: false }
})
  .authMethods(['public_api_key'])
  .input(z.object({}))
  .output(
    z.object({
      context: z
        .record(z.string(), z.unknown())
        .describe('Authenticated token user and organization context returned by Agiled.')
    })
  )
  .handleInvocation(async ctx => {
    let context = await new PublicClient(ctx.auth).getCurrentUser();
    return {
      output: { context },
      message: 'Retrieved the authenticated Agiled token context.'
    };
  })
  .build();
