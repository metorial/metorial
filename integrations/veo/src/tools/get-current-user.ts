import { createApiServiceError, isApiErrorRecord, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description: 'Retrieve your VEO profile, organisation IDs, and organisation-specific roles.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({ user: z.record(z.string(), z.unknown()).describe('Your VEO user profile') })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, environment: ctx.auth.environment });
    let user = await client.getCurrentUser();
    if (!isApiErrorRecord(user)) {
      throw createApiServiceError('VEO returned an invalid user profile.');
    }
    return { output: { user }, message: 'Retrieved your VEO profile.' };
  })
  .build();
