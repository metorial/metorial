import { SlateTool } from 'slates';
import { z } from 'zod';
import { MxClient } from '../lib/client';
import { spec } from '../spec';

let accountSchema = z.object({
  guid: z.string().optional().describe('MX-assigned unique identifier for the account'),
  userGuid: z.string().optional().describe('GUID of the owning user'),
  memberGuid: z
    .string()
    .optional()
    .nullable()
    .describe('GUID of the member this account belongs to'),
  institutionCode: z.string().optional().nullable().describe('Institution code'),
  name: z.string().optional().nullable().describe('Account name'),
  type: z
    .string()
    .optional()
    .nullable()
    .describe('Account type (CHECKING, SAVINGS, CREDIT_CARD, etc.)'),
  subtype: z.string().optional().nullable().describe('Account subtype'),
  balance: z.number().optional().nullable().describe('Current balance'),
  availableBalance: z.number().optional().nullable().describe('Available balance'),
  availableCredit: z.number().optional().nullable().describe('Available credit'),
  creditLimit: z.number().optional().nullable().describe('Credit limit'),
  currencyCode: z.string().optional().nullable().describe('Currency code (e.g., USD)'),
  accountNumber: z.string().optional().nullable().describe('Masked account number'),
  apr: z.number().optional().nullable().describe('Annual percentage rate'),
  apy: z.number().optional().nullable().describe('Annual percentage yield'),
  createdAt: z.string().optional().nullable().describe('Creation timestamp'),
  updatedAt: z.string().optional().nullable().describe('Last update timestamp')
});

export let listAccounts = SlateTool.create(spec, {
  name: 'List Accounts',
  key: 'list_accounts',
  description: `List all financial accounts for a user across all connected institutions. Optionally filter by member to see accounts from a specific institution. Returns account details including balances, type, and currency.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userGuid: z.string().describe('MX GUID of the user'),
      memberGuid: z.string().optional().describe('Optionally filter accounts by member GUID'),
      page: z.number().optional().describe('Page number for pagination'),
      recordsPerPage: z.number().optional().describe('Records per page (max: 100)')
    })
  )
  .output(
    z.object({
      accounts: z.array(accountSchema),
      pagination: z
        .object({
          currentPage: z.number().optional(),
          perPage: z.number().optional(),
          totalEntries: z.number().optional(),
          totalPages: z.number().optional()
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new MxClient({ token: ctx.auth.token, environment: ctx.config.environment });

    let result: any;
    if (ctx.input.memberGuid) {
      result = await client.listAccountsByMember(ctx.input.userGuid, ctx.input.memberGuid, {
        page: ctx.input.page,
        recordsPerPage: ctx.input.recordsPerPage
      });
    } else {
      result = await client.listAccounts(ctx.input.userGuid, {
        page: ctx.input.page,
        recordsPerPage: ctx.input.recordsPerPage
      });
    }

    let accounts = (result.accounts || []).map((a: any) => ({
      guid: a.guid,
      userGuid: a.user_guid,
      memberGuid: a.member_guid,
      institutionCode: a.institution_code,
      name: a.name,
      type: a.type,
      subtype: a.subtype,
      balance: a.balance,
      availableBalance: a.available_balance,
      availableCredit: a.available_credit,
      creditLimit: a.credit_limit,
      currencyCode: a.currency_code,
      accountNumber: a.account_number,
      apr: a.apr,
      apy: a.apy,
      createdAt: a.created_at,
      updatedAt: a.updated_at
    }));

    return {
      output: {
        accounts,
        pagination: result.pagination
          ? {
              currentPage: result.pagination.current_page,
              perPage: result.pagination.per_page,
              totalEntries: result.pagination.total_entries,
              totalPages: result.pagination.total_pages
            }
          : undefined
      },
      message: `Found **${accounts.length}** accounts for user ${ctx.input.userGuid}${ctx.input.memberGuid ? ` (member: ${ctx.input.memberGuid})` : ''}.`
    };
  })
  .build();

export let readAccount = SlateTool.create(spec, {
  name: 'Read Account',
  key: 'read_account',
  description: `Retrieve detailed information about a specific financial account including balances, type, credit details, and currency information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userGuid: z.string().describe('MX GUID of the user'),
      accountGuid: z.string().describe('MX GUID of the account')
    })
  )
  .output(accountSchema)
  .handleInvocation(async ctx => {
    let client = new MxClient({ token: ctx.auth.token, environment: ctx.config.environment });
    let a = await client.readAccount(ctx.input.userGuid, ctx.input.accountGuid);

    return {
      output: {
        guid: a.guid,
        userGuid: a.user_guid,
        memberGuid: a.member_guid,
        institutionCode: a.institution_code,
        name: a.name,
        type: a.type,
        subtype: a.subtype,
        balance: a.balance,
        availableBalance: a.available_balance,
        availableCredit: a.available_credit,
        creditLimit: a.credit_limit,
        currencyCode: a.currency_code,
        accountNumber: a.account_number,
        apr: a.apr,
        apy: a.apy,
        createdAt: a.created_at,
        updatedAt: a.updated_at
      },
      message: `Account **${a.name || a.guid}** — Type: ${a.type}, Balance: ${a.balance}.`
    };
  })
  .build();

export let listAccountNumbers = SlateTool.create(spec, {
  name: 'List Account Numbers',
  key: 'list_account_numbers',
  description: `Retrieve account and routing numbers for a specific account. Useful for payment processing and money movement after account verification. Returns masked and full account numbers where available.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userGuid: z.string().describe('MX GUID of the user'),
      accountGuid: z.string().describe('MX GUID of the account')
    })
  )
  .output(
    z.object({
      accountNumbers: z.array(
        z.object({
          guid: z.string().optional(),
          accountGuid: z.string().optional(),
          memberGuid: z.string().optional(),
          userGuid: z.string().optional(),
          accountNumber: z.string().optional().nullable(),
          routingNumber: z.string().optional().nullable(),
          transitNumber: z.string().optional().nullable(),
          institutionNumber: z.string().optional().nullable()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new MxClient({ token: ctx.auth.token, environment: ctx.config.environment });
    let accountNumbers = await client.listAccountNumbers(
      ctx.input.userGuid,
      ctx.input.accountGuid
    );

    let mapped = (accountNumbers || []).map((an: any) => ({
      guid: an.guid,
      accountGuid: an.account_guid,
      memberGuid: an.member_guid,
      userGuid: an.user_guid,
      accountNumber: an.account_number,
      routingNumber: an.routing_number,
      transitNumber: an.transit_number,
      institutionNumber: an.institution_number
    }));

    return {
      output: { accountNumbers: mapped },
      message: `Found **${mapped.length}** account number(s) for account ${ctx.input.accountGuid}.`
    };
  })
  .build();
