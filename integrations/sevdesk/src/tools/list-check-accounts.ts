import { SlateTool } from 'slates';
import { z } from 'zod';
import { SevdeskClient } from '../lib/client';
import { spec } from '../spec';

export let listCheckAccounts = SlateTool.create(spec, {
  name: 'List Check Accounts',
  key: 'list_check_accounts',
  description: `List all check accounts (bank accounts, cash registers, etc.) in sevDesk. Check account IDs are needed when booking payments on invoices and vouchers.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Max results (default: 100)'),
      offset: z.number().optional().describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      checkAccounts: z.array(
        z.object({
          checkAccountId: z.string(),
          name: z.string().optional(),
          type: z.string().optional(),
          currency: z.string().optional(),
          status: z.string().optional(),
          bankName: z.string().optional(),
          iban: z.string().optional(),
          bic: z.string().optional()
        })
      ),
      totalCount: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new SevdeskClient({ token: ctx.auth.token });

    let results = await client.listCheckAccounts({
      limit: ctx.input.limit ?? 100,
      offset: ctx.input.offset
    });

    let checkAccounts = (results ?? []).map((ca: any) => ({
      checkAccountId: String(ca.id),
      name: ca.name ?? undefined,
      type: ca.type ?? undefined,
      currency: ca.currency ?? undefined,
      status: ca.status != null ? String(ca.status) : undefined,
      bankName: ca.bankName ?? undefined,
      iban: ca.iban ?? undefined,
      bic: ca.bic ?? undefined
    }));

    return {
      output: {
        checkAccounts,
        totalCount: checkAccounts.length
      },
      message: `Found **${checkAccounts.length}** check account(s).`
    };
  })
  .build();
