import { SlateTool } from 'slates';
import { z } from 'zod';
import { NeonClient } from '../lib/client';
import { spec } from '../spec';

let endpointSchema = z.object({
  endpointId: z.string().describe('Unique identifier of the compute endpoint'),
  projectId: z.string().describe('Project the endpoint belongs to'),
  branchId: z.string().describe('Branch the endpoint is connected to'),
  type: z.string().describe('Endpoint type: read_write or read_only'),
  host: z.string().optional().describe('Hostname for connecting to the endpoint'),
  currentState: z
    .string()
    .optional()
    .describe('Current state of the endpoint (init, active, idle, suspended)'),
  autoscalingLimitMinCu: z
    .number()
    .optional()
    .describe('Minimum compute units for autoscaling'),
  autoscalingLimitMaxCu: z
    .number()
    .optional()
    .describe('Maximum compute units for autoscaling'),
  suspendTimeoutSeconds: z
    .number()
    .optional()
    .describe('Seconds of inactivity before the endpoint is suspended'),
  createdAt: z.string().describe('Timestamp when the endpoint was created'),
  updatedAt: z.string().describe('Timestamp when the endpoint was last updated')
});

export let listEndpoints = SlateTool.create(spec, {
  name: 'List Endpoints',
  key: 'list_endpoints',
  description: `Lists all compute endpoints in a Neon project. Endpoints are processing instances that connect to branches and provide database connectivity.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project to list endpoints for')
    })
  )
  .output(
    z.object({
      endpoints: z.array(endpointSchema).describe('List of compute endpoints')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NeonClient({ token: ctx.auth.token });
    let result = await client.listEndpoints(ctx.input.projectId);

    let endpoints = (result.endpoints || []).map((e: any) => ({
      endpointId: e.id,
      projectId: e.project_id,
      branchId: e.branch_id,
      type: e.type,
      host: e.host,
      currentState: e.current_state,
      autoscalingLimitMinCu: e.autoscaling_limit_min_cu,
      autoscalingLimitMaxCu: e.autoscaling_limit_max_cu,
      suspendTimeoutSeconds: e.suspend_timeout_seconds,
      createdAt: e.created_at,
      updatedAt: e.updated_at
    }));

    return {
      output: { endpoints },
      message: `Found **${endpoints.length}** endpoint(s) in project \`${ctx.input.projectId}\`.`
    };
  })
  .build();

export let createEndpoint = SlateTool.create(spec, {
  name: 'Create Endpoint',
  key: 'create_endpoint',
  description: `Creates a new compute endpoint for a branch. Endpoints provide the processing power for running queries. Each branch supports one read-write endpoint and multiple read-only (replica) endpoints.`,
  instructions: [
    'Each branch can have one read_write endpoint and multiple read_only endpoints.',
    'Autoscaling limits control the min/max compute units allocated.'
  ]
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project'),
      branchId: z.string().describe('ID of the branch to attach the endpoint to'),
      type: z
        .enum(['read_write', 'read_only'])
        .describe('Endpoint type: read_write for primary or read_only for replicas'),
      autoscalingLimitMinCu: z
        .number()
        .optional()
        .describe('Minimum compute units (e.g., 0.25, 0.5, 1, 2, 4)'),
      autoscalingLimitMaxCu: z
        .number()
        .optional()
        .describe('Maximum compute units (e.g., 0.25, 0.5, 1, 2, 4, 8)'),
      suspendTimeoutSeconds: z
        .number()
        .optional()
        .describe(
          'Seconds of inactivity before the endpoint suspends (0 to disable auto-suspend)'
        )
    })
  )
  .output(endpointSchema)
  .handleInvocation(async ctx => {
    let client = new NeonClient({ token: ctx.auth.token });
    let result = await client.createEndpoint(ctx.input.projectId, {
      branchId: ctx.input.branchId,
      type: ctx.input.type,
      autoscalingLimitMinCu: ctx.input.autoscalingLimitMinCu,
      autoscalingLimitMaxCu: ctx.input.autoscalingLimitMaxCu,
      suspendTimeoutSeconds: ctx.input.suspendTimeoutSeconds
    });

    let e = result.endpoint;

    return {
      output: {
        endpointId: e.id,
        projectId: e.project_id,
        branchId: e.branch_id,
        type: e.type,
        host: e.host,
        currentState: e.current_state,
        autoscalingLimitMinCu: e.autoscaling_limit_min_cu,
        autoscalingLimitMaxCu: e.autoscaling_limit_max_cu,
        suspendTimeoutSeconds: e.suspend_timeout_seconds,
        createdAt: e.created_at,
        updatedAt: e.updated_at
      },
      message: `Created \`${e.type}\` endpoint **${e.id}** on branch \`${e.branch_id}\`.`
    };
  })
  .build();

export let updateEndpoint = SlateTool.create(spec, {
  name: 'Update Endpoint',
  key: 'update_endpoint',
  description: `Updates a compute endpoint's autoscaling limits and suspend timeout configuration.`
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project'),
      endpointId: z.string().describe('ID of the endpoint to update'),
      autoscalingLimitMinCu: z.number().optional().describe('New minimum compute units'),
      autoscalingLimitMaxCu: z.number().optional().describe('New maximum compute units'),
      suspendTimeoutSeconds: z
        .number()
        .optional()
        .describe('New suspend timeout in seconds (0 to disable)')
    })
  )
  .output(endpointSchema)
  .handleInvocation(async ctx => {
    let client = new NeonClient({ token: ctx.auth.token });
    let result = await client.updateEndpoint(ctx.input.projectId, ctx.input.endpointId, {
      autoscalingLimitMinCu: ctx.input.autoscalingLimitMinCu,
      autoscalingLimitMaxCu: ctx.input.autoscalingLimitMaxCu,
      suspendTimeoutSeconds: ctx.input.suspendTimeoutSeconds
    });

    let e = result.endpoint;

    return {
      output: {
        endpointId: e.id,
        projectId: e.project_id,
        branchId: e.branch_id,
        type: e.type,
        host: e.host,
        currentState: e.current_state,
        autoscalingLimitMinCu: e.autoscaling_limit_min_cu,
        autoscalingLimitMaxCu: e.autoscaling_limit_max_cu,
        suspendTimeoutSeconds: e.suspend_timeout_seconds,
        createdAt: e.created_at,
        updatedAt: e.updated_at
      },
      message: `Updated endpoint **${e.id}** (min: ${e.autoscaling_limit_min_cu} CU, max: ${e.autoscaling_limit_max_cu} CU, suspend: ${e.suspend_timeout_seconds}s).`
    };
  })
  .build();

export let deleteEndpoint = SlateTool.create(spec, {
  name: 'Delete Endpoint',
  key: 'delete_endpoint',
  description: `Deletes a compute endpoint from a Neon project. The branch and its data remain intact.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project'),
      endpointId: z.string().describe('ID of the endpoint to delete')
    })
  )
  .output(
    z.object({
      endpointId: z.string().describe('ID of the deleted endpoint'),
      deleted: z.boolean().describe('Whether the endpoint was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NeonClient({ token: ctx.auth.token });
    await client.deleteEndpoint(ctx.input.projectId, ctx.input.endpointId);

    return {
      output: {
        endpointId: ctx.input.endpointId,
        deleted: true
      },
      message: `Deleted endpoint **${ctx.input.endpointId}**.`
    };
  })
  .build();

export let controlEndpoint = SlateTool.create(spec, {
  name: 'Control Endpoint',
  key: 'control_endpoint',
  description: `Starts, suspends, or restarts a compute endpoint. Use this to manage the lifecycle of compute instances — wake up suspended endpoints, suspend active ones to save costs, or restart for configuration changes.`
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project'),
      endpointId: z.string().describe('ID of the endpoint to control'),
      action: z
        .enum(['start', 'suspend', 'restart'])
        .describe('Action to perform on the endpoint')
    })
  )
  .output(endpointSchema)
  .handleInvocation(async ctx => {
    let client = new NeonClient({ token: ctx.auth.token });
    let result: any;

    if (ctx.input.action === 'start') {
      result = await client.startEndpoint(ctx.input.projectId, ctx.input.endpointId);
    } else if (ctx.input.action === 'suspend') {
      result = await client.suspendEndpoint(ctx.input.projectId, ctx.input.endpointId);
    } else {
      result = await client.restartEndpoint(ctx.input.projectId, ctx.input.endpointId);
    }

    let e = result.endpoint;

    return {
      output: {
        endpointId: e.id,
        projectId: e.project_id,
        branchId: e.branch_id,
        type: e.type,
        host: e.host,
        currentState: e.current_state,
        autoscalingLimitMinCu: e.autoscaling_limit_min_cu,
        autoscalingLimitMaxCu: e.autoscaling_limit_max_cu,
        suspendTimeoutSeconds: e.suspend_timeout_seconds,
        createdAt: e.created_at,
        updatedAt: e.updated_at
      },
      message: `Endpoint **${e.id}** has been ${ctx.input.action === 'start' ? 'started' : ctx.input.action === 'suspend' ? 'suspended' : 'restarted'}. Current state: \`${e.current_state}\`.`
    };
  })
  .build();
