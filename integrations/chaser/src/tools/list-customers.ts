import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { customerOutputSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listCustomers = SlateTool.create(spec, {
  name: 'List Customers',
  key: 'list_customers',
  description: `List customers in Chaser with optional filtering and pagination. Filter by external ID, company name, contact details, or status. Optionally include computed fields like payer rating and payment portal link.`,
  instructions: [
    'Filters use operators like "[eq]", "[in]", "[ne]", etc. appended to the field name in the filters object (e.g. `{ "status[eq]": "ACTIVE" }`).',
    'Pagination starts at page 0, with a default limit of 100 results per page.'
  ],
  constraints: ['Maximum 100 results per page.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().default(0).describe('Page number (starts at 0)'),
      limit: z.number().optional().default(100).describe('Results per page (max 100)'),
      filters: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Filter parameters (e.g. { "status[eq]": "ACTIVE", "company_name[in]": "Acme,Corp" })'
        ),
      includeAdditionalFields: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include payment portal link, payer rating, and average days to pay')
    })
  )
  .output(
    z.object({
      pageNumber: z.number().describe('Current page number'),
      pageSize: z.number().describe('Results per page'),
      totalCount: z.number().describe('Total number of matching customers'),
      customers: z.array(customerOutputSchema).describe('List of customers')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let additionalFields = ctx.input.includeAdditionalFields
      ? ['payment_portal_link', 'payer_rating', 'average_days_to_pay']
      : undefined;

    let result = await client.listCustomers({
      page: ctx.input.page,
      limit: ctx.input.limit,
      filters: ctx.input.filters,
      additionalFields
    });

    let customers = result.data.map((c: any) => ({
      customerId: c.id || '',
      externalId: c.externalId || '',
      companyName: c.companyName || '',
      contactFirstName: c.contactFirstName ?? null,
      contactLastName: c.contactLastName ?? null,
      contactEmailAddress: c.contactEmailAddress ?? null,
      phoneNumber: c.phoneNumber ?? null,
      mobileNumber: c.mobileNumber ?? null,
      status: c.status,
      groups: c.groups,
      addresses: c.addresses,
      paymentPortalLink: c.paymentPortalLink ?? null,
      payerRating: c.payerRating ?? null,
      payerRatingUpdatedAt: c.payerRatingUpdatedAt ?? null,
      payerRatingNumberInvoicesConsidered: c.payerRatingNumberInvoicesConsidered ?? null,
      averageDaysToPay: c.averageDaysToPay ?? null
    }));

    return {
      output: {
        pageNumber: result.pageNumber,
        pageSize: result.pageSize,
        totalCount: result.totalCount,
        customers
      },
      message: `Found **${result.totalCount}** customers (showing page ${result.pageNumber}, ${customers.length} results).`
    };
  })
  .build();
