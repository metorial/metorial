import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let makeCall = SlateTool.create(spec, {
  name: 'Make Call',
  key: 'make_call',
  description: `Initiate an outbound phone call through a Synthflow AI agent. Specify the agent, recipient phone number, and recipient name. Supports custom variables for dynamic prompt injection, custom greetings, and webhook URLs for post-call notifications.`,
  instructions: [
    'The phone number must be in E.164 format (e.g., +14155552671).',
    'Custom variables are injected into the agent prompt at runtime.'
  ]
})
  .input(
    z.object({
      agentId: z.string().describe('The model ID of the agent to use for the call'),
      phone: z.string().describe('Recipient phone number in E.164 format'),
      name: z.string().describe('Recipient name'),
      customVariables: z
        .array(
          z.object({
            key: z.string(),
            value: z.string()
          })
        )
        .optional()
        .describe('Key-value pairs for dynamic prompt injection'),
      prompt: z.string().optional().describe('Custom instructions for this specific call'),
      greeting: z.string().optional().describe('Custom opening message'),
      leadEmail: z.string().optional().describe('Lead email for appointment booking'),
      leadTimezone: z.string().optional().describe('Lead timezone for scheduling'),
      externalWebhookUrl: z.string().optional().describe('Webhook URL for post-call data')
    })
  )
  .output(
    z.object({
      callId: z.string().describe('Unique identifier for the initiated call'),
      eta: z.number().optional().describe('Estimated seconds to initialize the call'),
      answer: z.string().optional().describe('Status message from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let body: Record<string, any> = {
      model_id: ctx.input.agentId,
      phone: ctx.input.phone,
      name: ctx.input.name
    };
    if (ctx.input.customVariables) body.custom_variables = ctx.input.customVariables;
    if (ctx.input.prompt) body.prompt = ctx.input.prompt;
    if (ctx.input.greeting) body.greeting = ctx.input.greeting;
    if (ctx.input.leadEmail) body.lead_email = ctx.input.leadEmail;
    if (ctx.input.leadTimezone) body.lead_timezone = ctx.input.leadTimezone;
    if (ctx.input.externalWebhookUrl) body.external_webhook_url = ctx.input.externalWebhookUrl;

    let result = await client.makeCall(body);
    let response = result.response || {};

    return {
      output: {
        callId: response.call_id,
        eta: result.eta,
        answer: response.answer
      },
      message: `Call initiated to **${ctx.input.name}** (${ctx.input.phone}). Call ID: \`${response.call_id}\`. ETA: ${result.eta || 'unknown'}s.`
    };
  })
  .build();
