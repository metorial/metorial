import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let sshCommandSchema = z.object({
  commandIdentifier: z.string().describe('SSH command identifier'),
  description: z.string().describe('Command description'),
  command: z.string().describe('The SSH command to execute'),
  callback: z.string().describe('When to run: "before_changes" or "after_changes"'),
  timing: z.string().describe('Deployment scope: "all", "first", or "after_first"'),
  haltOnError: z.boolean().describe('Whether to stop deployment on failure'),
  position: z.number().optional().describe('Execution order position'),
  servers: z
    .array(
      z.object({
        serverIdentifier: z.string().describe('Server identifier'),
        name: z.string().describe('Server name')
      })
    )
    .optional()
    .describe('Servers this command runs on')
});

export let listSshCommands = SlateTool.create(spec, {
  name: 'List SSH Commands',
  key: 'list_ssh_commands',
  description: `List all SSH commands configured for a DeployHQ project. SSH commands run on servers before or after a deployment (e.g., service restarts, database migrations).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectPermalink: z.string().describe('The permalink (slug) of the project')
    })
  )
  .output(
    z.object({
      sshCommands: z.array(sshCommandSchema).describe('List of SSH commands')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      email: ctx.auth.email,
      accountName: ctx.config.accountName
    });

    let commands = await client.listCommands(ctx.input.projectPermalink);

    let mapped = (Array.isArray(commands) ? commands : []).map((c: any) => ({
      commandIdentifier: c.identifier,
      description: c.description,
      command: c.command,
      callback: c.cback,
      timing: c.timing,
      haltOnError: c.halt_on_error,
      position: c.position,
      servers: (c.servers || []).map((s: any) => ({
        serverIdentifier: s.identifier,
        name: s.name
      }))
    }));

    return {
      output: { sshCommands: mapped },
      message: `Found **${mapped.length}** SSH command(s) in project \`${ctx.input.projectPermalink}\`.`
    };
  })
  .build();

export let createSshCommand = SlateTool.create(spec, {
  name: 'Create SSH Command',
  key: 'create_ssh_command',
  description: `Add a new SSH command to a DeployHQ project. SSH commands execute on servers before or after deployments for tasks like restarting services, running migrations, or clearing caches.`,
  instructions: [
    'Commands run in the $HOME directory of the connecting user unless you cd to another path first.',
    'Timeout values: 300 (5 min), 1800 (30 min), 3600 (1 hour), or 5400 (1.5 hours).'
  ]
})
  .input(
    z.object({
      projectPermalink: z.string().describe('The permalink (slug) of the project'),
      description: z.string().describe('Description of what this command does'),
      command: z.string().describe('The SSH command to execute'),
      callback: z
        .enum(['before_changes', 'after_changes'])
        .describe('When to run the command relative to file deployment'),
      timing: z
        .enum(['all', 'first', 'after_first'])
        .describe('Which deployments to run on: "all", "first" only, or "after_first"'),
      timeout: z.number().describe('Command timeout in seconds (300, 1800, 3600, or 5400)'),
      haltOnError: z.boolean().optional().describe('Stop deployment if the command fails'),
      allServers: z.boolean().optional().describe('Run on all current and future servers'),
      serverIdentifiers: z
        .array(z.string())
        .optional()
        .describe('Specific server or server group identifiers to run on')
    })
  )
  .output(sshCommandSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      email: ctx.auth.email,
      accountName: ctx.config.accountName
    });

    let data: Record<string, any> = {
      description: ctx.input.description,
      command: ctx.input.command,
      cback: ctx.input.callback,
      timing: ctx.input.timing,
      timeout: ctx.input.timeout
    };
    if (ctx.input.haltOnError !== undefined) data.halt_on_error = ctx.input.haltOnError;
    if (ctx.input.allServers !== undefined) data.all_servers = ctx.input.allServers;
    if (ctx.input.serverIdentifiers !== undefined)
      data.server_identifiers = ctx.input.serverIdentifiers;

    let c = await client.createCommand(ctx.input.projectPermalink, data);

    return {
      output: {
        commandIdentifier: c.identifier,
        description: c.description,
        command: c.command,
        callback: c.cback,
        timing: c.timing,
        haltOnError: c.halt_on_error,
        position: c.position,
        servers: (c.servers || []).map((s: any) => ({
          serverIdentifier: s.identifier,
          name: s.name
        }))
      },
      message: `Created SSH command \`${c.description}\` to run **${c.cback}**.`
    };
  })
  .build();

export let deleteSshCommand = SlateTool.create(spec, {
  name: 'Delete SSH Command',
  key: 'delete_ssh_command',
  description: `Remove an SSH command from a DeployHQ project. The command will no longer execute during deployments.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      projectPermalink: z.string().describe('The permalink (slug) of the project'),
      commandIdentifier: z.string().describe('The SSH command identifier to delete')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Deletion status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      email: ctx.auth.email,
      accountName: ctx.config.accountName
    });

    await client.deleteCommand(ctx.input.projectPermalink, ctx.input.commandIdentifier);

    return {
      output: { status: 'deleted' },
      message: `Deleted SSH command \`${ctx.input.commandIdentifier}\`.`
    };
  })
  .build();
