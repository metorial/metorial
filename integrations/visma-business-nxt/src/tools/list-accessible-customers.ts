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

export let listAccessibleCustomers = SlateTool.create(spec, {
  name: 'List Accessible Customers',
  key: 'list_accessible_customers',
  description:
    'List Visma.net customers linked to the authenticated Business NXT user. Use this before company discovery when a tenant has multiple customers.',
  tags: {
    readOnly: true
  }
})
  .scopes(businessNxtReadAccess)
  .input(
    z.object({
      first: firstSchema,
      last: lastSchema,
      orderDirection: sortDirectionSchema.describe(
        'Sort customers by name in ASC or DESC order.'
      )
    })
  )
  .output(
    z.object({
      customers: z.array(
        z.object({
          name: z.string().nullable().optional(),
          vismaNetCustomerId: z.number().nullable().optional(),
          provider: providerSchema
        })
      ),
      pagination: paginationSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = createBusinessNxtClient(ctx.auth);
    let result = await client.listAccessibleCustomers({
      first: getDefaultFirst(ctx.input.first, ctx.input.last, ctx.config.defaultPageSize),
      last: ctx.input.first === undefined ? ctx.input.last : undefined,
      orderDirection: ctx.input.orderDirection
    });

    return {
      output: {
        customers: result.items,
        pagination: result.pagination
      },
      message: `Found **${result.items.length}** accessible customer(s).`
    };
  })
  .build();
