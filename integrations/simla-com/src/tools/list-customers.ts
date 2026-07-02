import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCustomers = SlateTool.create(spec, {
  name: 'List Customers',
  key: 'list_customers',
  description: `Search and list individual customers with flexible filtering. Supports filtering by name, email, phone, segment, creation date, custom fields, and more. Returns paginated results with full customer profiles.`,
  constraints: ['Maximum 100 results per page.', 'Rate limited to 10 requests per second.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      filter: z
        .object({
          ids: z.array(z.number()).optional().describe('Filter by internal customer IDs'),
          externalIds: z
            .array(z.string())
            .optional()
            .describe('Filter by external customer IDs'),
          city: z.string().optional().describe('Filter by city'),
          name: z.string().optional().describe('Filter by customer name (partial match)'),
          email: z.string().optional().describe('Filter by email'),
          notes: z.string().optional().describe('Filter by notes text'),
          minOrdersCount: z.number().optional().describe('Minimum number of orders'),
          maxOrdersCount: z.number().optional().describe('Maximum number of orders'),
          minAverageSumm: z.number().optional().describe('Minimum average order amount'),
          maxAverageSumm: z.number().optional().describe('Maximum average order amount'),
          minTotalSumm: z.number().optional().describe('Minimum total order amount'),
          maxTotalSumm: z.number().optional().describe('Maximum total order amount'),
          sex: z.enum(['male', 'female']).optional().describe('Filter by sex'),
          segment: z.string().optional().describe('Filter by segment code'),
          dateFrom: z.string().optional().describe('Creation date from (YYYY-MM-DD)'),
          dateTo: z.string().optional().describe('Creation date to (YYYY-MM-DD)'),
          managers: z.array(z.number()).optional().describe('Filter by manager IDs'),
          isContact: z.boolean().optional().describe('Filter by contact status'),
          customFields: z
            .record(z.string(), z.any())
            .optional()
            .describe('Filter by custom field values')
        })
        .optional()
        .describe('Filter criteria for searching customers'),
      page: z.number().optional().describe('Page number (default 1)'),
      limit: z.number().optional().describe('Number of results per page (max 100)')
    })
  )
  .output(
    z.object({
      customers: z.array(
        z.object({
          customerId: z.number().optional().describe('Internal customer ID'),
          externalId: z.string().optional().describe('External customer ID'),
          firstName: z.string().optional(),
          lastName: z.string().optional(),
          patronymic: z.string().optional(),
          email: z.string().optional(),
          phones: z.array(z.object({ number: z.string().optional() })).optional(),
          sex: z.string().optional(),
          birthday: z.string().optional(),
          createdAt: z.string().optional(),
          vip: z.boolean().optional(),
          bad: z.boolean().optional(),
          personalDiscount: z.number().optional(),
          cumulativeDiscount: z.number().optional(),
          segments: z
            .array(
              z.object({
                segmentId: z.number().optional(),
                code: z.string().optional(),
                name: z.string().optional()
              })
            )
            .optional(),
          managerId: z.number().optional(),
          customFields: z.record(z.string(), z.any()).optional(),
          site: z.string().optional()
        })
      ),
      totalCount: z.number().describe('Total number of matching customers'),
      currentPage: z.number().describe('Current page number'),
      totalPages: z.number().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain,
      site: ctx.config.site
    });

    let result = await client.getCustomers(ctx.input.filter, ctx.input.page, ctx.input.limit);

    let customers = result.customers.map(c => ({
      customerId: c.id,
      externalId: c.externalId,
      firstName: c.firstName,
      lastName: c.lastName,
      patronymic: c.patronymic,
      email: c.email,
      phones: c.phones,
      sex: c.sex,
      birthday: c.birthday,
      createdAt: c.createdAt,
      vip: c.vip,
      bad: c.bad,
      personalDiscount: c.personalDiscount,
      cumulativeDiscount: c.cumulativeDiscount,
      segments: c.segments?.map(s => ({
        segmentId: s.id,
        code: s.code,
        name: s.name
      })),
      managerId: c.managerId,
      customFields: c.customFields,
      site: c.site
    }));

    return {
      output: {
        customers,
        totalCount: result.pagination.totalCount,
        currentPage: result.pagination.currentPage,
        totalPages: result.pagination.totalPageCount
      },
      message: `Found **${result.pagination.totalCount}** customers (page ${result.pagination.currentPage} of ${result.pagination.totalPageCount}). Returned ${customers.length} results.`
    };
  })
  .build();
