import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Retrieve the authenticated La Growth Machine member ID and email. For a standard API key, this is the workspace owner.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      member: z.object({
        id: z.string().describe('Authenticated member ID'),
        email: z.string().describe('Authenticated member email')
      })
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let member = await client.getCurrentUser();
    return { output: { member }, message: 'Authenticated member retrieved.' };
  })
  .build();
