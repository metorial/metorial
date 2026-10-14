import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listAccounts = SlateTool.create(spec, {
  name: 'List Connected Accounts',
  key: 'list_accounts',
  description:
    'Identify the Spoki accounts accessible with the connected API key, including account IDs, names, phone numbers, and status.',
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      accounts: z.array(
        z.object({
          accountId: z.string().optional(),
          name: z.string().optional(),
          phone: z.string().optional(),
          status: z.string().optional(),
          isActive: z.boolean().optional()
        })
      ),
      raw: z.any().optional()
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).listAccounts();
    let items = Array.isArray(result)
      ? result
      : Array.isArray(result?.results)
        ? result.results
        : [];
    let accounts = items.map((account: any) => ({
      accountId:
        account.id === undefined || account.id === null ? undefined : String(account.id),
      name: account.name ?? undefined,
      phone: account.phone ?? undefined,
      status: account.status ?? undefined,
      isActive: account.is_active ?? undefined
    }));
    return {
      output: { accounts, raw: result },
      message: `Found **${accounts.length}** connected accounts`
    };
  })
  .build();
