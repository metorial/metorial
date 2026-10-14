import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { currentUserSchema } from '../lib/types';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Checks the connected Dart account and returns the authenticated user ID, name, and email.',
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({}))
  .output(currentUserSchema)
  .handleInvocation(async ctx => {
    let user = await new Client({ token: ctx.auth.token }).getCurrentUser();
    return { output: user, message: `Connected as **${user.name}** (${user.email}).` };
  })
  .build();
