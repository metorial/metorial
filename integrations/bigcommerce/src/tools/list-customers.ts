import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCustomers = SlateTool.create(spec, {
  name: 'List Customers',
  key: 'list_customers',
  description: `Search and list customers. Supports filtering by email, name, company, customer group, date range, and more. Returns paginated results with customer details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination (default: 1)'),
      limit: z
        .number()
        .optional()
        .describe('Number of customers per page (max: 250, default: 50)'),
      email: z.string().optional().describe('Filter by exact email address'),
      name: z
        .string()
        .optional()
        .describe('Filter by customer name (partial match using name:like)'),
      company: z.string().optional().describe('Filter by company name'),
      customerGroupId: z.number().optional().describe('Filter by customer group ID'),
      dateCreatedMin: z
        .string()
        .optional()
        .describe('Filter customers created after this date (ISO 8601)'),
      dateCreatedMax: z
        .string()
        .optional()
        .describe('Filter customers created before this date (ISO 8601)'),
      dateModifiedMin: z
        .string()
        .optional()
        .describe('Filter customers modified after this date'),
      dateModifiedMax: z
        .string()
        .optional()
        .describe('Filter customers modified before this date'),
      sortBy: z
        .enum(['name', 'date_created', 'date_modified', 'last_name'])
        .optional()
        .describe('Sort field'),
      sortDirection: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      include: z
        .array(z.enum(['addresses', 'storecredit', 'attributes', 'formfields']))
        .optional()
        .describe('Sub-resources to include')
    })
  )
  .output(
    z.object({
      customers: z.array(z.any()).describe('Array of customer objects'),
      totalCustomers: z
        .number()
        .optional()
        .describe('Total number of customers matching filter'),
      currentPage: z.number().optional().describe('Current page number'),
      totalPages: z.number().optional().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      storeHash: ctx.config.storeHash
    });

    let params: Record<string, any> = {};
    if (ctx.input.page) params.page = ctx.input.page;
    if (ctx.input.limit) params.limit = ctx.input.limit;
    if (ctx.input.email) params['email:in'] = ctx.input.email;
    if (ctx.input.name) params['name:like'] = ctx.input.name;
    if (ctx.input.company) params['company:in'] = ctx.input.company;
    if (ctx.input.customerGroupId) params['customer_group_id:in'] = ctx.input.customerGroupId;
    if (ctx.input.dateCreatedMin) params['date_created:min'] = ctx.input.dateCreatedMin;
    if (ctx.input.dateCreatedMax) params['date_created:max'] = ctx.input.dateCreatedMax;
    if (ctx.input.dateModifiedMin) params['date_modified:min'] = ctx.input.dateModifiedMin;
    if (ctx.input.dateModifiedMax) params['date_modified:max'] = ctx.input.dateModifiedMax;
    if (ctx.input.sortBy) params.sort = ctx.input.sortBy;
    if (ctx.input.sortDirection) params.direction = ctx.input.sortDirection;
    if (ctx.input.include?.length) params.include = ctx.input.include.join(',');

    let result = await client.listCustomers(params);
    let pagination = result.meta?.pagination;

    return {
      output: {
        customers: result.data,
        totalCustomers: pagination?.total,
        currentPage: pagination?.current_page,
        totalPages: pagination?.total_pages
      },
      message: `Found ${result.data.length} customers${pagination?.total ? ` (${pagination.total} total)` : ''}.`
    };
  })
  .build();
