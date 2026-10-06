import { SlateTool } from 'slates';
import { z } from 'zod';
import { invoke } from '../lib/operations';
import { spec } from '../spec';

const output = z.object({
  identityId: z.number(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().optional(),
  memberships: z.array(
    z.object({
      accountId: z.string().optional(),
      businessId: z.number(),
      businessName: z.string().optional(),
      role: z.string().optional()
    })
  )
});
export const getIdentity = SlateTool.create(spec, {
  name: 'Get Identity',
  key: 'get_identity',
  description:
    'Discover your FreshBooks identity and authorized business/account memberships. Use the returned accountId or businessId to select the exact scope for accounting, project, and time-tracking tools.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(output)
  .handleInvocation(ctx => invoke('get_identity', ctx, output))
  .build();
