import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, flattenResources, type JsonApiResource } from '../lib/client';
import { spec } from '../spec';

export let listServices = SlateTool.create(spec, {
  name: 'List Services',
  key: 'list_services',
  description: `List services from the Rootly service catalog. Search by name, slug, or keyword.
Use this to find service IDs for linking to incidents or alerts.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search services by keyword'),
      name: z.string().optional().describe('Filter by exact service name'),
      slug: z.string().optional().describe('Filter by service slug'),
      sort: z.string().optional().describe('Sort field'),
      pageNumber: z.number().optional().describe('Page number'),
      pageSize: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      returnedCount: z.number().describe('Number of records returned in this response'),
      currentPage: z.number().optional().describe('Provider page number, when supplied'),
      totalPages: z.number().optional().describe('Provider page count, when supplied'),
      nextCursor: z
        .string()
        .optional()
        .describe('Provider continuation cursor, when supplied'),
      included: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Requested related resources'),
      services: z.array(z.record(z.string(), z.any())).describe('List of services'),
      totalCount: z.number().optional().describe('Total count')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listServices({
      search: ctx.input.search,
      name: ctx.input.name,
      slug: ctx.input.slug,
      sort: ctx.input.sort,
      pageNumber: ctx.input.pageNumber,
      pageSize: ctx.input.pageSize
    });

    let services = flattenResources(result.data as JsonApiResource[]);

    return {
      output: {
        returnedCount: services.length,
        currentPage: result.meta?.current_page,
        totalPages: result.meta?.total_pages,
        nextCursor: result.meta?.next_cursor,
        included: result.included ? flattenResources(result.included) : undefined,
        services,
        totalCount: result.meta?.total_count
      },
      message: `Found **${services.length}** services.`
    };
  })
  .build();
