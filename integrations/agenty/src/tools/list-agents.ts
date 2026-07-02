import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listAgents = SlateTool.create(spec, {
  name: 'List Agents',
  key: 'list_agents',
  description: `Retrieve a list of scraping, crawling, and monitoring agents in your Agenty account. Supports pagination, sorting, and search filtering to find specific agents.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      offset: z
        .number()
        .optional()
        .describe('Number of agents to skip for pagination. Defaults to 0.'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of agents to return. Defaults to 100, max 1000.'),
      sort: z.string().optional().describe('Field to sort by, e.g. "created_at" or "name".'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort order.'),
      search: z.string().optional().describe('Search term to filter agents by name.')
    })
  )
  .output(
    z.object({
      total: z.number().describe('Total number of agents matching the query.'),
      returned: z.number().describe('Number of agents returned in this response.'),
      agents: z
        .array(
          z.object({
            agentId: z.string().describe('Unique agent identifier.'),
            name: z.string().describe('Agent name.'),
            type: z.string().describe('Agent type: scraping, crawling, or monitoring.'),
            description: z.string().optional().nullable().describe('Agent description.'),
            tags: z
              .array(z.string())
              .optional()
              .nullable()
              .describe('Tags assigned to the agent.'),
            version: z.number().optional().nullable().describe('Agent version number.'),
            createdAt: z
              .string()
              .optional()
              .nullable()
              .describe('ISO 8601 creation timestamp.'),
            updatedAt: z
              .string()
              .optional()
              .nullable()
              .describe('ISO 8601 last update timestamp.'),
            isPublic: z
              .boolean()
              .optional()
              .nullable()
              .describe('Whether the agent is publicly accessible.'),
            projectId: z.string().optional().nullable().describe('Associated project ID.')
          })
        )
        .describe('List of agents.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listAgents({
      offset: ctx.input.offset,
      limit: ctx.input.limit,
      sort: ctx.input.sort,
      order: ctx.input.order,
      search: ctx.input.search
    });

    let agents = (result.result || []).map((a: any) => ({
      agentId: a.agent_id,
      name: a.name,
      type: a.type,
      description: a.description,
      tags: a.tags,
      version: a.version,
      createdAt: a.created_at,
      updatedAt: a.updated_at,
      isPublic: a.is_public,
      projectId: a.project_id
    }));

    return {
      output: {
        total: result.total || 0,
        returned: result.returned || agents.length,
        agents
      },
      message: `Found **${result.total || 0}** agents, returned **${agents.length}** in this page.`
    };
  })
  .build();
