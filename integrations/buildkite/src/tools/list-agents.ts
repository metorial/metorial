import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let agentSchema = z.object({
  agentId: z.string().describe('UUID of the agent'),
  name: z.string().describe('Name of the agent'),
  hostname: z.string().describe('Hostname of the machine running the agent'),
  version: z.string().describe('Agent version'),
  ipAddress: z.string().nullable().describe('IP address of the agent'),
  userAgent: z.string().describe('User agent string'),
  connectionState: z.string().describe('Connection state (connected, disconnected, etc.)'),
  tags: z.array(z.string()).describe('Tags/metadata assigned to the agent'),
  createdAt: z.string().describe('When the agent connected'),
  jobId: z.string().nullable().describe('UUID of the currently running job, if any')
});

export let listAgents = SlateTool.create(spec, {
  name: 'List Agents',
  key: 'list_agents',
  description: `List connected Buildkite agents in your organization. Returns agent names, versions, connection states, metadata tags, and whether they are currently running a job. Only connected agents are returned.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      name: z.string().optional().describe('Filter agents by name'),
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      perPage: z.number().optional().describe('Number of results per page (max 100)')
    })
  )
  .output(
    z.object({
      agents: z.array(agentSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationSlug: ctx.config.organizationSlug
    });

    let agents = await client.listAgents({
      name: ctx.input.name,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let mapped = agents.map((a: any) => ({
      agentId: a.id,
      name: a.name,
      hostname: a.hostname,
      version: a.version,
      ipAddress: a.ip_address ?? null,
      userAgent: a.user_agent,
      connectionState: a.connection_state,
      tags: a.meta_data ?? [],
      createdAt: a.created_at,
      jobId: a.job?.id ?? null
    }));

    return {
      output: { agents: mapped },
      message: `Found **${mapped.length}** connected agent(s).`
    };
  });
