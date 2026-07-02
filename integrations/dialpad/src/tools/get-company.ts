import { SlateTool } from 'slates';
import { z } from 'zod';
import { DialpadClient } from '../lib/client';
import { spec } from '../spec';

export let getCompanyTool = SlateTool.create(spec, {
  name: 'Get Company Info',
  key: 'get_company',
  description: `Retrieve information about your Dialpad company, including name, settings, and plan details.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      companyId: z.string().describe('Company ID'),
      name: z.string().optional().describe('Company name'),
      country: z.string().optional(),
      timezone: z.string().optional(),
      domain: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new DialpadClient({
      token: ctx.auth.token,
      environment: ctx.auth.environment
    });

    let company = await client.getCompany();

    return {
      output: {
        companyId: String(company.id),
        name: company.name,
        country: company.country,
        timezone: company.timezone,
        domain: company.domain
      },
      message: `Retrieved company info for **${company.name || company.id}**`
    };
  })
  .build();
