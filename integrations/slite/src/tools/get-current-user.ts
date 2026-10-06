import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { meSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Read the authenticated API key’s native user and organization profile. This endpoint does not provide a user or organization ID.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(meSchema)
  .handleInvocation(async ctx => ({
    output: await new Client(ctx.auth.token).getMe(),
    message: 'Read the current user and organization profile.'
  }))
  .build();
