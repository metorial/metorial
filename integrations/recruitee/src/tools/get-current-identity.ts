import { SlateTool } from 'slates';
import { z } from 'zod';
import { RecruiteeClient } from '../lib/client';
import { spec } from '../spec';
export let getCurrentIdentity = SlateTool.create(spec, {
  name: 'Get Current Identity',
  key: 'get_current_identity',
  description:
    'Read the authenticated token owner and exact company binding from the company-scoped ATS API. Personal tokens inherit the creator’s company permissions.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      adminId: z.number(),
      companyId: z.number(),
      firstName: z.string().nullable(),
      lastName: z.string().nullable(),
      email: z.string().nullable(),
      role: z.string().nullable(),
      membershipId: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    const client = await RecruiteeClient.forContext(ctx);
    const identity = await client.identity();
    return {
      output: identity,
      message: `Authenticated admin ${identity.adminId} for company ${identity.companyId}.`
    };
  })
  .build();
