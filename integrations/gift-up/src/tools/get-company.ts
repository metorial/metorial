import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCompany = SlateTool.create(spec, {
  name: 'Get Company',
  key: 'get_company',
  description: `Retrieve basic company/account information including name, currency, and onboarding status.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z
      .object({
        companyId: z.string().describe('Company ID'),
        name: z.string().describe('Company name'),
        currency: z.string().describe('Account currency')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      testMode: ctx.config.testMode
    });

    let company = await client.getCompany();

    return {
      output: {
        ...company,
        companyId: company.id
      },
      message: `Company **${company.name}** (${company.currency})`
    };
  })
  .build();
