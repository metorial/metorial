import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAgent = SlateTool.create(spec, {
  name: 'Get Agent',
  key: 'get_agent',
  description: `Retrieve the full configuration and details of a Bolna Voice AI agent, including its LLM, TTS, ASR settings, prompts, and status.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      agentId: z.string().describe('ID of the agent to retrieve')
    })
  )
  .output(
    z.object({
      agentId: z.string().describe('Agent ID'),
      agentName: z.string().describe('Agent name'),
      agentStatus: z.string().optional().describe('Agent processing status'),
      agentType: z.string().optional().describe('Agent type classification'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp'),
      tasks: z.any().optional().describe('Agent task configurations'),
      agentPrompts: z.any().optional().describe('Agent system prompts'),
      webhookUrl: z.string().optional().describe('Configured webhook URL')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let agent = await client.getAgent(ctx.input.agentId);

    return {
      output: {
        agentId: agent.id,
        agentName: agent.agent_name,
        agentStatus: agent.agent_status,
        agentType: agent.agent_type,
        createdAt: agent.created_at,
        updatedAt: agent.updated_at,
        tasks: agent.tasks,
        agentPrompts: agent.agent_prompts,
        webhookUrl: agent.webhook_url
      },
      message: `Retrieved agent **${agent.agent_name}** (ID: \`${agent.id}\`). Status: ${agent.agent_status || 'unknown'}.`
    };
  })
  .build();
