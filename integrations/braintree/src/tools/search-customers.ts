import { SlateTool } from 'slates';
import { z } from 'zod';
import { BraintreeGraphQLClient } from '../lib/client';
import { SEARCH_CUSTOMERS } from '../lib/graphql-queries';
import { spec } from '../spec';

let textMatchMode = z
  .enum(['is', 'contains', 'startsWith', 'endsWith'])
  .default('is')
  .describe('How text fields should be matched.');

let dateRangeSchema = z.object({
  after: z.string().optional().describe('Inclusive lower bound as an ISO timestamp'),
  before: z.string().optional().describe('Exclusive upper bound as an ISO timestamp')
});

let textFilter = (value: string | undefined, mode: z.infer<typeof textMatchMode>) =>
  value ? { [mode]: value } : undefined;

let dateRangeFilter = (range?: z.infer<typeof dateRangeSchema>) => {
  if (!range) return undefined;
  let filter: Record<string, string> = {};
  if (range.after) filter.greaterThanOrEqualTo = range.after;
  if (range.before) filter.lessThanOrEqualTo = range.before;
  return Object.keys(filter).length > 0 ? filter : undefined;
};

export let searchCustomers = SlateTool.create(spec, {
  name: 'Search Customers',
  key: 'search_customers',
  description: `Searches Braintree customers by ID, email, name, company, phone, or created date. Use this before finding, updating, or deleting a customer when only partial customer details are known.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      customerId: z.string().optional().describe('Exact customer ID to find'),
      email: z.string().optional().describe('Customer email filter'),
      firstName: z.string().optional().describe('Customer first name filter'),
      lastName: z.string().optional().describe('Customer last name filter'),
      company: z.string().optional().describe('Customer company filter'),
      phoneNumber: z.string().optional().describe('Customer phone number filter'),
      textMatchMode,
      createdAt: dateRangeSchema.optional().describe('Created-at timestamp range'),
      first: z.number().int().min(1).max(50).default(20).describe('Results to return'),
      after: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      customers: z.array(
        z.object({
          customerId: z.string().describe('Legacy customer ID usable with REST tools'),
          graphQLId: z.string().describe('GraphQL customer ID'),
          email: z.string().optional().nullable(),
          firstName: z.string().optional().nullable(),
          lastName: z.string().optional().nullable(),
          company: z.string().optional().nullable(),
          phone: z.string().optional().nullable(),
          website: z.string().optional().nullable(),
          createdAt: z.string().optional().nullable()
        })
      ),
      hasNextPage: z.boolean().describe('Whether more results are available'),
      endCursor: z.string().optional().nullable().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BraintreeGraphQLClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let input: Record<string, any> = {};
    if (ctx.input.customerId) input.id = { is: ctx.input.customerId };
    if (ctx.input.email) input.email = textFilter(ctx.input.email, ctx.input.textMatchMode);
    if (ctx.input.firstName)
      input.firstName = textFilter(ctx.input.firstName, ctx.input.textMatchMode);
    if (ctx.input.lastName)
      input.lastName = textFilter(ctx.input.lastName, ctx.input.textMatchMode);
    if (ctx.input.company)
      input.company = textFilter(ctx.input.company, ctx.input.textMatchMode);
    if (ctx.input.phoneNumber)
      input.phoneNumber = textFilter(ctx.input.phoneNumber, ctx.input.textMatchMode);
    let createdAt = dateRangeFilter(ctx.input.createdAt);
    if (createdAt) input.createdAt = createdAt;

    let result = await client.query(
      SEARCH_CUSTOMERS,
      {
        input,
        first: ctx.input.first,
        after: ctx.input.after || null
      },
      'search customers'
    );
    let connection = result.search.customers;
    let customers = (connection.edges || []).map((edge: any) => ({
      customerId: edge.node.legacyId || edge.node.id,
      graphQLId: edge.node.id,
      email: edge.node.email,
      firstName: edge.node.firstName,
      lastName: edge.node.lastName,
      company: edge.node.company,
      phone: edge.node.phoneNumber,
      website: edge.node.website,
      createdAt: edge.node.createdAt
    }));

    return {
      output: {
        customers,
        hasNextPage: connection.pageInfo?.hasNextPage || false,
        endCursor: connection.pageInfo?.endCursor
      },
      message: `Found **${customers.length}** Braintree customer(s)${connection.pageInfo?.hasNextPage ? ' (more available)' : ''}`
    };
  })
  .build();
