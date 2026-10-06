import { SlateTool } from 'slates';
import { z } from 'zod';
import { MoneybirdClient } from '../lib/client';
import { administrationIdSchema } from '../lib/schemas';
import {
  checkedOutput,
  exactId,
  fail,
  nullableId,
  validateToolInput
} from '../lib/validation';
import { spec } from '../spec';

let ledgerAccountSchema = z.object({
  ledgerAccountId: z.string(),
  name: z.string().nullable(),
  accountType: z.string().nullable(),
  accountId: z.string().nullable(),
  parentId: z.string().nullable(),
  active: z.boolean(),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable()
});

const outputSchema = z.object({
  nextPage: z.number().int().positive().optional(),
  previousPage: z.number().int().positive().optional(),
  ledgerAccount: ledgerAccountSchema.optional(),
  ledgerAccounts: z.array(ledgerAccountSchema).optional(),
  deleted: z.boolean().optional(),
  retired: z.boolean().optional(),
  deactivated: z.boolean().optional(),
  archived: z.boolean().optional()
});

export let manageLedgerAccounts = SlateTool.create(spec, {
  name: 'Manage Ledger Accounts',
  key: 'manage_ledger_accounts',
  description: `List, get, create, update, or delete ledger accounts (bookkeeping categories). Ledger accounts categorize revenue, costs, assets, liabilities, and equity. They are used on invoices, expenses, and financial mutations. Call list_administrations to choose administrationId when no default is saved.`,
  instructions: [
    'Valid accountType values: non_current_assets, current_assets, equity, provisions, non_current_liabilities, current_liabilities, revenue, direct_costs, expenses, other_income_expenses.',
    'Parent and child ledger accounts must share the same accountType.'
  ]
})
  .input(
    z.object({
      administrationId: administrationIdSchema,
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Operation to perform'),
      ledgerAccountId: z
        .string()
        .optional()
        .describe('Ledger account ID (for get, update, delete)'),
      name: z.string().optional().describe('Account name (for create/update)'),
      accountType: z
        .enum([
          'non_current_assets',
          'current_assets',
          'equity',
          'provisions',
          'non_current_liabilities',
          'current_liabilities',
          'revenue',
          'direct_costs',
          'expenses',
          'other_income_expenses'
        ])
        .optional()
        .describe('Account type (for create)'),
      accountId: z.string().optional().describe('Account number/ID (for create/update)'),
      parentId: z.string().optional().describe('Parent ledger account ID (for create/update)')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    validateToolInput('manage_ledger_accounts', ctx.input);
    return checkedOutput(outputSchema, async () => {
      let client = new MoneybirdClient({
        token: ctx.auth.token,
        administrationId: ctx.input.administrationId ?? ctx.config.administrationId
      });

      let mapAccount = (a: any) => ({
        ledgerAccountId: exactId(a.id),
        name: a.name ?? null,
        accountType: a.account_type ?? null,
        accountId: a.account_id ?? null,
        parentId: nullableId(a.parent_id),
        active: a.active,
        createdAt: a.created_at ?? null,
        updatedAt: a.updated_at ?? null
      });

      switch (ctx.input.action) {
        case 'list': {
          let accounts = await client.listLedgerAccounts();
          let mapped = accounts.map(mapAccount);
          return {
            output: { ledgerAccounts: mapped, ...client.pagination },
            message: `Found ${mapped.length} ledger account(s).`
          };
        }
        case 'get': {
          if (!ctx.input.ledgerAccountId) throw fail('ledgerAccountId is required for get');
          let account = await client.getLedgerAccount(ctx.input.ledgerAccountId);
          return {
            output: { ledgerAccount: mapAccount(account) },
            message: `Retrieved ledger account **${account.name}** (${account.account_type}).`
          };
        }
        case 'create': {
          let accountData: Record<string, any> = {};
          if (ctx.input.name) accountData.name = ctx.input.name;
          if (ctx.input.accountType) accountData.account_type = ctx.input.accountType;
          if (ctx.input.accountId) accountData.account_id = ctx.input.accountId;
          if (ctx.input.parentId) accountData.parent_id = ctx.input.parentId;
          let account = await client.createLedgerAccount(accountData);
          return {
            output: { ledgerAccount: mapAccount(account) },
            message: `Created ledger account **${account.name}**.`
          };
        }
        case 'update': {
          if (!ctx.input.ledgerAccountId) throw fail('ledgerAccountId is required for update');
          let accountData: Record<string, any> = {};
          if (ctx.input.name !== undefined) accountData.name = ctx.input.name;
          if (ctx.input.accountId !== undefined) accountData.account_id = ctx.input.accountId;
          if (ctx.input.parentId !== undefined) accountData.parent_id = ctx.input.parentId;
          let account = await client.updateLedgerAccount(
            ctx.input.ledgerAccountId,
            accountData
          );
          return {
            output: { ledgerAccount: mapAccount(account) },
            message: `Updated ledger account **${account.name}**.`
          };
        }
        case 'delete': {
          if (!ctx.input.ledgerAccountId) throw fail('ledgerAccountId is required for delete');
          const retirement = await client.deleteLedgerAccount(ctx.input.ledgerAccountId);
          return {
            output: retirement,
            message: `Confirmed retirement of ledger account ${ctx.input.ledgerAccountId}.`
          };
        }
      }
    });
  })
  .build();
