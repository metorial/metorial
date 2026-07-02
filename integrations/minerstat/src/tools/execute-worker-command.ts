import { SlateTool } from 'slates';
import { z } from 'zod';
import { ManagementClient } from '../lib/client';
import { spec } from '../spec';

export let executeWorkerCommandTool = SlateTool.create(spec, {
  name: 'Execute Worker Command',
  key: 'execute_worker_command',
  description: `Execute remote commands on mining workers such as shutdown, reboot, restart mining, stop mining, start mining, or run a custom command. Target by worker name or group. Requires the private API bearer token.`,
  constraints: [
    'Requires a Bearer token (private API)',
    'Rate limited to 3 queries per minute per worker',
    'Custom exec commands must be supported by the worker OS'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      command: z
        .enum(['shutdown', 'reboot', 'restart', 'stop', 'start', 'exec'])
        .describe('Command to execute'),
      workerName: z.string().optional().describe('Target worker name'),
      groupName: z
        .string()
        .optional()
        .describe('Target group name (command applies to all workers in group)'),
      customerId: z
        .number()
        .optional()
        .describe('Customer ID. If omitted, the main account is used.'),
      execCommand: z
        .string()
        .optional()
        .describe('Custom command string (required when command is "exec")')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the command was sent successfully'),
      response: z.any().describe('API response data')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.auth.token) {
      throw new Error(
        'Bearer token is required for executing commands. Use the "API Credentials" authentication method.'
      );
    }

    if (ctx.input.command === 'exec' && !ctx.input.execCommand) {
      throw new Error('execCommand is required when command is "exec".');
    }

    if (!ctx.input.workerName && !ctx.input.groupName) {
      throw new Error('Either workerName or groupName must be provided.');
    }

    let client = new ManagementClient({ token: ctx.auth.token });

    let targetLabel = ctx.input.workerName ?? `group: ${ctx.input.groupName}`;
    ctx.progress(`Executing ${ctx.input.command} on ${targetLabel}...`);

    let result = await client.executeCommand({
      name: ctx.input.workerName,
      group: ctx.input.groupName,
      user: ctx.input.customerId,
      command: ctx.input.command,
      exec: ctx.input.execCommand
    });

    return {
      output: {
        success: true,
        response: result
      },
      message: `Executed **${ctx.input.command}** on **${targetLabel}**.`
    };
  })
  .build();
