import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, flattenResources, type JsonApiResource } from '../lib/client';
import { spec } from '../spec';

export let listWorkflows = SlateTool.create(spec, {
  name: 'List Workflows',
  key: 'list_workflows',
  description: `List automated workflows configured in Rootly. Workflows are triggered by incident or alert events and perform automated tasks.
Search by name to find specific workflow automations.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search workflows by keyword'),
      name: z.string().optional().describe('Filter by workflow name'),
      include: z
        .string()
        .optional()
        .describe('Include related resources like "form_field_conditions"'),
      sort: z.string().optional().describe('Sort field'),
      pageNumber: z.number().optional().describe('Page number'),
      pageSize: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      workflows: z.array(z.record(z.string(), z.any())).describe('List of workflows'),
      totalCount: z.number().optional().describe('Total count')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listWorkflows({
      search: ctx.input.search,
      name: ctx.input.name,
      include: ctx.input.include,
      sort: ctx.input.sort,
      pageNumber: ctx.input.pageNumber,
      pageSize: ctx.input.pageSize
    });

    let workflows = flattenResources(result.data as JsonApiResource[]);

    return {
      output: {
        workflows,
        totalCount: result.meta?.total_count
      },
      message: `Found **${workflows.length}** workflows.`
    };
  })
  .build();
