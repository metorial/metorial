import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let makeCall = SlateTool.create(spec, {
  name: 'Make Call',
  key: 'make_call',
  description: `Initiate an outbound phone call from a Bolna Voice AI agent to a recipient. Supports scheduling, dynamic context variables, custom caller ID, and retry configuration.`,
  instructions: [
    'Phone numbers must be in E.164 format (e.g., +14155551234).',
    'Use userData to pass dynamic variables referenced in the agent prompt with {variable} syntax.',
    'Scheduled calls require ISO 8601 datetime with timezone (e.g., 2024-06-05T16:35:00.000+05:30).'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      agentId: z.string().describe('ID of the agent to make the call'),
      recipientPhoneNumber: z.string().describe('Recipient phone number in E.164 format'),
      fromPhoneNumber: z
        .string()
        .optional()
        .describe('Caller phone number in E.164 format. If omitted, uses Bolna default.'),
      scheduledAt: z
        .string()
        .optional()
        .describe('ISO 8601 datetime with timezone to schedule the call'),
      userData: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Dynamic context variables for personalizing the conversation (e.g., { "customerName": "John", "plan": "Premium" })'
        ),
      retryConfig: z
        .object({
          enabled: z.boolean().optional().describe('Enable auto-retry'),
          maxRetries: z.number().optional().describe('Maximum retry attempts (1-3)'),
          retryOnStatuses: z
            .array(z.enum(['no-answer', 'busy', 'failed', 'error']))
            .optional()
            .describe('Statuses that trigger a retry'),
          retryOnVoicemail: z
            .boolean()
            .optional()
            .describe('Retry when voicemail is detected'),
          retryIntervalsMinutes: z
            .array(z.number())
            .optional()
            .describe('Delay between retries in minutes')
        })
        .optional()
        .describe('Retry configuration for unanswered calls'),
      bypassCallGuardrails: z
        .boolean()
        .optional()
        .describe('Bypass time-based calling restrictions')
    })
  )
  .output(
    z.object({
      executionId: z.string().describe('ID of the call execution'),
      status: z.string().describe('Initial call status'),
      message: z.string().optional().describe('Response message from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let input = ctx.input;

    let retryConfig: Record<string, any> | undefined;
    if (input.retryConfig) {
      retryConfig = {
        ...(input.retryConfig.enabled !== undefined && { enabled: input.retryConfig.enabled }),
        ...(input.retryConfig.maxRetries && { max_retries: input.retryConfig.maxRetries }),
        ...(input.retryConfig.retryOnStatuses && {
          retry_on_statuses: input.retryConfig.retryOnStatuses
        }),
        ...(input.retryConfig.retryOnVoicemail !== undefined && {
          retry_on_voicemail: input.retryConfig.retryOnVoicemail
        }),
        ...(input.retryConfig.retryIntervalsMinutes && {
          retry_intervals_minutes: input.retryConfig.retryIntervalsMinutes
        })
      };
    }

    let result = await client.makeCall({
      agentId: input.agentId,
      recipientPhoneNumber: input.recipientPhoneNumber,
      fromPhoneNumber: input.fromPhoneNumber,
      scheduledAt: input.scheduledAt,
      userData: input.userData,
      retryConfig,
      bypassCallGuardrails: input.bypassCallGuardrails
    });

    return {
      output: {
        executionId: result.execution_id,
        status: result.status || 'queued',
        message: result.message
      },
      message: `Call initiated to **${input.recipientPhoneNumber}**. Execution ID: \`${result.execution_id}\`. Status: ${result.status || 'queued'}.`
    };
  })
  .build();
