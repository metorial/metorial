import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createAgent = SlateTool.create(spec, {
  name: 'Create Agent',
  key: 'create_agent',
  description: `Create a new AI voice agent in Synthflow. Configure the agent type (inbound, outbound, or widget), voice, prompt, language, and other settings. Returns the new agent's model ID.`,
  instructions: [
    'The "type" field must be one of: "inbound", "outbound", or "widget".',
    'The "agent" object contains voice/LLM configuration. At minimum, provide a prompt.'
  ]
})
  .input(
    z.object({
      type: z.enum(['inbound', 'outbound', 'widget']).describe('Agent type'),
      name: z.string().describe('Name for the agent'),
      agent: z
        .object({
          prompt: z.string().optional().describe('System prompt / instructions for the agent'),
          greeting: z.string().optional().describe('Opening message the agent says'),
          voice: z.string().optional().describe('Voice ID to use'),
          language: z.string().optional().describe('Language code (e.g. "en")'),
          llm: z.string().optional().describe('LLM model to use')
        })
        .optional()
        .describe('Agent voice/LLM configuration'),
      phoneNumber: z.string().optional().describe('Phone number to assign (E.164 format)'),
      description: z.string().optional().describe('Agent description'),
      externalWebhookUrl: z.string().optional().describe('Post-call webhook URL'),
      isRecording: z.boolean().optional().describe('Whether to record calls'),
      maxDuration: z.number().optional().describe('Maximum call duration in seconds'),
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
    let client = new Client({ token: ctx.auth.token });
    let body: Record<string, any> = {
      type: ctx.input.type,
      name: ctx.input.name
    };
    if (ctx.input.agent) body.agent = ctx.input.agent;
    if (ctx.input.phoneNumber) body.phone_number = ctx.input.phoneNumber;
    if (ctx.input.description) body.description = ctx.input.description;
    if (ctx.input.externalWebhookUrl) body.external_webhook_url = ctx.input.externalWebhookUrl;
    if (ctx.input.isRecording !== undefined) body.is_recording = ctx.input.isRecording;
    if (ctx.input.maxDuration !== undefined) body.max_duration = ctx.input.maxDuration;
    if (ctx.input.redactPii !== undefined) body.redact_pii = ctx.input.redactPii;

    let result = await client.createAgent(body);
    let response = result.response || {};
    let details = result.details || {};

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
