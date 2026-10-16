import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, validateInteger } from '../lib/client';
import { spec } from '../spec';

let projectPermalink = z
  .string()
  .describe('Project permalink or identifier. Call list_projects to discover projects.');
let serverIdentifier = z.string().describe('Server identifier from list_servers.');
let raw = z.record(z.string(), z.unknown()).describe('Complete provider response');

export let getProfile = SlateTool.create(spec, {
  name: 'Get Profile',
  key: 'get_profile',
  description: 'View the authenticated DeployHQ user and account details.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      email: z.string(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      raw
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ ...ctx.auth, accountName: ctx.config.accountName });
    let profile = await client.getProfile();
    return {
      output: {
        email: profile.email_address,
        firstName: profile.first_name,
        lastName: profile.last_name,
        raw: profile
      },
      message: 'Retrieved your DeployHQ profile.'
    };
  })
  .build();

export let listZones = SlateTool.create(spec, {
  name: 'List Deployment Zones',
  key: 'list_zones',
  description:
    'Discover available deployment zones and their identifiers for project creation and updates.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({ zones: z.array(z.object({ identifier: z.string(), description: z.string() })) })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ ...ctx.auth, accountName: ctx.config.accountName });
    let zones = await client.listZones();
    return { output: { zones }, message: `Found ${zones.length} deployment zone(s).` };
  })
  .build();

export let updateProject = SlateTool.create(spec, {
  name: 'Update Project',
  key: 'update_project',
  description:
    'Update project name, deployment zone, and notification preferences. Call list_projects to discover projects.'
})
  .input(
    z.object({
      projectPermalink,
      name: z.string().optional(),
      zoneIdentifier: z.string().optional().describe('Zone identifier from list_zones'),
      emailNotifyOn: z.enum(['never', 'failure', 'always']).optional(),
      notificationEmail: z.string().optional(),
      notifyCommitter: z.boolean().optional()
    })
  )
  .output(z.object({ name: z.string(), permalink: z.string(), raw }))
  .handleInvocation(async ctx => {
    let client = new Client({ ...ctx.auth, accountName: ctx.config.accountName });
    let data = pickDefined({
      name: ctx.input.name,
      zone_id: ctx.input.zoneIdentifier,
      email_notify_on: ctx.input.emailNotifyOn,
      notification_email: ctx.input.notificationEmail,
      notify_committer: ctx.input.notifyCommitter
    });
    if (!Object.keys(data).length)
      throw createApiServiceError('Provide at least one project setting to update.');
    let project = await client.updateProject(ctx.input.projectPermalink, data);
    return {
      output: { name: project.name, permalink: project.permalink, raw: project },
      message: `Updated project ${project.name}.`
    };
  })
  .build();

export let getServer = SlateTool.create(spec, {
  name: 'Get Server',
  key: 'get_server',
  description:
    'View a deployment server and its current settings. Discover identifiers with list_projects and list_servers.',
  tags: { readOnly: true }
})
  .input(z.object({ projectPermalink, serverIdentifier }))
  .output(
    z.object({ serverIdentifier: z.string(), name: z.string(), protocolType: z.string(), raw })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ ...ctx.auth, accountName: ctx.config.accountName });
    let server = await client.getServer(
      ctx.input.projectPermalink,
      ctx.input.serverIdentifier
    );
    return {
      output: {
        serverIdentifier: server.identifier,
        name: server.name,
        protocolType: server.protocol_type,
        raw: server
      },
      message: `Retrieved server ${server.name}.`
    };
  })
  .build();

export let updateServer = SlateTool.create(spec, {
  name: 'Update Server',
  key: 'update_server',
  description:
    'Update a deployment target, connection settings, branch, or automatic deployment preferences. Discover identifiers with list_projects and list_servers.'
})
  .input(
    z.object({
      projectPermalink,
      serverIdentifier,
      name: z.string().optional(),
      serverPath: z.string().optional(),
      branch: z.string().optional(),
      hostname: z.string().optional(),
      port: z.number().optional(),
      username: z.string().optional(),
      password: z.string().optional(),
      useSshKeys: z.boolean().optional(),
      autoDeploy: z.boolean().optional(),
      enabled: z.boolean().optional(),
      environment: z.string().optional(),
      serverGroupIdentifier: z
        .string()
        .optional()
        .describe('Group identifier from list_server_groups'),
      rootPath: z.string().optional(),
      emailNotifyOn: z.enum(['never', 'failure', 'always']).optional()
    })
  )
  .output(
    z.object({ serverIdentifier: z.string(), name: z.string(), protocolType: z.string(), raw })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ ...ctx.auth, accountName: ctx.config.accountName });
    validateInteger(ctx.input.port, 'port', 1, 65535);
    let data = pickDefined({
      name: ctx.input.name,
      server_path: ctx.input.serverPath,
      branch: ctx.input.branch,
      hostname: ctx.input.hostname,
      port: ctx.input.port,
      username: ctx.input.username,
      password: ctx.input.password,
      use_ssh_keys: ctx.input.useSshKeys,
      auto_deploy: ctx.input.autoDeploy,
      enabled: ctx.input.enabled,
      environment: ctx.input.environment,
      server_group_identifier: ctx.input.serverGroupIdentifier,
      root_path: ctx.input.rootPath,
      email_notify_on: ctx.input.emailNotifyOn
    });
    if (!Object.keys(data).length)
      throw createApiServiceError('Provide at least one server setting to update.');
    let server = await client.updateServer(
      ctx.input.projectPermalink,
      ctx.input.serverIdentifier,
      data
    );
    return {
      output: {
        serverIdentifier: server.identifier,
        name: server.name,
        protocolType: server.protocol_type,
        raw: server
      },
      message: `Updated server ${server.name}.`
    };
  })
  .build();

export let manageDeployment = SlateTool.create(spec, {
  name: 'Manage Deployment',
  key: 'manage_deployment',
  description:
    'Retry a completed deployment, roll back to a previous deployment, or abort a running deployment. Call list_projects and list_deployments to discover identifiers.',
  tags: { destructive: true }
})
  .input(
    z.object({
      projectPermalink,
      deploymentIdentifier: z.string().describe('Deployment identifier from list_deployments'),
      action: z.enum(['retry', 'rollback', 'abort'])
    })
  )
  .output(
    z.object({
      deploymentIdentifier: z.string().optional(),
      status: z.string().optional(),
      raw
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ ...ctx.auth, accountName: ctx.config.accountName });
    let result = await client.manageDeployment(
      ctx.input.projectPermalink,
      ctx.input.deploymentIdentifier,
      ctx.input.action
    );
    return {
      output: { deploymentIdentifier: result.identifier, status: result.status, raw: result },
      message: `DeployHQ accepted the ${ctx.input.action} request.`
    };
  })
  .build();

export let cancelScheduledDeployment = SlateTool.create(spec, {
  name: 'Cancel Scheduled Deployment',
  key: 'cancel_scheduled_deployment',
  description:
    'Cancel a forthcoming deployment schedule. Call list_projects and list_scheduled_deployments to discover identifiers.',
  tags: { destructive: true }
})
  .input(
    z.object({
      projectPermalink,
      scheduledDeploymentIdentifier: z
        .string()
        .describe('Identifier from list_scheduled_deployments')
    })
  )
  .output(z.object({ status: z.string() }))
  .handleInvocation(async ctx => {
    let client = new Client({ ...ctx.auth, accountName: ctx.config.accountName });
    let result = await client.deleteScheduledDeployment(
      ctx.input.projectPermalink,
      ctx.input.scheduledDeploymentIdentifier
    );
    return {
      output: { status: result.status },
      message: 'Cancelled the scheduled deployment.'
    };
  })
  .build();

export let updateSshCommand = SlateTool.create(spec, {
  name: 'Update SSH Command',
  key: 'update_ssh_command',
  description:
    'Update an SSH command, execution stage, timeout, or enabled state. Discover identifiers with list_projects and list_ssh_commands.'
})
  .input(
    z.object({
      projectPermalink,
      commandIdentifier: z.string().describe('Identifier from list_ssh_commands'),
      description: z.string().optional(),
      command: z.string().optional(),
      callback: z.enum(['before_changes', 'before_symlink', 'after_changes']).optional(),
      timing: z.enum(['all', 'first', 'after_first']).optional(),
      timeout: z
        .number()
        .optional()
        .describe('Timeout in seconds: 300, 600, 1800, 3600, 5400, or 10800'),
      haltOnError: z.boolean().optional(),
      enabled: z.boolean().optional(),
      position: z.number().optional()
    })
  )
  .output(z.object({ commandIdentifier: z.string(), raw }))
  .handleInvocation(async ctx => {
    let client = new Client({ ...ctx.auth, accountName: ctx.config.accountName });
    if (
      ctx.input.timeout !== undefined &&
      ![300, 600, 1800, 3600, 5400, 10800].includes(ctx.input.timeout)
    )
      throw createApiServiceError(
        'timeout must be 300, 600, 1800, 3600, 5400, or 10800 seconds.'
      );
    validateInteger(ctx.input.position, 'position', 0);
    let data = pickDefined({
      description: ctx.input.description,
      command: ctx.input.command,
      cback: ctx.input.callback,
      timing: ctx.input.timing,
      timeout: ctx.input.timeout,
      halt_on_error: ctx.input.haltOnError,
      enabled: ctx.input.enabled,
      position: ctx.input.position
    });
    if (!Object.keys(data).length)
      throw createApiServiceError('Provide at least one command setting to update.');
    let command = await client.updateCommand(
      ctx.input.projectPermalink,
      ctx.input.commandIdentifier,
      data
    );
    return {
      output: { commandIdentifier: command.identifier, raw: command },
      message: 'Updated the SSH command.'
    };
  })
  .build();
