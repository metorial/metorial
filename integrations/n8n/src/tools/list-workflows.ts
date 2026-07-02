import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listWorkflows = SlateTool.create(spec, {
  name: 'List Workflows',
  key: 'list_workflows',
  description: `List workflows in your n8n instance with optional filtering. Returns workflow metadata including name, active status, creation date, and tags. Supports filtering by active status, tags, name, and project.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      active: z.boolean().optional().describe('Filter by active status'),
      tags: z.string().optional().describe('Comma-separated list of tag names to filter by'),
      name: z.string().optional().describe('Filter workflows by name (partial match)'),
      projectId: z.string().optional().describe('Filter by project ID'),
      limit: z.number().optional().describe('Maximum number of workflows to return'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response')
    })
  )
  .output(
    z.object({
      workflows: z.array(
        z.object({
          workflowId: z.string().describe('Workflow ID'),
          name: z.string().describe('Workflow name'),
          active: z.boolean().describe('Whether the workflow is active'),
          createdAt: z.string().describe('Creation timestamp'),
          updatedAt: z.string().describe('Last update timestamp'),
          tags: z.array(z.any()).optional().describe('Tags associated with the workflow')
        })
      ),
      nextCursor: z.string().optional().describe('Cursor for the next page of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let result = await client.listWorkflows({
      active: ctx.input.active,
      tags: ctx.input.tags,
      name: ctx.input.name,
      projectId: ctx.input.projectId,
      limit: ctx.input.limit,
      cursor: ctx.input.cursor,
      excludePinnedData: true
    });

    let workflows = (result.data || []).map((w: any) => ({
      workflowId: String(w.id),
      name: w.name || '',
      active: w.active ?? false,
      createdAt: w.createdAt || '',
      updatedAt: w.updatedAt || '',
      tags: w.tags
    }));

    return {
      output: {
        workflows,
        nextCursor: result.nextCursor
      },
      message: `Found **${workflows.length}** workflow(s).${result.nextCursor ? ' More results available with pagination cursor.' : ''}`
    };
  })
  .build();
