import { SlateTool } from 'slates';
import { z } from 'zod';
import { CustomGPTClient } from '../lib/client';
import { spec } from '../spec';

export let listAgents = SlateTool.create(spec, {
  name: 'List Agents',
  key: 'list_agents',
  description: `List all AI agents (projects) in your CustomGPT account. Supports pagination, sorting, and filtering by name.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number to retrieve (default: 1)'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      orderBy: z.enum(['id', 'created_at']).optional().describe('Field to sort by'),
      name: z.string().optional().describe('Filter agents by name')
    })
  )
  .output(
    z.object({
      agents: z
        .array(
          z.object({
            projectId: z.number().describe('Agent ID'),
            projectName: z.string().describe('Agent name'),
            sitemapPath: z.string().nullable().describe('Sitemap URL used as data source'),
            isChatActive: z.boolean().describe('Whether the agent chat is active'),
            type: z.string().describe('Agent type (SITEMAP or URL)'),
            isShared: z.boolean().describe('Whether the agent is publicly shared'),
            createdAt: z.string().describe('Creation timestamp'),
            updatedAt: z.string().describe('Last update timestamp')
          })
        )
        .describe('List of agents'),
      currentPage: z.number().describe('Current page number'),
      totalPages: z.number().describe('Total number of pages'),
      totalAgents: z.number().describe('Total number of agents')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CustomGPTClient({ token: ctx.auth.token });

    let result = await client.listAgents({
      page: ctx.input.page,
      order: ctx.input.order,
      orderBy: ctx.input.orderBy,
      name: ctx.input.name
    });

    return {
      output: {
        agents: result.items.map(a => ({
          projectId: a.projectId,
          projectName: a.projectName,
          sitemapPath: a.sitemapPath,
          isChatActive: a.isChatActive,
          type: a.type,
          isShared: a.isShared,
          createdAt: a.createdAt,
          updatedAt: a.updatedAt
        })),
        currentPage: result.currentPage,
        totalPages: result.lastPage,
        totalAgents: result.total
      },
      message: `Found **${result.total}** agent(s). Showing page **${result.currentPage}** of **${result.lastPage}**.`
    };
  })
  .build();
