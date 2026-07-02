import { SlateTool } from 'slates';
import { z } from 'zod';
import { NeonClient } from '../lib/client';
import { neonValidationError } from '../lib/errors';
import { spec } from '../spec';

export let createBranch = SlateTool.create(spec, {
  name: 'Create Branch',
  key: 'create_branch',
  description: `Creates a new branch in a Neon project. Branches are copies of the parent branch's data at a specific point in time. Optionally creates a compute endpoint for the branch so it can accept connections.`,
  instructions: [
    'If no parent branch is specified, the branch is created from the project default branch.',
    'To create a branch from a specific point in time, provide either parentTimestamp or parentLsn.'
  ]
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project to create the branch in'),
      name: z
        .string()
        .optional()
        .describe('Name for the new branch. Auto-generated if not specified.'),
      parentId: z
        .string()
        .optional()
        .describe('ID of the parent branch. Defaults to the project default branch.'),
      parentTimestamp: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp to create the branch from a specific point in time'),
      parentLsn: z
        .string()
        .optional()
        .describe('Log Sequence Number to branch from a specific WAL position'),
      createEndpoint: z
        .boolean()
        .optional()
        .describe(
          'Whether to create a read-write compute endpoint for the branch (default: false)'
        )
    })
  )
  .output(
    z.object({
      branchId: z.string().describe('Unique identifier of the created branch'),
      projectId: z.string().describe('Project the branch belongs to'),
      name: z.string().describe('Name of the created branch'),
      parentId: z.string().optional().describe('ID of the parent branch'),
      createdAt: z.string().describe('Timestamp when the branch was created'),
      endpointId: z
        .string()
        .optional()
        .describe('ID of the compute endpoint created with the branch')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.parentTimestamp && ctx.input.parentLsn) {
      throw neonValidationError(
        'Provide either parentTimestamp or parentLsn when creating a branch, not both.'
      );
    }

    let client = new NeonClient({ token: ctx.auth.token });

    let endpoints = ctx.input.createEndpoint ? [{ type: 'read_write' }] : undefined;

    let result = await client.createBranch(ctx.input.projectId, {
      name: ctx.input.name,
      parentId: ctx.input.parentId,
      parentTimestamp: ctx.input.parentTimestamp,
      parentLsn: ctx.input.parentLsn,
      endpoints
    });

    let b = result.branch;
    let endpointId = result.endpoints?.[0]?.id;

    return {
      output: {
        branchId: b.id,
        projectId: b.project_id,
        name: b.name,
        parentId: b.parent_id,
        createdAt: b.created_at,
        endpointId
      },
      message: `Created branch **${b.name}** (${b.id})${endpointId ? ` with endpoint \`${endpointId}\`` : ''}.`
    };
  })
  .build();
