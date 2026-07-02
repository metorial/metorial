import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
      maxDuration: z.number().optional().describe('Maximum call duration in seconds'),
      agent: z
        .object({
          prompt: z.string().optional().describe('Updated system prompt'),
          greeting: z.string().optional().describe('Updated greeting message'),
          voice: z.string().optional().describe('Voice ID to use'),
          language: z.string().optional().describe('Language code'),
          llm: z.string().optional().describe('LLM model')
        })
        .optional()
        .describe('Agent voice/LLM configuration updates')
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
    let client = new Client({ token: ctx.auth.token });
    let body: Record<string, any> = {};
    if (ctx.input.name) body.name = ctx.input.name;
    if (ctx.input.phoneNumber) body.phone_number = ctx.input.phoneNumber;
    if (ctx.input.description) body.description = ctx.input.description;
    if (ctx.input.isRecording !== undefined) body.is_recording = ctx.input.isRecording;
    if (ctx.input.externalWebhookUrl) body.external_webhook_url = ctx.input.externalWebhookUrl;
    if (ctx.input.maxDuration !== undefined) body.max_duration = ctx.input.maxDuration;
    if (ctx.input.agent) body.agent = ctx.input.agent;

    let result = await client.updateAgent(ctx.input.agentId, body);
    let response = result.response || {};
    let details = result.details || {};

    return {
      output: {
        agentId: response.model_id,
        phone: details.phone,
        voice: details.voice
      },
      message: `Updated agent \`${ctx.input.agentId}\`.`
    };
  })
  .build();
