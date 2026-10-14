import { SlateTool } from 'slates';
import { z } from 'zod';
import { getHarvestAccounts } from '../lib/identity';
import { spec } from '../spec';

export let listAccounts = SlateTool.create(spec, {
  name: 'List Accounts',
  key: 'list_accounts',
  description:
    'List the Harvest accounts authorized by this connection. Use an accountId from this result in account-scoped tools.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      accounts: z.array(
        z.object({
          accountId: z.string().describe('Harvest account ID to use in other tools'),
          name: z.string().describe('Account name')
        })
      ),
      userId: z.number().describe('Harvest ID user ID'),
      name: z.string().describe('Authenticated user name'),
      email: z.string().describe('Authenticated user email')
    })
  )
  .handleInvocation(async ctx => {
    let { accounts, user } = await getHarvestAccounts(ctx.auth.token);
    return {
      output: {
        accounts: accounts.map(account => ({
          accountId: String(account.id),
          name: account.name
        })),
        userId: user.id,
        name: `${user.first_name} ${user.last_name}`.trim(),
        email: user.email
      },
      message: `Found **${accounts.length}** authorized Harvest accounts.`
    };
  })
  .build();
