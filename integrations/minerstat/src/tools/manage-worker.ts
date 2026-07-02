import { SlateTool } from 'slates';
import { z } from 'zod';
import { ManagementClient } from '../lib/client';
import { spec } from '../spec';

export let manageWorkerTool = SlateTool.create(spec, {
  name: 'Manage Worker',
  key: 'manage_worker',
  description: `Create, update, or delete mining workers. When creating, specify name, type, and system. When updating, use the "set", "add", and "remove" parameters to modify worker properties like name, IP, mining client, config, ClockTune profile, groups, profit switching, and more. Can also target workers by group or customer.`,
  instructions: [
    'For creating: provide name, workerType, and system. Optional: ip, username, password, group, customerId, config, miningClient.',
    'For updating: provide either workerName or groupName to target workers. Use "set" for setting values, "add" for adding group membership, "remove" for removing group membership.',
    'For deleting: provide workerName and/or groupName of the worker(s) to delete.'
  ],
  constraints: [
    'Requires a Bearer token (private API). Rate limited to 3 queries per minute per worker.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'delete'])
        .describe('Action to perform on the worker'),
      workerName: z.string().optional().describe('Worker name to target'),
      groupName: z
        .string()
        .optional()
        .describe('Group name to target (applies action to all workers in group)'),
      customerId: z
        .number()
        .optional()
        .describe('Customer ID. If omitted, the main account is used.'),
      workerType: z
        .enum(['nvidia', 'amd', 'asic'])
        .optional()
        .describe('Worker type (required for create)'),
      system: z
        .string()
        .optional()
        .describe('System type, e.g. "windows", "msos", "antminer" (required for create)'),
      ip: z.string().optional().describe('Worker IP address (for ASIC workers)'),
      username: z.string().optional().describe('Worker username (for ASIC workers)'),
      password: z.string().optional().describe('Worker password (for ASIC workers)'),
      miningClient: z.string().optional().describe('Default mining client'),
      config: z.string().optional().describe('Worker configuration string'),
      set: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Object of values to set. Keys: name, ip, username, password, notes, client, config, clocktune, profitswitch, electricityprice, consumption'
        ),
      add: z
        .record(z.string(), z.any())
        .optional()
        .describe('Object of values to add. Keys: group (comma-separated group names)'),
      remove: z
        .record(z.string(), z.any())
        .optional()
        .describe('Object of values to remove. Keys: group (comma-separated group names)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation succeeded'),
      response: z.any().describe('API response data')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.auth.token) {
      throw new Error(
        'Bearer token is required for worker management. Use the "API Credentials" authentication method.'
      );
    }

    let client = new ManagementClient({ token: ctx.auth.token });
    let result: any;

    switch (ctx.input.action) {
      case 'create': {
        if (!ctx.input.workerName || !ctx.input.workerType || !ctx.input.system) {
          throw new Error(
            'workerName, workerType, and system are required to create a worker.'
          );
        }
        ctx.progress(`Creating worker ${ctx.input.workerName}...`);
        result = await client.createWorker({
          name: ctx.input.workerName,
          type: ctx.input.workerType,
          system: ctx.input.system,
          ip: ctx.input.ip,
          username: ctx.input.username,
          password: ctx.input.password,
          group: ctx.input.groupName,
          user: ctx.input.customerId,
          config: ctx.input.config,
          client: ctx.input.miningClient
        });
        break;
      }
      case 'update': {
        ctx.progress(
          `Updating worker${ctx.input.workerName ? ` ${ctx.input.workerName}` : ''}...`
        );
        result = await client.updateWorker({
          name: ctx.input.workerName,
          group: ctx.input.groupName,
          user: ctx.input.customerId,
          set: ctx.input.set,
          add: ctx.input.add,
          remove: ctx.input.remove
        });
        break;
      }
      case 'delete': {
        ctx.progress(
          `Deleting worker${ctx.input.workerName ? ` ${ctx.input.workerName}` : ''}...`
        );
        result = await client.deleteWorker({
          name: ctx.input.workerName,
          group: ctx.input.groupName,
          user: ctx.input.customerId
        });
        break;
      }
    }

    let targetLabel = ctx.input.workerName ?? ctx.input.groupName ?? 'workers';

    return {
      output: {
        success: true,
        response: result
      },
      message: `Successfully **${ctx.input.action}d** worker(s): **${targetLabel}**.`
    };
  })
  .build();
