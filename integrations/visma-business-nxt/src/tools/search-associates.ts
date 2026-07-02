import { SlateTool } from 'slates';
import { z } from 'zod';
import { buildAssociateFilter } from '../lib/client';
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

let associateSchema = z.object({
  associateNo: z.number().nullable().optional(),
  customerNo: z.number().nullable().optional(),
  supplierNo: z.number().nullable().optional(),
  name: z.string().nullable().optional(),
  provider: providerSchema
});

export let searchAssociates = SlateTool.create(spec, {
  name: 'Search Associates',
  key: 'search_associates',
  description:
    'Search Business NXT associates for customers and suppliers in a company using documented associate filters.',
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
      associateNo: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Filter by Business NXT associate number.'),
      customerNo: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Filter by Business NXT customer number.'),
      supplierNo: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Filter by Business NXT supplier number.'),
      nameContains: z
        .string()
        .min(1)
        .optional()
        .describe('Filter associates with a name containing this text.'),
      kind: z
        .enum(['customer', 'supplier'])
        .optional()
        .describe('Restrict results to customer associates or supplier associates.'),
      orderDirection: sortDirectionSchema.describe(
        'Sort associates by name in ASC or DESC order.'
      )
    })
  )
  .output(
    z.object({
      associates: z.array(associateSchema),
      pagination: paginationSchema
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.kind === 'customer' && ctx.input.supplierNo !== undefined) {
      throw vismaBusinessNxtServiceError('supplierNo cannot be combined with kind=customer.', {
        reason: 'invalid_associate_filter'
      });
    }

    if (ctx.input.kind === 'supplier' && ctx.input.customerNo !== undefined) {
      throw vismaBusinessNxtServiceError('customerNo cannot be combined with kind=supplier.', {
        reason: 'invalid_associate_filter'
      });
    }

    let client = createBusinessNxtClient(ctx.auth);
    let result = await client.searchAssociates({
      companyNo: resolveCompanyNo(ctx.input.companyNo, ctx.config.selectedCompanyNo),
      first: getDefaultFirst(ctx.input.first, undefined, ctx.config.defaultPageSize),
      after: ctx.input.after,
      filter: buildAssociateFilter(ctx.input),
      orderDirection: ctx.input.orderDirection
    });

    return {
      output: {
        associates: result.items,
        pagination: result.pagination
      },
      message: `Found **${result.items.length}** associate(s).`
    };
  })
  .build();
