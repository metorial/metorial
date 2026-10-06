import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { agentSettingsSchema, mapAgentSettings } from '../lib/schemas';
import { spec } from '../spec';

export let updateAgent = SlateTool.create(spec, {
  name: 'Update Agent',
  key: 'update_agent',
  description: `Update an existing AI voice agent's configuration. Only provided fields are updated; omitted fields remain unchanged. Can modify name, phone number, voice, prompt, webhook URL, recording settings, and more.`
})
  .input(
    z.object({
      agentId: z.string().describe('The model ID of the agent to update'),
      name: z.string().optional().describe('New name for the agent'),
      phoneNumber: z.string().optional().describe('Phone number to assign (E.164 format)'),
      description: z.string().optional().describe('Updated description'),
      isRecording: z.boolean().optional().describe('Whether to record calls'),
      externalWebhookUrl: z.string().optional().describe('Post-call webhook URL'),
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
      agent: agentSettingsSchema.optional().describe('Agent voice/LLM configuration updates')
    })
  )
  .output(
    z.object({
      agentId: z.string().describe('Model ID of the updated agent'),
      phone: z.string().optional().describe('Assigned phone number'),
      voice: z.string().optional().describe('Selected voice')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let agent = ctx.input.agent ? mapAgentSettings(ctx.input.agent) : undefined;
    let body = pickDefined({
      name: ctx.input.name,
      phone_number: ctx.input.phoneNumber,
      description: ctx.input.description,
      is_recording: ctx.input.isRecording,
      external_webhook_url: ctx.input.externalWebhookUrl,
      agent: agent && Object.keys(agent).length ? agent : undefined,
      max_duration:
        ctx.input.maxDuration !== undefined || ctx.input.maxDurationEnabled !== undefined
          ? pickDefined({
              duration_seconds: ctx.input.maxDuration,
              is_enabled: ctx.input.maxDurationEnabled
            })
          : undefined
    });
    if (Object.keys(body).length === 0)
      throw createApiServiceError('Provide at least one agent setting to update.');

    let result = await client.updateAgent(ctx.input.agentId, body);
    let response = result.response || {};
    let details = result.details || {};

    return {
      output: {
        agentId: response.model_id ?? ctx.input.agentId,
        phone: details.phone,
        voice: details.voice
      },
      message: `Updated agent \`${ctx.input.agentId}\`.`
    };
  })
  .build();
