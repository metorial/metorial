import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapUser } from '../lib/schemas';
import { spec } from '../spec';
export const getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Get the actual user associated with the Brex token. Requires users.readonly or users access; no company identity is inferred.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string(),
      firstName: z.string().nullable(),
      lastName: z.string().nullable(),
      email: z.string().nullable(),
      status: z.string().nullish(),
      managerId: z.string().nullish(),
      departmentId: z.string().nullish(),
      locationId: z.string().nullish()
    })
  )
  .handleInvocation(async ctx => ({
    output: mapUser(await new Client({ token: ctx.auth.token }).getUserMe()),
    message: 'Retrieved the token-associated user.'
  }))
  .build();
