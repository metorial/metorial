import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCases = SlateTool.create(spec, {
  name: 'List Cases',
  key: 'list_cases',
  description: `Retrieve a paginated list of cases for a Docsumo case type. Supports filtering by stage, assignee, workflow state, and created or modified date ranges.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      casetypeId: z.string().describe('Case type ID. Get this from the List Agents tool.'),
      limit: z
        .number()
        .optional()
        .describe('Number of cases to return per page. Docsumo accepts 0-100.'),
      offset: z.number().optional().describe('Number of cases to skip for pagination'),
      sortBy: z
        .enum([
          'created_date.asc',
          'created_date.desc',
          'modified_date.asc',
          'modified_date.desc'
        ])
        .optional()
        .describe('Sort field and direction'),
      stageIds: z.array(z.string()).optional().describe('Stage IDs to filter by'),
      assignedTo: z.array(z.string()).optional().describe('User IDs to filter by assignee'),
      workflowStates: z.array(z.string()).optional().describe('Workflow states to filter by'),
      createdDateFrom: z
        .string()
        .optional()
        .describe('Created date lower bound in DD/MM/YYYY format'),
      createdDateTo: z
        .string()
        .optional()
        .describe('Created date upper bound in DD/MM/YYYY format'),
      modifiedDateFrom: z
        .string()
        .optional()
        .describe('Modified date lower bound in DD/MM/YYYY format'),
      modifiedDateTo: z
        .string()
        .optional()
        .describe('Modified date upper bound in DD/MM/YYYY format')
    })
  )
  .output(
    z.object({
      cases: z.array(z.record(z.string(), z.any())).describe('Cases returned by Docsumo'),
      pagination: z.record(z.string(), z.any()).describe('Pagination metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listCases({
      casetypeId: ctx.input.casetypeId,
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      sortBy: ctx.input.sortBy,
      stageIds: ctx.input.stageIds,
      assignedTo: ctx.input.assignedTo,
      workflowStates: ctx.input.workflowStates,
      createdDateFrom: ctx.input.createdDateFrom,
      createdDateTo: ctx.input.createdDateTo,
      modifiedDateFrom: ctx.input.modifiedDateFrom,
      modifiedDateTo: ctx.input.modifiedDateTo
    });

    return {
      output: result,
      message: `Found **${result.pagination.total ?? result.cases.length}** case(s). Returned ${result.cases.length}.`
    };
  })
  .build();
