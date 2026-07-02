import { SlateTool } from 'slates';
import { z } from 'zod';
import { RetellClient } from '../lib/client';
import { spec } from '../spec';

export let createAgent = SlateTool.create(spec, {
  name: 'Create Voice Agent',
  key: 'create_agent',
  description: `Create a new voice agent with a specified voice and response engine configuration. Agents can be configured with various voice settings, language, webhooks, and behavioral parameters.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      agentName: z.string().optional().describe('Name of the agent for reference'),
      voiceId: z.string().describe('Unique voice ID to use for the agent'),
      responseEngine: z
        .any()
        .describe(
          'Response engine configuration object. Can be retell-llm, custom-llm, or conversation-flow type.'
        ),
      language: z
        .string()
        .optional()
        .describe('Language/dialect for speech recognition (e.g. en-US, fr-FR, zh-CN)'),
      webhookUrl: z.string().optional().describe('Webhook URL for receiving call events'),
      voiceSpeed: z.number().optional().describe('Speech rate (0.5-2, default 1)'),
      volume: z.number().optional().describe('Agent speech volume (0-2, default 1)'),
      responsiveness: z.number().optional().describe('How quickly the agent responds (0-1)'),
      interruptionSensitivity: z
        .number()
        .optional()
        .describe('Sensitivity to user interruptions (0-1)'),
      enableBackchannel: z
        .boolean()
        .optional()
        .describe('Enable conversational interjections like "uh-huh"'),
      ambientSound: z
        .string()
        .optional()
        .describe(
          'Background ambient sound (coffee-shop, convention-hall, summer-outdoor, mountain-outdoor, static-noise, call-center)'
        ),
      additionalSettings: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Additional agent settings to pass through (voice_temperature, pii_config, guardrail_config, etc.)'
        )
    })
  )
  .output(
    z.object({
      agentId: z.string().describe('Unique identifier of the created agent'),
      agentName: z.string().nullable().optional().describe('Name of the agent'),
      version: z.number().describe('Version number'),
      isPublished: z.boolean().describe('Whether the agent is published')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RetellClient(ctx.auth.token);

    let body: Record<string, any> = {
      voice_id: ctx.input.voiceId,
      response_engine: ctx.input.responseEngine
    };

    if (ctx.input.agentName) body.agent_name = ctx.input.agentName;
    if (ctx.input.language) body.language = ctx.input.language;
    if (ctx.input.webhookUrl) body.webhook_url = ctx.input.webhookUrl;
    if (ctx.input.voiceSpeed !== undefined) body.voice_speed = ctx.input.voiceSpeed;
    if (ctx.input.volume !== undefined) body.volume = ctx.input.volume;
    if (ctx.input.responsiveness !== undefined) body.responsiveness = ctx.input.responsiveness;
    if (ctx.input.interruptionSensitivity !== undefined)
      body.interruption_sensitivity = ctx.input.interruptionSensitivity;
    if (ctx.input.enableBackchannel !== undefined)
      body.enable_backchannel = ctx.input.enableBackchannel;
    if (ctx.input.ambientSound) body.ambient_sound = ctx.input.ambientSound;

    if (ctx.input.additionalSettings) {
      Object.assign(body, ctx.input.additionalSettings);
    }

    let agent = await client.createAgent(body);

    return {
      output: {
        agentId: agent.agent_id,
        agentName: agent.agent_name ?? null,
        version: agent.version,
        isPublished: agent.is_published
      },
      message: `Created voice agent **${agent.agent_name || agent.agent_id}** (v${agent.version}).`
    };
  })
  .build();
