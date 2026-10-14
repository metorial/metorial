import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description: 'Retrieve the Helpwise user associated with the connected API key and secret.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      user: z.record(z.string(), z.any()).describe('Current user with its stable ID')
    })
  )
  .handleInvocation(async ctx => {
    let user = await new Client({ token: ctx.auth.token }).getMe();
    return { output: { user }, message: `Retrieved Helpwise user **${user.id}**.` };
  })
  .build();
