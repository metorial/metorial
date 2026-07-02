import { SlateTool } from 'slates';
import { z } from 'zod';
import { RetellClient } from '../lib/client';
import { spec } from '../spec';

let agentSchema = z.object({
  agentId: z.string().describe('Unique identifier of the agent'),
  agentName: z.string().nullable().optional().describe('Name of the agent'),
  version: z.number().describe('Version number of the agent'),
  isPublished: z.boolean().describe('Whether the agent is published'),
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
  description: `List voice agents in your Retell AI account. Returns agent configurations including voice, language, and publication status. Supports pagination for large collections.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .min(1)
        .max(1000)
        .optional()
        .describe('Maximum number of agents to return (1-1000, default 1000)'),
      paginationKey: z
        .string()
        .optional()
        .describe('Pagination key (agent ID) to continue fetching the next page')
    })
  )
  .output(
    z.object({
      agents: z.array(agentSchema).describe('List of voice agents')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RetellClient(ctx.auth.token);
    let agents = await client.listAgents({
      limit: ctx.input.limit,
      paginationKey: ctx.input.paginationKey
    });

    let mapped = (agents as any[]).map((a: any) => ({
      agentId: a.agent_id,
      agentName: a.agent_name ?? null,
      version: a.version,
      isPublished: a.is_published,
      voiceId: a.voice_id,
      language: a.language,
      lastModificationTimestamp: a.last_modification_timestamp
    }));

    return {
      output: { agents: mapped },
      message: `Found **${mapped.length}** voice agent(s).`
    };
  })
  .build();
