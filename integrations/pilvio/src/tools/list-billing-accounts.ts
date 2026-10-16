import { SlateTool } from 'slates';
import { z } from 'zod';
import { PilvioClient } from '../lib/client';
import { spec } from '../spec';

export let listBillingAccounts = SlateTool.create(spec, {
  name: 'List Billing Accounts',
  key: 'list_billing_accounts',
  description:
    'Discover authorized billing account IDs and names before creating or reassigning cloud resources.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      accounts: z
        .array(
          z.object({
            billingAccountId: z
              .number()
              .describe('Billing account ID for resource operations'),
            title: z.string().optional().describe('Account title'),
            email: z.string().optional().describe('Billing email'),
            isDefault: z.boolean().optional().describe('Whether this is the default account'),
            isActive: z.boolean().optional().describe('Whether this account is active'),
            creditAmount: z
              .number()
              .optional()
              .describe('Available credit reported by Pilvio'),
            unpaidAmount: z.number().optional().describe('Unpaid amount reported by Pilvio'),
            raw: z.unknown().optional().describe('Complete provider billing account response')
          })
        )
        .describe('Billing accounts attached to the authenticated user')
    })
  )
  .handleInvocation(async ctx => {
    let accounts = await new PilvioClient({ token: ctx.auth.token }).listBillingAccounts();
    return {
      output: {
        accounts: accounts.map(account => ({
          billingAccountId: account.id,
          title: account.title ?? undefined,
          email: account.email ?? undefined,
          isDefault: account.is_default ?? undefined,
          isActive: account.is_active ?? undefined,
          creditAmount: account.credit_amount ?? undefined,
          unpaidAmount: account.unpaid_amount ?? undefined,
          raw: account
        }))
      },
      message: `Found **${accounts.length}** billing account(s).`
    };
  })
  .build();
