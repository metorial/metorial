import { SlateTool } from 'slates';
import { z } from 'zod';
import { CloudAgentsClient } from '../lib/client';
import { spec } from '../spec';

export let listAgents = SlateTool.create(spec, {
  name: 'List Agents',
  key: 'list_agents',
  description: `List cloud agents in your Cursor account. Supports pagination and filtering by pull request URL.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum number of agents to return (default 20, max 100)'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response'),
      prUrl: z.string().optional().describe('Filter agents by pull request URL')
    })
  )
  .output(
    z.object({
      agents: z.array(
        z.object({
          agentId: z.string().describe('Unique identifier of the agent'),
          agentName: z.string().describe('Name of the agent'),
          status: z.string().describe('Current status'),
          repository: z.string().describe('Source repository URL'),
          branchName: z.string().optional().describe('Target branch name'),
          prUrl: z.string().optional().describe('Pull request URL'),
          summary: z.string().optional().describe('Summary of the work done'),
          createdAt: z.string().describe('ISO 8601 timestamp of creation')
        })
      ),
      nextCursor: z.string().optional().describe('Cursor for fetching the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CloudAgentsClient({ token: ctx.auth.token });
    let result = await client.listAgents({
      limit: ctx.input.limit,
      cursor: ctx.input.cursor,
      prUrl: ctx.input.prUrl
    });

    let agents = result.agents.map(a => ({
      agentId: a.id,
      agentName: a.name,
      status: a.status,
      repository: a.source.repository,
      branchName: a.target?.branchName,
      prUrl: a.target?.prUrl,
      summary: a.summary,
      createdAt: a.createdAt
    }));

    return {
      output: {
        agents,
        nextCursor: result.nextCursor
      },
      message: `Found **${agents.length}** agent(s).${result.nextCursor ? ' More results available.' : ''}`
    };
  })
  .build();
