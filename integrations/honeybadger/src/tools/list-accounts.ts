import { SlateTool } from 'slates';
import { z } from 'zod';
import { HoneybadgerClient } from '../lib/client';
import { nextUrlSchema } from '../lib/validation';
import { spec } from '../spec';

export const listAccounts = SlateTool.create(spec, {
  key: 'list_accounts',
  name: 'List Accounts',
  description:
    'Discover the Honeybadger accounts the authenticated user belongs to. Returns account IDs and names for project and team operations.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({ nextUrl: nextUrlSchema }))
  .output(
    z.object({
      accounts: z.array(
        z.object({
          accountId: z.string(),
          name: z.string().optional(),
          email: z.string().optional(),
          active: z.boolean().optional(),
          parked: z.boolean().optional()
        })
      ),
      nextUrl: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    const data = await new HoneybadgerClient(ctx.auth).listAccounts(ctx.input.nextUrl);
    const accounts = data.results.map(account => ({
      accountId: String(account.id),
      name: account.name ?? undefined,
      email: account.email ?? undefined,
      active: account.active ?? undefined,
      parked: account.parked ?? undefined
    }));
    return {
      output: { accounts, nextUrl: data.links?.next ?? undefined },
      message: `Found **${accounts.length}** account(s) on this page.`
    };
  })
  .build();
