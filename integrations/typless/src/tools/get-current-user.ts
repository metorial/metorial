import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, profileSchema } from '../lib/client';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Retrieve the account email and name associated with the connected API key through the legacy user profile endpoint.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(profileSchema)
  .handleInvocation(async ctx => {
    let output = await new Client(ctx.auth).getUserProfile();
    return { output, message: `Connected Typless account: **${output.email}**.` };
  })
  .build();
