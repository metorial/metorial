import { createApiServiceError, isApiErrorRecord, SlateTool } from 'slates';
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
      country: z.any().optional().describe('Country details'),
      account: z.any().optional().describe('Complete account summary returned by Breeze')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let account = await client.getAccountSummary();
    if (
      !isApiErrorRecord(account) ||
      typeof account.id !== 'string' ||
      typeof account.name !== 'string' ||
      typeof account.subdomain !== 'string'
    ) {
      throw createApiServiceError('Breeze returned an account summary without its identity.');
    }
    let details = isApiErrorRecord(account.details) ? account.details : undefined;

    return {
      output: {
        accountId: account.id,
        name: account.name,
        subdomain: account.subdomain,
        status: typeof account.status === 'string' ? account.status : undefined,
        createdOn: typeof account.created_on === 'string' ? account.created_on : undefined,
        timezone: typeof details?.timezone === 'string' ? details.timezone : undefined,
        country: details?.country,
        account
      },
      message: `Account: **${account.name}** (${account.subdomain}.breezechms.com).`
    };
  })
  .build();
