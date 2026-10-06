import { SlateTool } from 'slates';
import { z } from 'zod';
import { RetellClient } from '../lib/client';
import { spec } from '../spec';

let agentSchema = z.object({
  agentId: z.string().describe('Unique identifier of the agent'),
  agentName: z.string().nullable().optional().describe('Name of the agent'),
  channel: z.string().optional().describe('Agent channel'),
  tags: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Environment tags and their versions'),
  version: z.number().optional().describe('Version number of the agent'),
  isPublished: z.boolean().optional().describe('Whether the agent is published'),
  voiceId: z.string().optional().describe('Voice ID used by the agent'),
  language: z.string().optional().describe('Language/dialect for the agent'),
  lastModificationTimestamp: z
    .number()
    .optional()
    .describe('Last modification timestamp in milliseconds since epoch')
});

export let listAgents = SlateTool.create(spec, {
  name: 'List Voice Agents',
  key: 'list_agents',
  description: `List voice agents in your Retell AI account. Returns unique voice agent IDs, names, and environment tags. Use get_agent for version configuration. Supports pagination for large collections.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Case-insensitive agent name or ID search'),
      sortOrder: z
        .enum(['ascending', 'descending'])
        .optional()
        .describe('Sort by modification time'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(1000)
        .optional()
        .describe('Maximum number of agents to return (1-1000, default 50)'),
      paginationKey: z
        .string()
        .optional()
        .describe('Opaque paginationKey returned by the previous list_agents call')
    })
  )
  .output(
    z.object({
      agents: z.array(agentSchema).describe('List of voice agents'),
      hasMore: z.boolean().describe('Whether more agents are available'),
      paginationKey: z.string().optional().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RetellClient(ctx.auth.token);
    let page = await client.listAgents({
      query: ctx.input.query,
      sortOrder: ctx.input.sortOrder,
      limit: ctx.input.limit,
      paginationKey: ctx.input.paginationKey
    });

    let mapped = page.items.map(a => ({
      agentId: a.agent_id,
      channel: a.channel,
      tags: a.tags,
      agentName: a.agent_name ?? null,
      version: a.version,
      isPublished: a.is_published,
      voiceId: a.voice_id,
      language: a.language,
      lastModificationTimestamp: a.user_modified_timestamp
    }));

    return {
      output: { agents: mapped, hasMore: page.has_more, paginationKey: page.pagination_key },
      message: `Found **${mapped.length}** voice agent(s).`
    };
  })
  .build();
