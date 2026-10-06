import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { orgIdInput, upstream } from '../lib/validation';
import { spec } from '../spec';

export let manageCommand = SlateTool.create(spec, {
  name: 'Manage Command',
  key: 'manage_command',
  description: `Create, update, or delete a JumpCloud remote command (script). Commands can be scheduled, triggered via webhook, or run on demand on managed devices. Supports both Linux/Mac shell commands and Windows PowerShell/CMD commands.`,
  instructions: [
    'Use the native command type and run-as system-user ID. Command schedules can cause future execution.',
    'Set launchType to "trigger" and provide a trigger name to enable webhook-based execution.',
    'Bind devices separately with manage_associations using sourceType system and targetType command; no implicit bindings are created.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      orgId: orgIdInput,
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      commandId: z.string().optional().describe('Command ID (required for update and delete)'),
      name: z.string().optional().describe('Command name'),
      command: z.string().optional().describe('The command/script to execute'),
      commandType: z
        .enum(['linux', 'windows', 'mac'])
        .optional()
        .describe('Native command type: linux, mac, or windows'),
      user: z
        .string()
        .optional()
        .describe('Exact run-as system-user ID; required by native Linux/Mac commands'),
      sudo: z.boolean().optional().describe('Run with sudo privileges'),
      schedule: z
        .string()
        .optional()
        .describe(
          'Native six-field cron schedule (seconds through weekdays), or immediate/empty for immediate execution; creation or updates can schedule effects'
        ),
      scheduleRepeatType: z.string().optional().describe('Schedule repeat type'),
      launchType: z
        .enum(['manual', 'trigger', 'repeated'])
        .optional()
        .describe('How the command is launched'),
      trigger: z.string().optional().describe('Trigger name for webhook-based execution'),
      timeout: z.string().optional().describe('Command timeout in seconds'),
      shell: z
        .string()
        .optional()
        .describe('Shell to use (e.g. /bin/bash, /bin/sh, powershell)'),
      systems: z
        .array(z.string())
        .optional()
        .describe(
          'Legacy field retained: a nonempty value is refused because native commands ignore systems. Use an explicit system-to-command association instead.'
        )
    })
  )
  .output(
    z.object({
      commandId: z.string().describe('Command ID'),
      name: z.string().describe('Command name'),
      command: z.string().describe('Command script'),
      commandType: z.string().describe('Command type'),
      launchType: z.string().optional().describe('Launch type'),
      trigger: z.string().optional().describe('Trigger name')
    })
  )
  .handleInvocation(async ctx => {
    const client = clientFor(ctx);
    try {
      let buildData = () => {
        let data: Record<string, unknown> = {};
        if (ctx.input.name !== undefined) data.name = ctx.input.name;
        if (ctx.input.command !== undefined) data.command = ctx.input.command;
        if (ctx.input.commandType !== undefined) data.commandType = ctx.input.commandType;
        if (ctx.input.user !== undefined) data.user = ctx.input.user;
        if (ctx.input.sudo !== undefined) data.sudo = ctx.input.sudo;
        if (ctx.input.schedule !== undefined) data.schedule = ctx.input.schedule;
        if (ctx.input.scheduleRepeatType !== undefined)
          data.scheduleRepeatType = ctx.input.scheduleRepeatType;
        if (ctx.input.launchType !== undefined) data.launchType = ctx.input.launchType;
        if (ctx.input.trigger !== undefined) data.trigger = ctx.input.trigger;
        if (ctx.input.timeout !== undefined) data.timeout = ctx.input.timeout;
        if (ctx.input.shell !== undefined) data.shell = ctx.input.shell;
        if (ctx.input.systems !== undefined) data.systems = ctx.input.systems;
        return data;
      };

      let cmd: import('../lib/types').JumpCloudCommand;
      let actionMessage: string;

      if (ctx.input.action === 'create') {
        if (!ctx.input.name || !ctx.input.command || !ctx.input.commandType) {
          throw createApiServiceError(
            'name, command, and commandType are required for create action'
          );
        }
        cmd = await client.createCommand(buildData());
        actionMessage = `Created command **${cmd.name}**`;
      } else if (ctx.input.action === 'update') {
        if (!ctx.input.commandId)
          throw createApiServiceError('commandId is required for update action');
        cmd = await client.updateCommand(ctx.input.commandId, buildData());
        actionMessage = `Updated command **${cmd.name}**`;
      } else {
        if (!ctx.input.commandId)
          throw createApiServiceError('commandId is required for delete action');
        let existing = await client.getCommand(ctx.input.commandId);
        await client.deleteCommand(ctx.input.commandId);
        cmd = existing;
        actionMessage = `Deletion accepted for command **${cmd.name}**`;
      }

      return {
        output: {
          commandId: cmd._id,
          name: cmd.name,
          command: cmd.command,
          commandType: cmd.commandType,
          launchType: cmd.launchType,
          trigger: cmd.trigger
        },
        message: actionMessage
      };
    } catch (error) {
      throw upstream(error, client.didWrite);
    }
  })
  .build();
