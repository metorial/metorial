import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listCustomers = SlateTool.create(spec, {
  name: 'List Customers',
  key: 'list_customers',
  description: `Retrieve a list of customer profiles. Supports pagination and sorting by creation date or default order.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      cursor: z.string().optional().describe('Pagination cursor from a previous response'),
      limit: z.number().optional().describe('Maximum number of results per page'),
      sortField: z.enum(['DEFAULT', 'CREATED_AT']).optional().describe('Field to sort by'),
      sortOrder: z.enum(['ASC', 'DESC']).optional().describe('Sort order')
    })
  )
  .output(
    z.object({
      customers: z.array(
        z.object({
          customerId: z.string().optional(),
          givenName: z.string().optional(),
          familyName: z.string().optional(),
          companyName: z.string().optional(),
          emailAddress: z.string().optional(),
          phoneNumber: z.string().optional(),
          note: z.string().optional(),
          referenceId: z.string().optional(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional()
        })
      ),
      cursor: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let result = await client.listCustomers({
      cursor: ctx.input.cursor,
      limit: ctx.input.limit,
      sortField: ctx.input.sortField,
      sortOrder: ctx.input.sortOrder
    });

    let customers = result.customers.map(c => ({
      customerId: c.id,
      givenName: c.given_name,
      familyName: c.family_name,
      companyName: c.company_name,
      emailAddress: c.email_address,
      phoneNumber: c.phone_number,
      note: c.note,
      referenceId: c.reference_id,
      createdAt: c.created_at,
      updatedAt: c.updated_at
    }));

    return {
      output: { customers, cursor: result.cursor },
      message: `Found **${customers.length}** customer(s).${result.cursor ? ' More results available.' : ''}`
    };
  })
  .build();
