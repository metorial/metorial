import { SlateTool } from 'slates';
import { z } from 'zod';
import { NeonClient } from '../lib/client';
import { spec } from '../spec';

let operationSchema = z.object({
  operationId: z.string().describe('Unique identifier of the operation'),
  projectId: z.string().describe('Project the operation belongs to'),
  branchId: z.string().optional().describe('Branch associated with the operation'),
  endpointId: z.string().optional().describe('Endpoint associated with the operation'),
  action: z
    .string()
    .describe('Type of operation (e.g., create_branch, start_compute, suspend_compute)'),
  status: z
    .string()
    .describe(
      'Operation status: scheduling, running, finished, failed, cancelling, cancelled, error'
    ),
  createdAt: z.string().describe('Timestamp when the operation was created'),
  updatedAt: z.string().describe('Timestamp when the operation was last updated'),
  totalDurationMs: z
    .number()
    .optional()
    .describe('Total duration of the operation in milliseconds')
});

export let listOperations = SlateTool.create(spec, {
  name: 'List Operations',
  key: 'list_operations',
  description: `Lists recent operations for a Neon project. Operations are asynchronous tasks like creating branches, starting compute endpoints, or applying configuration changes. Use this to track the progress and status of background tasks.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project to list operations for'),
      limit: z.number().optional().describe('Maximum number of operations to return'),
      cursor: z.string().optional().describe('Pagination cursor for fetching next page')
    })
  )
  .output(
    z.object({
      operations: z.array(operationSchema).describe('List of operations'),
      cursor: z.string().optional().describe('Pagination cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NeonClient({ token: ctx.auth.token });
    let result = await client.listOperations(ctx.input.projectId, {
      limit: ctx.input.limit,
      cursor: ctx.input.cursor
    });

    let operations = (result.operations || []).map((op: any) => ({
      operationId: op.id,
      projectId: op.project_id,
      branchId: op.branch_id,
      endpointId: op.endpoint_id,
      action: op.action,
      status: op.status,
      createdAt: op.created_at,
      updatedAt: op.updated_at,
      totalDurationMs: op.total_duration_ms
    }));

    return {
      output: {
        operations,
        cursor: result.pagination?.cursor
      },
      message: `Found **${operations.length}** operation(s) for project \`${ctx.input.projectId}\`.`
    };
  })
  .build();

export let getOperation = SlateTool.create(spec, {
  name: 'Get Operation',
  key: 'get_operation',
  description: `Retrieves the details and current status of a specific operation. Use this to poll for completion of asynchronous operations before proceeding with dependent tasks.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project containing the operation'),
      operationId: z.string().describe('ID of the operation to retrieve')
    })
  )
  .output(operationSchema)
  .handleInvocation(async ctx => {
    let client = new NeonClient({ token: ctx.auth.token });
    let result = await client.getOperation(ctx.input.projectId, ctx.input.operationId);
    let op = result.operation;

    return {
      output: {
        operationId: op.id,
        projectId: op.project_id,
        branchId: op.branch_id,
        endpointId: op.endpoint_id,
        action: op.action,
        status: op.status,
        createdAt: op.created_at,
        updatedAt: op.updated_at,
        totalDurationMs: op.total_duration_ms
      },
      message: `Operation **${op.id}** (\`${op.action}\`): status is \`${op.status}\`${op.total_duration_ms ? ` (${op.total_duration_ms}ms)` : ''}.`
    };
  })
  .build();
