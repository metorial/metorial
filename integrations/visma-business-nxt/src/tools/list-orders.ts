import { SlateTool } from 'slates';
import { z } from 'zod';
import { buildOrderFilter } from '../lib/client';
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

export let listOrders = SlateTool.create(spec, {
  name: 'List Orders',
  key: 'list_orders',
  description:
    'List Business NXT orders for a company with optional order/customer filters and a small line summary.',
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
      orderNo: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Filter by exact order number.'),
      customerNo: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Filter orders by Business NXT customer number.'),
      lineLimit: z
        .number()
        .int()
        .min(1)
        .max(10)
        .optional()
        .describe('Maximum number of order lines to return per order. Defaults to 3.'),
      orderDirection: sortDirectionSchema.describe(
        'Sort orders by order number in ASC or DESC order.'
      )
    })
  )
  .output(
    z.object({
      orders: z.array(
        z.object({
          orderNo: z.number().nullable().optional(),
          customerNo: z.number().nullable().optional(),
          employeeNo: z.number().nullable().optional(),
          lines: z.array(
            z.object({
              lineNo: z.number().nullable().optional(),
              amountDomestic: z.number().nullable().optional()
            })
          ),
          provider: providerSchema
        })
      ),
      pagination: paginationSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = createBusinessNxtClient(ctx.auth);
    let result = await client.listOrders({
      companyNo: resolveCompanyNo(ctx.input.companyNo, ctx.config.selectedCompanyNo),
      first: getDefaultFirst(ctx.input.first, undefined, ctx.config.defaultPageSize),
      after: ctx.input.after,
      filter: buildOrderFilter(ctx.input),
      orderDirection: ctx.input.orderDirection,
      lineLimit: ctx.input.lineLimit ?? 3
    });

    return {
      output: {
        orders: result.items,
        pagination: result.pagination
      },
      message: `Found **${result.items.length}** order(s).`
    };
  })
  .build();
