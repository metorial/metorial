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
      welcomeMessage: z.string().optional().describe('Welcome message spoken on connection'),
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
        agentId: agent.id ?? undefined,
        agentName: agent.agent_name,
        welcomeMessage: agent.agent_welcome_message ?? undefined,
        agentStatus: agent.agent_status ?? undefined,
        agentType: agent.agent_type ?? undefined,
        createdAt: agent.created_at ?? undefined,
        updatedAt: agent.updated_at ?? undefined,
        tasks: agent.tasks,
        agentPrompts: agent.agent_prompts,
        webhookUrl: agent.webhook_url ?? undefined
      },
      message: `Retrieved agent **${agent.agent_name}** (ID: \`${agent.id}\`). Status: ${agent.agent_status || 'unknown'}.`
    };
  })
  .build();
