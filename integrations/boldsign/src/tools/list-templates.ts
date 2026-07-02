import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTemplates = SlateTool.create(spec, {
  name: 'List Templates',
  key: 'list_templates',
  description: `List and search reusable document templates. Filter by template type, creator, labels, or brand. Returns paginated results with template metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (starts at 1)'),
      pageSize: z
        .number()
        .optional()
        .describe('Number of templates per page (max 100, default 10)'),
      templateType: z
        .enum(['AllTemplates', 'MyTemplates', 'SharedTemplates'])
        .optional()
        .describe('Filter by template ownership'),
      searchKey: z.string().optional().describe('Search by template ID, name, or labels'),
      createdBy: z.array(z.string()).optional().describe('Filter by creator email addresses'),
      templateLabels: z.array(z.string()).optional().describe('Filter by associated labels'),
      brandIds: z.array(z.string()).optional().describe('Filter by brand IDs')
    })
  )
  .output(
    z.object({
      pageDetails: z
        .object({
          pageSize: z.number(),
          page: z.number(),
          totalRecordsCount: z.number(),
          totalPages: z.number()
        })
        .describe('Pagination metadata'),
      result: z
        .array(z.record(z.string(), z.any()))
        .describe('Array of template objects with metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.listTemplates(ctx.input);

    return {
      output: result,
      message: `Found **${result.pageDetails.totalRecordsCount}** templates (page ${result.pageDetails.page} of ${result.pageDetails.totalPages}).`
    };
  })
  .build();
