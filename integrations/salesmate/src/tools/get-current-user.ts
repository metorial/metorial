import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Retrieve the authenticated Salesmate user, including their ID, name, email, role, and profile.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      user: z.record(z.string(), z.unknown()).describe('Authenticated user profile')
    })
  )
  .handleInvocation(async ctx => {
    let result = await createClient(ctx).getCurrentUser();
    let user = result.Data;
    return { output: { user }, message: 'Retrieved the authenticated Salesmate user.' };
  })
  .build();
