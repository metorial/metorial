import { SlateTool } from 'slates';
import { z } from 'zod';
import { CoupaClient } from '../lib/client';
import { spec } from '../spec';

let accountOutputSchema = z.object({
  accountId: z.number().describe('Coupa internal account ID'),
  code: z.string().nullable().optional().describe('Account code'),
  name: z.string().nullable().optional().describe('Account name'),
  segmentOne: z.string().nullable().optional().describe('Segment 1 value'),
  segmentTwo: z.string().nullable().optional().describe('Segment 2 value'),
  segmentThree: z.string().nullable().optional().describe('Segment 3 value'),
  accountType: z.any().nullable().optional().describe('Account type'),
  active: z.boolean().nullable().optional().describe('Whether account is active'),
  createdAt: z.string().nullable().optional().describe('Creation timestamp'),
  updatedAt: z.string().nullable().optional().describe('Last update timestamp'),
  rawData: z.any().optional().describe('Complete raw account data')
});

export let searchAccounts = SlateTool.create(spec, {
  name: 'Search Accounts',
  key: 'search_accounts',
  description: `Search and list accounts in Coupa. Filter by code, name, active status, or account segments. Accounts represent your financial chart of accounts structure.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      code: z.string().optional().describe('Filter by account code'),
      name: z.string().optional().describe('Filter by account name'),
      active: z.boolean().optional().describe('Filter by active status'),
      updatedAfter: z
        .string()
        .optional()
        .describe('Filter accounts updated after this date (ISO 8601)'),
      filters: z
        .record(z.string(), z.string())
        .optional()
        .describe('Additional Coupa query filters'),
      orderBy: z.string().optional().describe('Field to sort by'),
      sortDirection: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      limit: z.number().optional().describe('Maximum number of results'),
      offset: z.number().optional().describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      accounts: z.array(accountOutputSchema).describe('List of matching accounts'),
      count: z.number().describe('Number of accounts returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CoupaClient({
      token: ctx.auth.token,
      instanceUrl: ctx.config.instanceUrl
    });

    let filters: Record<string, string> = {};
    if (ctx.input.filters) {
      for (let [key, value] of Object.entries(ctx.input.filters)) {
        filters[key] = value;
      }
    }
    if (ctx.input.code) filters.code = ctx.input.code;
    if (ctx.input.name) filters.name = ctx.input.name;
    if (ctx.input.active !== undefined) filters.active = String(ctx.input.active);
    if (ctx.input.updatedAfter) filters['updated-at[gt]'] = ctx.input.updatedAfter;

    let results = await client.listAccounts({
      filters,
      orderBy: ctx.input.orderBy,
      dir: ctx.input.sortDirection,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let accounts = (Array.isArray(results) ? results : []).map((a: any) => ({
      accountId: a.id,
      code: a.code ?? null,
      name: a.name ?? null,
      segmentOne: a['segment-1'] ?? a.segment_1 ?? null,
      segmentTwo: a['segment-2'] ?? a.segment_2 ?? null,
      segmentThree: a['segment-3'] ?? a.segment_3 ?? null,
      accountType: a['account-type'] ?? a.account_type ?? null,
      active: a.active ?? null,
      createdAt: a['created-at'] ?? a.created_at ?? null,
      updatedAt: a['updated-at'] ?? a.updated_at ?? null,
      rawData: a
    }));

    return {
      output: {
        accounts,
        count: accounts.length
      },
      message: `Found **${accounts.length}** account(s).`
    };
  })
  .build();

export let createAccount = SlateTool.create(spec, {
  name: 'Create Account',
  key: 'create_account',
  description: `Create a new account in Coupa to represent an item in your chart of accounts.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      code: z.string().describe('Account code'),
      name: z.string().describe('Account name'),
      segmentOne: z.string().optional().describe('Segment 1 value'),
      segmentTwo: z.string().optional().describe('Segment 2 value'),
      segmentThree: z.string().optional().describe('Segment 3 value'),
      accountType: z.object({ name: z.string() }).optional().describe('Account type'),
      active: z.boolean().optional().describe('Whether account is active'),
      customFields: z.record(z.string(), z.any()).optional().describe('Custom field values')
    })
  )
  .output(accountOutputSchema)
  .handleInvocation(async ctx => {
    let client = new CoupaClient({
      token: ctx.auth.token,
      instanceUrl: ctx.config.instanceUrl
    });

    let payload: any = {
      code: ctx.input.code,
      name: ctx.input.name
    };

    if (ctx.input.segmentOne) payload['segment-1'] = ctx.input.segmentOne;
    if (ctx.input.segmentTwo) payload['segment-2'] = ctx.input.segmentTwo;
    if (ctx.input.segmentThree) payload['segment-3'] = ctx.input.segmentThree;
    if (ctx.input.accountType) payload['account-type'] = ctx.input.accountType;
    if (ctx.input.active !== undefined) payload.active = ctx.input.active;

    if (ctx.input.customFields) {
      for (let [key, value] of Object.entries(ctx.input.customFields)) {
        payload[key] = value;
      }
    }

    let result = await client.createAccount(payload);

    return {
      output: {
        accountId: result.id,
        code: result.code ?? null,
        name: result.name ?? null,
        segmentOne: result['segment-1'] ?? result.segment_1 ?? null,
        segmentTwo: result['segment-2'] ?? result.segment_2 ?? null,
        segmentThree: result['segment-3'] ?? result.segment_3 ?? null,
        accountType: result['account-type'] ?? result.account_type ?? null,
        active: result.active ?? null,
        createdAt: result['created-at'] ?? result.created_at ?? null,
        updatedAt: result['updated-at'] ?? result.updated_at ?? null,
        rawData: result
      },
      message: `Created account **${result.code ?? result.id}** — ${result.name}.`
    };
  })
  .build();
