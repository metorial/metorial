import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { id, integer, text } from '../lib/contracts';
import { spec } from '../spec';
export const getCompany = SlateTool.create(spec, {
  key: 'get_company',
  name: 'Get Company',
  description:
    'Retrieve the native company summary. OAuth also exposes the current integration and native company ID; Basic authentication does not expose a company ID or person identity.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      name: z.string(),
      usersCount: z.number(),
      numbersCount: z.number(),
      authType: z.enum(['basic', 'bearer']),
      companyId: z.number().optional(),
      integrationId: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    const client = new Client(ctx.auth),
      company = await client.getCompany(),
      integration = ctx.auth.authType === 'bearer' ? await client.getIntegration() : undefined;
    return {
      output: {
        name: text(company.name, 'Native company name'),
        usersCount: integer(company.users_count, 'Native user count'),
        numbersCount: integer(company.numbers_count, 'Native number count'),
        authType: ctx.auth.authType,
        companyId: integration ? id(integration.company_id) : undefined,
        integrationId: integration ? id(integration.id) : undefined
      },
      message: 'Retrieved native company context; no individual user identity is inferred.'
    };
  })
  .build();
