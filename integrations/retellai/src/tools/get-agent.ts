import { SlateTool } from 'slates';
import { z } from 'zod';
import { RetellClient } from '../lib/client';
import { spec } from '../spec';

export let getAgent = SlateTool.create(spec, {
  name: 'Get Voice Agent',
  key: 'get_agent',
  description: `Retrieve detailed configuration of a specific voice agent by its ID, including voice settings, response engine, language, webhook configuration, and more. Optionally specify a version to retrieve a specific version of the agent.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      agentId: z.string().describe('Unique ID of the agent to retrieve'),
      version: z
        .number()
        .optional()
        .describe('Specific version of the agent to retrieve. Defaults to the latest version.')
    })
  )
  .output(
    z.object({
      agentId: z.string().describe('Unique identifier of the agent'),
      agentName: z.string().nullable().optional().describe('Name of the agent'),
      version: z.number().describe('Version number'),
      isPublished: z.boolean().describe('Whether the agent is published'),
      voiceId: z.string().optional().describe('Voice ID used by the agent'),
      language: z.string().optional().describe('Language/dialect'),
      webhookUrl: z.string().nullable().optional().describe('Webhook URL for call events'),
      responsiveness: z.number().optional().describe('Responsiveness value (0-1)'),
      interruptionSensitivity: z
        .number()
        .optional()
        .describe('Interruption sensitivity (0-1)'),
      enableBackchannel: z.boolean().optional().describe('Whether backchannel is enabled'),
      voiceSpeed: z.number().optional().describe('Voice speed (0.5-2)'),
      volume: z.number().optional().describe('Volume (0-2)'),
      responseEngine: z.any().optional().describe('Response engine configuration'),
      lastModificationTimestamp: z.number().optional().describe('Last modification timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RetellClient(ctx.auth.token);
    let agent = await client.getAgent(ctx.input.agentId, ctx.input.version);

    return {
      output: {
        agentId: agent.agent_id,
        agentName: agent.agent_name ?? null,
        version: agent.version,
        isPublished: agent.is_published,
        voiceId: agent.voice_id,
        language: agent.language,
        webhookUrl: agent.webhook_url,
        responsiveness: agent.responsiveness,
        interruptionSensitivity: agent.interruption_sensitivity,
        enableBackchannel: agent.enable_backchannel,
        voiceSpeed: agent.voice_speed,
        volume: agent.volume,
        responseEngine: agent.response_engine,
        lastModificationTimestamp: agent.last_modification_timestamp
      },
      message: `Retrieved agent **${agent.agent_name || agent.agent_id}** (v${agent.version}).`
    };
  })
  .build();
