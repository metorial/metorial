import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listAgents = SlateTool.create(spec, {
  name: 'List Agents',
  key: 'list_agents',
  description: `List agents (IT support staff) in Freshservice. Supports filtering by query and pagination. Agents can be full-time or occasional.`,
  instructions: [
    'Use the query parameter to filter agents, e.g. "email:\'agent@example.com\'" or "active:true".'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .optional()
        .describe('Filter query (e.g. "active:true", "email:\'agent@example.com\'")'),
      page: z.number().optional().describe('Page number'),
      perPage: z.number().optional().describe('Results per page (max: 100)')
    })
  )
  .output(
    z.object({
      agents: z.array(
        z.object({
          agentId: z.number().describe('Agent ID'),
          firstName: z.string().describe('First name'),
          lastName: z.string().nullable().describe('Last name'),
          email: z.string().nullable().describe('Email'),
          active: z.boolean().describe('Active status'),
          occasional: z.boolean().describe('Whether the agent is occasional'),
          departmentIds: z.array(z.number()).nullable().describe('Department IDs'),
          createdAt: z.string().describe('Creation timestamp')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain,
      authType: ctx.auth.authType
    });

    let result = await client.listAgents(
      { page: ctx.input.page, perPage: ctx.input.perPage },
      ctx.input.query
    );

    let agents = result.agents.map((a: Record<string, unknown>) => ({
      agentId: a.id as number,
      firstName: a.first_name as string,
      lastName: a.last_name as string | null,
      email: a.email as string | null,
      active: a.active as boolean,
      occasional: a.occasional as boolean,
      departmentIds: a.department_ids as number[] | null,
      createdAt: a.created_at as string
    }));

    return {
      output: { agents },
      message: `Found **${agents.length}** agents`
    };
  })
  .build();

export let getAgent = SlateTool.create(spec, {
  name: 'Get Agent',
  key: 'get_agent',
  description: `Retrieve a single agent by their ID, including their role, group, and contact information.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      agentId: z.number().describe('ID of the agent')
    })
  )
  .output(
    z.object({
      agentId: z.number().describe('Agent ID'),
      firstName: z.string().describe('First name'),
      lastName: z.string().nullable().describe('Last name'),
      email: z.string().nullable().describe('Email'),
      active: z.boolean().describe('Active status'),
      occasional: z.boolean().describe('Occasional agent'),
      jobTitle: z.string().nullable().describe('Job title'),
      phone: z.string().nullable().describe('Phone number'),
      departmentIds: z.array(z.number()).nullable().describe('Department IDs'),
      groupIds: z.array(z.number()).nullable().describe('Group IDs'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain,
      authType: ctx.auth.authType
    });

    let agent = await client.getAgent(ctx.input.agentId);

    return {
      output: {
        agentId: agent.id,
        firstName: agent.first_name,
        lastName: agent.last_name,
        email: agent.email,
        active: agent.active,
        occasional: agent.occasional,
        jobTitle: agent.job_title,
        phone: agent.phone,
        departmentIds: agent.department_ids,
        groupIds: agent.group_ids,
        createdAt: agent.created_at,
        updatedAt: agent.updated_at
      },
      message:
        `Retrieved agent **#${agent.id}**: "${agent.first_name} ${agent.last_name || ''}"`.trim()
    };
  })
  .build();
