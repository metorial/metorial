import { SlateTool } from 'slates';
import { z } from 'zod';
import { TimelyClient } from '../lib/client';
import { spec } from '../spec';

export let listAccounts = SlateTool.create(spec, {
  name: 'List Accounts',
  key: 'list_accounts',
  description:
    'List Timely workspaces available to the authenticated user. Pass a returned accountId to other tools to choose a workspace.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      accounts: z.array(z.object({ accountId: z.number(), name: z.string() })),
      count: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let accounts = await new TimelyClient({
      accountId: '',
      token: ctx.auth.token
    }).getAccounts();
    let mapped = accounts.map((account: { id: number; name?: string }) => ({
      accountId: account.id,
      name: account.name ?? `Workspace ${account.id}`
    }));
    return {
      output: { accounts: mapped, count: mapped.length },
      message: `Found ${mapped.length} Timely workspaces.`
    };
  })
  .build();
