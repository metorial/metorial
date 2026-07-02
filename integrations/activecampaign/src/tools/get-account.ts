import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account',
  key: 'get_account',
  description: 'Retrieves an ActiveCampaign account/company by ID.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      accountId: z.string().describe('ID of the account to retrieve')
    })
  )
  .output(
    z.object({
      accountId: z.string(),
      name: z.string(),
      accountUrl: z.string().optional(),
      contactCount: z.number().optional(),
      dealCount: z.number().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiUrl: ctx.config.apiUrl
    });

    let result = await client.getAccount(ctx.input.accountId);
    let account = result.account;

    return {
      output: {
        accountId: account.id,
        name: account.name,
        accountUrl: account.accountUrl || undefined,
        contactCount: account.contactCount ? Number(account.contactCount) : undefined,
        dealCount: account.dealCount ? Number(account.dealCount) : undefined,
        createdAt: account.createdTimestamp || account.cdate || undefined,
        updatedAt: account.updatedTimestamp || account.udate || undefined
      },
      message: `Retrieved account **${account.name}** (ID: ${account.id}).`
    };
  })
  .build();
