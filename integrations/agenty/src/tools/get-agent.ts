import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAgent = SlateTool.create(spec, {
  name: 'Get Agent',
  key: 'get_agent',
  description: `Retrieve the full configuration and details of a specific scraping, crawling, or monitoring agent by its ID. Returns the agent's fields, selectors, browser settings, and other configuration.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      agentId: z.string().describe('The unique identifier of the agent to retrieve.')
    })
  )
  .output(
    z.object({
      agentId: z.string().describe('Unique agent identifier.'),
      accountId: z.string().optional().nullable().describe('Account ID.'),
      name: z.string().describe('Agent name.'),
      type: z.string().describe('Agent type: scraping, crawling, or monitoring.'),
      description: z.string().optional().nullable().describe('Agent description.'),
      tags: z.array(z.string()).optional().nullable().describe('Tags assigned to the agent.'),
      version: z.number().optional().nullable().describe('Agent version number.'),
      createdAt: z.string().optional().nullable().describe('ISO 8601 creation timestamp.'),
      updatedAt: z.string().optional().nullable().describe('ISO 8601 last update timestamp.'),
      projectId: z.string().optional().nullable().describe('Associated project ID.'),
      config: z
        .any()
        .optional()
        .nullable()
        .describe(
          'Full agent configuration including collections, fields, selectors, browser settings, pagination, and login options.'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let a = await client.getAgent(ctx.input.agentId);

    return {
      output: {
        agentId: a.agent_id,
        accountId: a.account_id,
        name: a.name,
        type: a.type,
        description: a.description,
        tags: a.tags,
        version: a.version,
        createdAt: a.created_at,
        updatedAt: a.updated_at,
        projectId: a.project_id,
        config: a.config
      },
      message: `Retrieved agent **${a.name}** (${a.type}, ID: ${a.agent_id}).`
    };
  })
  .build();
