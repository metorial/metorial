import { SlateTool } from 'slates';
import { z } from 'zod';
import { getAuthorization } from '../lib/client';
import { spec } from '../spec';

export let listAccountsTool = SlateTool.create(spec, {
  name: 'List Accounts',
  key: 'list_accounts',
  description:
    'Discover the Basecamp accounts authorized for this connection. Pass an accountId from the results to other Basecamp tools.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      accounts: z.array(
        z.object({
          accountId: z.string().describe('Account ID to use with other Basecamp tools'),
          name: z.string().describe('Name of the Basecamp account'),
          apiUrl: z.string().describe('Account API URL'),
          appUrl: z.string().describe('Account URL in Basecamp')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let authorization = await getAuthorization(ctx.auth.token);
    let accounts = authorization.accounts
      .filter(account => account.product === 'bc3')
      .map(account => ({
        accountId: String(account.id),
        name: account.name,
        apiUrl: account.href,
        appUrl: account.app_href
      }));
    return {
      output: { accounts },
      message: `Found **${accounts.length}** authorized Basecamp account(s).`
    };
  })
  .build();
