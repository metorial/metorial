import { SlateTool } from 'slates';
import { z } from 'zod';
import { buildAccountFilter } from '../lib/client';
import { vismaBusinessNxtServiceError } from '../lib/errors';
import { businessNxtReadAccess } from '../lib/scopes';
import { spec } from '../spec';
import {
  afterSchema,
  companyNoSchema,
  createBusinessNxtClient,
  firstSchema,
  getDefaultFirst,
  paginationSchema,
  providerSchema,
  resolveCompanyNo,
  sortDirectionSchema
} from './common';

export let listChartOfAccounts = SlateTool.create(spec, {
  name: 'List Chart of Accounts',
  key: 'list_chart_of_accounts',
  description:
    'List Business NXT general ledger accounts for a company with optional account number and name filters.',
  tags: {
    readOnly: true
  }
})
  .scopes(businessNxtReadAccess)
  .input(
    z.object({
      companyNo: companyNoSchema,
      first: firstSchema,
      after: afterSchema,
      accountNo: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Filter by exact general ledger account number.'),
      accountNoFrom: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Filter for accounts greater than or equal to this account number.'),
      accountNoTo: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Filter for accounts less than or equal to this account number.'),
      nameContains: z
        .string()
        .min(1)
        .optional()
        .describe('Filter accounts with a name containing this text.'),
      orderDirection: sortDirectionSchema.describe(
        'Sort accounts by account number in ASC or DESC order.'
      )
    })
  )
  .output(
    z.object({
      accounts: z.array(
        z.object({
          accountNo: z.number().nullable().optional(),
          name: z.string().nullable().optional(),
          provider: providerSchema
        })
      ),
      pagination: paginationSchema
    })
  )
  .handleInvocation(async ctx => {
    if (
      ctx.input.accountNoFrom !== undefined &&
      ctx.input.accountNoTo !== undefined &&
      ctx.input.accountNoFrom > ctx.input.accountNoTo
    ) {
      throw vismaBusinessNxtServiceError(
        'accountNoFrom must be less than or equal to accountNoTo.',
        { reason: 'invalid_account_range' }
      );
    }

    let client = createBusinessNxtClient(ctx.auth);
    let result = await client.listChartOfAccounts({
      companyNo: resolveCompanyNo(ctx.input.companyNo, ctx.config.selectedCompanyNo),
      first: getDefaultFirst(ctx.input.first, undefined, ctx.config.defaultPageSize),
      after: ctx.input.after,
      filter: buildAccountFilter(ctx.input),
      orderDirection: ctx.input.orderDirection
    });

    return {
      output: {
        accounts: result.items,
        pagination: result.pagination
      },
      message: `Found **${result.items.length}** account(s).`
    };
  })
  .build();
