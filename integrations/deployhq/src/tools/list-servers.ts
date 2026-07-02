import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let serverSchema = z.object({
  serverIdentifier: z.string().describe('Unique server identifier (UUID)'),
  name: z.string().describe('Server display name'),
  protocolType: z.string().describe('Connection protocol (e.g., ssh, ftp, s3)'),
  serverPath: z.string().optional().describe('Deployment target path on server'),
  hostname: z.string().optional().describe('Server hostname'),
  port: z.string().optional().describe('Connection port'),
  username: z.string().optional().describe('Connection username'),
  preferredBranch: z.string().optional().describe('Branch to deploy from'),
  lastRevision: z.string().nullable().optional().describe('Last deployed revision'),
  autoDeploy: z.boolean().optional().describe('Whether auto-deploy is enabled'),
  autoDeployUrl: z.string().optional().describe('Auto-deploy webhook URL'),
  environment: z.string().optional().describe('Environment label (e.g., Production, Staging)'),
  serverGroupIdentifier: z
    .string()
    .nullable()
    .optional()
    .describe('Server group this server belongs to')
});

export let listServers = SlateTool.create(spec, {
  name: 'List Servers',
  key: 'list_servers',
  description: `List all servers configured for a DeployHQ project. Returns server connection details, protocol type, deployment path, and auto-deploy settings.`,
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
      servers: z.array(serverSchema).describe('List of servers in the project')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      email: ctx.auth.email,
      accountName: ctx.config.accountName
    });

    let servers = await client.listServers(ctx.input.projectPermalink);

    let mapped = servers.map((s: any) => ({
      serverIdentifier: s.identifier,
      name: s.name,
      protocolType: s.protocol_type,
      serverPath: s.server_path,
      hostname: s.hostname,
      port: s.port,
      username: s.username,
      preferredBranch: s.preferred_branch,
      lastRevision: s.last_revision ?? null,
      autoDeploy: s.auto_deploy,
      autoDeployUrl: s.auto_deploy_url,
      environment: s.environment,
      serverGroupIdentifier: s.server_group_identifier ?? null
    }));

    return {
      output: { servers: mapped },
      message: `Found **${mapped.length}** server(s) in project \`${ctx.input.projectPermalink}\`.`
    };
  })
  .build();
