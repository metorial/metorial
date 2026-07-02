import { SlateTool } from 'slates';
import { z } from 'zod';
import { businessNxtReadAccess } from '../lib/scopes';
import { spec } from '../spec';
import {
  createBusinessNxtClient,
  firstSchema,
  getDefaultFirst,
  lastSchema,
  paginationSchema,
  providerSchema,
  sortDirectionSchema
} from './common';

export let listAccessibleCompanies = SlateTool.create(spec, {
  name: 'List Accessible Companies',
  key: 'list_accessible_companies',
  description:
    'List Business NXT companies available to the authenticated user. Use the returned vismaNetCompanyId as companyNo for company-scoped tools.',
  tags: {
    readOnly: true
  }
})
  .scopes(businessNxtReadAccess)
  .input(
    z.object({
      customerNo: z
        .number()
        .int()
        .positive()
        .optional()
        .describe(
          'Optional Visma.net customer ID. Defaults to selectedCustomerNo in integration config when set.'
        ),
      first: firstSchema,
      last: lastSchema,
      orderDirection: sortDirectionSchema.describe(
        'Sort companies by name in ASC or DESC order.'
      )
    })
  )
  .output(
    z.object({
      companies: z.array(
        z.object({
          name: z.string().nullable().optional(),
          vismaNetCompanyId: z.number().nullable().optional(),
          vismaNetCustomerId: z.number().nullable().optional(),
          provider: providerSchema
        })
      ),
      pagination: paginationSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = createBusinessNxtClient(ctx.auth);
    let result = await client.listAccessibleCompanies({
      customerNo: ctx.input.customerNo ?? ctx.config.selectedCustomerNo,
      first: getDefaultFirst(ctx.input.first, ctx.input.last, ctx.config.defaultPageSize),
      last: ctx.input.first === undefined ? ctx.input.last : undefined,
      orderDirection: ctx.input.orderDirection
    });

    return {
      output: {
        companies: result.items,
        pagination: result.pagination
      },
      message: `Found **${result.items.length}** accessible compan${
        result.items.length === 1 ? 'y' : 'ies'
      }.`
    };
  })
  .build();
