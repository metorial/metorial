import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCustomers = SlateTool.create(spec, {
  name: 'List Customers',
  key: 'list_customers',
  description: `List customers in your Plain workspace with optional pagination. Returns customers along with their company and metadata.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      first: z
        .number()
        .optional()
        .default(25)
        .describe('Number of customers to return (max 100)'),
      after: z.string().optional().describe('Cursor for pagination')
    })
  )
  .output(
    z.object({
      customers: z.array(
        z.object({
          customerId: z.string().describe('Plain customer ID'),
          fullName: z.string().nullable().describe('Customer full name'),
          email: z.string().nullable().describe('Customer email address'),
          externalId: z.string().nullable().describe('External customer ID'),
          companyName: z.string().nullable().describe('Company name')
        })
      ),
      totalCount: z.number().describe('Total number of customers'),
      hasNextPage: z.boolean().describe('Whether more pages exist'),
      endCursor: z.string().nullable().describe('Cursor for next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let res = await client.getCustomers(undefined, ctx.input.first, ctx.input.after);

    let customers = (res.edges || []).map((edge: any) => ({
      customerId: edge.node.id,
      fullName: edge.node.fullName,
      email: edge.node.email?.email ?? null,
      externalId: edge.node.externalId,
      companyName: edge.node.company?.name ?? null
    }));

    return {
      output: {
        customers,
        totalCount: res.totalCount,
        hasNextPage: res.pageInfo?.hasNextPage ?? false,
        endCursor: res.pageInfo?.endCursor ?? null
      },
      message: `Found **${res.totalCount}** customers, returning ${customers.length}`
    };
  })
  .build();
