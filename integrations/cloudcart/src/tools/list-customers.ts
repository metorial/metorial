import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCustomers = SlateTool.create(spec, {
  name: 'List Customers',
  key: 'list_customers',
  description: `Search and list customers from the CloudCart store. Supports filtering by customer group and sorting. Results are paginated.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      pageNumber: z.number().optional().describe('Page number to retrieve (1-based)'),
      pageSize: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of customers per page (max 100)'),
      sort: z
        .string()
        .optional()
        .describe('Sort field, prefix with - for descending (e.g. "-date_added")'),
      groupId: z.string().optional().describe('Filter by customer group ID')
    })
  )
  .output(
    z.object({
      customers: z.array(
        z.object({
          customerId: z.string(),
          firstName: z.string().optional(),
          lastName: z.string().optional(),
          email: z.string().optional(),
          active: z.any().optional(),
          newsletter: z.any().optional(),
          marketing: z.any().optional(),
          dateAdded: z.string().optional(),
          updatedAt: z.string().optional()
        })
      ),
      totalCount: z.number(),
      currentPage: z.number(),
      lastPage: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.config.domain });

    let filters: Record<string, string> = {};
    if (ctx.input.groupId) filters.group_id = ctx.input.groupId;

    let res = await client.listCustomers({
      pagination: { pageNumber: ctx.input.pageNumber, pageSize: ctx.input.pageSize },
      sort: ctx.input.sort,
      filters: Object.keys(filters).length > 0 ? filters : undefined
    });

    let customers = res.data.map(c => ({
      customerId: c.id,
      firstName: c.attributes.first_name,
      lastName: c.attributes.last_name,
      email: c.attributes.email,
      active: c.attributes.active,
      newsletter: c.attributes.newsletter,
      marketing: c.attributes.marketing,
      dateAdded: c.attributes.date_added,
      updatedAt: c.attributes.updated_at
    }));

    return {
      output: {
        customers,
        totalCount: res.meta.total,
        currentPage: res.meta['current-page'],
        lastPage: res.meta['last-page']
      },
      message: `Found **${res.meta.total}** customers (page ${res.meta['current-page']} of ${res.meta['last-page']}).`
    };
  })
  .build();
