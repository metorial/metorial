import { SlateTool } from 'slates';
import { z } from 'zod';
import { NeonClient } from '../lib/client';
import { spec } from '../spec';

let branchSchema = z.object({
  branchId: z.string().describe('Unique identifier of the branch'),
  projectId: z.string().describe('Project the branch belongs to'),
  name: z.string().describe('Name of the branch'),
  parentId: z.string().optional().describe('ID of the parent branch'),
  parentTimestamp: z
    .string()
    .optional()
    .describe('Timestamp of the parent branch point-in-time'),
  primary: z.boolean().optional().describe('Whether this is the primary (default) branch'),
  currentState: z.string().optional().describe('Current state of the branch'),
  createdAt: z.string().describe('Timestamp when the branch was created'),
  updatedAt: z.string().describe('Timestamp when the branch was last updated')
});

export let listBranches = SlateTool.create(spec, {
  name: 'List Branches',
  key: 'list_branches',
  description: `Lists all branches in a Neon project. Branches contain databases and can be created from any point in the project's history retention window.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project to list branches for'),
      search: z.string().optional().describe('Search term to filter branches by name'),
      limit: z.number().optional().describe('Maximum number of branches to return'),
      cursor: z.string().optional().describe('Pagination cursor for fetching next page')
    })
  )
  .output(
    z.object({
      branches: z.array(branchSchema).describe('List of branches'),
      cursor: z.string().optional().describe('Pagination cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NeonClient({ token: ctx.auth.token });

    let result = await client.listBranches(ctx.input.projectId, {
      search: ctx.input.search,
      limit: ctx.input.limit,
      cursor: ctx.input.cursor
    });

    let branches = (result.branches || []).map((b: any) => ({
      branchId: b.id,
      projectId: b.project_id,
      name: b.name,
      parentId: b.parent_id,
      parentTimestamp: b.parent_timestamp,
      primary: b.primary,
      currentState: b.current_state,
      createdAt: b.created_at,
      updatedAt: b.updated_at
    }));

    return {
      output: {
        branches,
        cursor: result.pagination?.cursor
      },
      message: `Found **${branches.length}** branch(es) in project \`${ctx.input.projectId}\`.`
    };
  })
  .build();
