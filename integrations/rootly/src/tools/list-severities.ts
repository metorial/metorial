import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, flattenResources, type JsonApiResource } from '../lib/client';
import { spec } from '../spec';

export let listSeverities = SlateTool.create(spec, {
  name: 'List Severities',
  key: 'list_severities',
  description: `List all severity levels configured in the Rootly organization.
Use this to find severity IDs when creating or updating incidents.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      pageNumber: z.number().optional().describe('Page number'),
      pageSize: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      totalCount: z
        .number()
        .optional()
        .describe('Provider total number of matching records, when supplied'),
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
      severities: z.array(z.record(z.string(), z.any())).describe('List of severity levels')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listSeverities({
      pageNumber: ctx.input.pageNumber,
      pageSize: ctx.input.pageSize
    });

    let severities = flattenResources(result.data as JsonApiResource[]);

    return {
      output: {
        totalCount: result.meta?.total_count,
        returnedCount: severities.length,
        currentPage: result.meta?.current_page,
        totalPages: result.meta?.total_pages,
        nextCursor: result.meta?.next_cursor,
        included: result.included ? flattenResources(result.included) : undefined,
        severities
      },
      message: `Found **${severities.length}** severity levels.`
    };
  })
  .build();
