import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let serverInGroupSchema = z.object({
  serverIdentifier: z.string().describe('Server identifier'),
  name: z.string().describe('Server name'),
  protocolType: z.string().describe('Connection protocol'),
  hostname: z.string().optional().describe('Server hostname'),
  serverPath: z.string().optional().describe('Deployment path')
});

let serverGroupSchema = z.object({
  groupIdentifier: z.string().describe('Server group identifier'),
  name: z.string().describe('Server group name'),
  preferredBranch: z.string().optional().describe('Preferred branch for deployment'),
  lastRevision: z.string().nullable().optional().describe('Last deployed revision'),
  servers: z.array(serverInGroupSchema).describe('Servers in this group')
});

export let listServerGroups = SlateTool.create(spec, {
  name: 'List Server Groups',
  key: 'list_server_groups',
  description: `List all server groups for a DeployHQ project, including the servers in each group. Server groups allow coordinated deployments to multiple servers at once.`,
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
      serverGroups: z.array(serverGroupSchema).describe('List of server groups')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      email: ctx.auth.email,
      accountName: ctx.config.accountName
    });

    let groups = await client.listServerGroups(ctx.input.projectPermalink);

    let mapped = (Array.isArray(groups) ? groups : []).map((g: any) => ({
      groupIdentifier: g.identifier,
      name: g.name,
      preferredBranch: g.preferred_branch,
      lastRevision: g.last_revision ?? null,
      servers: (g.servers || []).map((s: any) => ({
        serverIdentifier: s.identifier,
        name: s.name,
        protocolType: s.protocol_type,
        hostname: s.hostname,
        serverPath: s.server_path
      }))
    }));

    return {
      output: { serverGroups: mapped },
      message: `Found **${mapped.length}** server group(s) in project \`${ctx.input.projectPermalink}\`.`
    };
  })
  .build();
