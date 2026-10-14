import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTokenInfo = SlateTool.create(spec, {
  name: 'Get Token Info',
  key: 'get_token_info',
  description:
    'Verify the current API token and retrieve its ID and workspace subdomain. This endpoint identifies the token and workspace rather than a user profile.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(z.object({ tokenId: z.string(), subdomain: z.string() }))
  .handleInvocation(async ctx => {
    let data = await new Client({ token: ctx.auth.token }).getTokenInfo();
    return {
      output: { tokenId: data.id, subdomain: data.subdomain },
      message: `Connected to Dovetail workspace **${data.subdomain}**.`
    };
  })
  .build();
