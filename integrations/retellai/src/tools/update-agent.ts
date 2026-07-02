import { SlateTool } from 'slates';
import { z } from 'zod';
import { RetellClient } from '../lib/client';
import { spec } from '../spec';

export let updateAgent = SlateTool.create(spec, {
  name: 'Update Voice Agent',
  key: 'update_agent',
  description: `Update the configuration of an existing voice agent. You can modify voice settings, language, webhooks, behavioral parameters, response engine, and more. Only provided fields will be updated.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      agentId: z.string().describe('Unique ID of the agent to update'),
      version: z
        .number()
        .optional()
        .describe('Specific version to update. Defaults to latest.'),
      agentName: z.string().optional().describe('New name for the agent'),
      voiceId: z.string().optional().describe('New voice ID'),
      responseEngine: z.any().optional().describe('Updated response engine configuration'),
      language: z.string().optional().describe('Language/dialect for speech recognition'),
      webhookUrl: z
        .string()
        .nullable()
        .optional()
        .describe('Webhook URL for call events (null to remove)'),
      voiceSpeed: z.number().optional().describe('Speech rate (0.5-2)'),
      volume: z.number().optional().describe('Agent speech volume (0-2)'),
      responsiveness: z.number().optional().describe('How quickly the agent responds (0-1)'),
      interruptionSensitivity: z
        .number()
        .optional()
        .describe('Sensitivity to user interruptions (0-1)'),
      enableBackchannel: z
        .boolean()
        .optional()
        .describe('Enable conversational interjections'),
      ambientSound: z.string().nullable().optional().describe('Background ambient sound'),
      additionalSettings: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional agent settings to update')
    })
  )
  .output(
    z.object({
      agentId: z.string().describe('Unique identifier of the updated agent'),
      agentName: z.string().nullable().optional().describe('Name of the agent'),
      version: z.number().describe('Version number'),
      isPublished: z.boolean().describe('Whether the agent is published')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RetellClient(ctx.auth.token);

    let body: Record<string, any> = {};

    if (ctx.input.agentName !== undefined) body.agent_name = ctx.input.agentName;
    if (ctx.input.voiceId !== undefined) body.voice_id = ctx.input.voiceId;
    if (ctx.input.responseEngine !== undefined)
      body.response_engine = ctx.input.responseEngine;
    if (ctx.input.language !== undefined) body.language = ctx.input.language;
    if (ctx.input.webhookUrl !== undefined) body.webhook_url = ctx.input.webhookUrl;
    if (ctx.input.voiceSpeed !== undefined) body.voice_speed = ctx.input.voiceSpeed;
    if (ctx.input.volume !== undefined) body.volume = ctx.input.volume;
    if (ctx.input.responsiveness !== undefined) body.responsiveness = ctx.input.responsiveness;
    if (ctx.input.interruptionSensitivity !== undefined)
      body.interruption_sensitivity = ctx.input.interruptionSensitivity;
    if (ctx.input.enableBackchannel !== undefined)
      body.enable_backchannel = ctx.input.enableBackchannel;
    if (ctx.input.ambientSound !== undefined) body.ambient_sound = ctx.input.ambientSound;

    if (ctx.input.additionalSettings) {
      Object.assign(body, ctx.input.additionalSettings);
    }

    let agent = await client.updateAgent(ctx.input.agentId, body, ctx.input.version);

    return {
      output: {
        agentId: agent.agent_id,
        agentName: agent.agent_name ?? null,
        version: agent.version,
        isPublished: agent.is_published
      },
      message: `Updated voice agent **${agent.agent_name || agent.agent_id}** (v${agent.version}).`
    };
  })
  .build();
