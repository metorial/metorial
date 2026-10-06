import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { agentSettingsSchema, mapAgentSettings } from '../lib/schemas';
import { spec } from '../spec';

export let createAgent = SlateTool.create(spec, {
  name: 'Create Agent',
  key: 'create_agent',
  description: `Create a new AI voice agent in Synthflow. Configure the agent type (inbound, outbound, or widget), voice, prompt, language, and other settings. Returns the new agent's model ID.`,
  instructions: [
    'The "type" field must be one of: "inbound", "outbound", or "widget".',
    'Provide agent.prompt to define the conversation. Discover a voice ID with list_voices.'
  ]
})
  .input(
    z.object({
      type: z.enum(['inbound', 'outbound', 'widget']).describe('Agent type'),
      name: z.string().min(1).describe('Name for the agent'),
      agent: agentSettingsSchema.optional().describe('Agent voice/LLM configuration'),
      phoneNumber: z.string().optional().describe('Phone number to assign (E.164 format)'),
      description: z.string().optional().describe('Agent description'),
      externalWebhookUrl: z.string().optional().describe('Post-call webhook URL'),
      isRecording: z.boolean().optional().describe('Whether to record calls'),
      maxDuration: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Maximum call duration in seconds'),
      maxDurationEnabled: z
        .boolean()
        .optional()
        .describe('Enable or disable the call duration limit'),
      redactPii: z
        .boolean()
        .optional()
        .describe('Enable PII redaction for transcripts and logs')
    })
  )
  .output(
    z.object({
      agentId: z.string().describe('Model ID of the newly created agent'),
      phone: z.string().optional().describe('Assigned phone number'),
      voice: z.string().optional().describe('Selected voice')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let agent = mapAgentSettings(ctx.input.agent ?? {});
    if (
      ctx.input.redactPii !== undefined &&
      ctx.input.agent?.redactPii !== undefined &&
      ctx.input.redactPii !== ctx.input.agent.redactPii
    )
      throw createApiServiceError(
        'Use redactPii or agent.redactPii with the same value, not conflicting values.'
      );
    if (ctx.input.redactPii !== undefined) agent.redact_pii = ctx.input.redactPii;
    let body = pickDefined({
      type: ctx.input.type,
      name: ctx.input.name,
      agent,
      phone_number: ctx.input.phoneNumber,
      description: ctx.input.description,
      external_webhook_url: ctx.input.externalWebhookUrl,
      is_recording: ctx.input.isRecording,
      max_duration:
        ctx.input.maxDuration !== undefined || ctx.input.maxDurationEnabled !== undefined
          ? pickDefined({
              duration_seconds: ctx.input.maxDuration,
              is_enabled: ctx.input.maxDurationEnabled ?? true
            })
          : undefined
    });

    let result = await client.createAgent(body);
    let response = result.response || {};
    let details = result.details || {};
    if (!response.model_id)
      throw createApiServiceError('Synthflow did not return the created agent ID.');

    return {
      output: {
        agentId: response.model_id,
        phone: details.phone,
        voice: details.voice
      },
      message: `Created agent **${ctx.input.name}** (${ctx.input.type}) with ID \`${response.model_id}\`.`
    };
  })
  .build();
