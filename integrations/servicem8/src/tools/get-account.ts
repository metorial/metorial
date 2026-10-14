import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account',
  key: 'get_account',
  description:
    'Identify the connected ServiceM8 account and retrieve its business name, currency, and timezone.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      accountUuid: z.string().describe('UUID of the connected account'),
      name: z.string().optional().describe('Business name'),
      currency: z.string().optional().describe('Account currency code'),
      timezone: z.string().optional().describe('Account IANA timezone'),
      website: z.string().optional().describe('Business website')
    })
  )
  .handleInvocation(async ctx => {
    let accounts = await new Client(ctx.auth).list('vendor');
    let account = accounts.find(account => account.active !== 0);
    if (!account?.uuid) {
      throw createApiServiceError('ServiceM8 did not return an active account identity.');
    }
    return {
      output: {
        accountUuid: account.uuid,
        name: account.name,
        currency: account.currency,
        timezone: account.timezone_name,
        website: account.website
      },
      message: `Connected to **${account.name || account.uuid}**.`
    };
  })
  .build();
