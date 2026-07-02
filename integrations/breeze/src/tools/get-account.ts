import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account',
  key: 'get_account',
  description: `Retrieve account summary information including organization name, subdomain, timezone, and country details.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      accountId: z.string().describe('Organization ID'),
      name: z.string().describe('Organization name'),
      subdomain: z.string().describe('Account subdomain'),
      status: z.string().optional().describe('Account status'),
      createdOn: z.string().optional().describe('Account creation date'),
      timezone: z.string().optional().describe('Account timezone'),
      country: z.any().optional().describe('Country details')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let account = await client.getAccountSummary();

    return {
      output: {
        accountId: account?.id || '',
        name: account?.name || '',
        subdomain: account?.subdomain || '',
        status: account?.status,
        createdOn: account?.created_on,
        timezone: account?.details?.timezone,
        country: account?.details?.country
      },
      message: `Account: **${account?.name || 'Unknown'}** (${account?.subdomain || ctx.config.subdomain}.breezechms.com).`
    };
  })
  .build();
