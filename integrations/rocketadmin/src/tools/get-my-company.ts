import { SlateTool } from 'slates';
import { z } from 'zod';
import { createRocketadminClient, requiredString } from '../lib/client';
import { spec } from '../spec';

export let getMyCompany = SlateTool.create(spec, {
  key: 'get_my_company',
  name: 'Get My Company',
  description:
    'Discover the signed-in Rocketadmin company ID and its details, connections, and invitations available to your role. Requires an Email & Password connection.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      companyId: z
        .string()
        .describe('Current company ID for company-user management and sign-in audit logs'),
      name: z.string().optional().describe('Company name when returned by Rocketadmin'),
      company: z.record(z.string(), z.unknown()).describe('Complete company response')
    })
  )
  .handleInvocation(async ctx => {
    let company = await createRocketadminClient(ctx.auth, ctx.config).getCompanyInfo();
    return {
      output: {
        companyId: requiredString(company.id, 'company ID'),
        name: typeof company.name === 'string' ? company.name : undefined,
        company
      },
      message: 'Retrieved the current Rocketadmin company.'
    };
  })
  .build();
