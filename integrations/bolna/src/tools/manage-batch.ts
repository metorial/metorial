import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageBatch = SlateTool.create(spec, {
  name: 'Manage Batch',
  key: 'manage_batch',
  description: `Create, schedule, stop, or delete a batch calling campaign. Batches automate outbound calls to large contact lists. Use **action** to specify the operation.`,
  instructions: [
    'To create a batch, provide csvContent with contact_number as the header and phone numbers in E.164 format.',
    'To schedule, provide batchId and scheduledAt in ISO 8601 format.',
    'To stop or delete, provide the batchId only.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'schedule', 'stop', 'delete'])
        .describe('Action to perform on the batch'),
      agentId: z.string().optional().describe('Agent ID (required for "create")'),
      batchId: z
        .string()
        .optional()
        .describe('Batch ID (required for "schedule", "stop", "delete")'),
      csvContent: z
        .string()
        .optional()
        .describe(
          'CSV content with contact_number header and phone numbers in E.164 format (required for "create")'
        ),
      csvFileName: z.string().optional().describe('CSV file name (default: "contacts.csv")'),
      fromPhoneNumbers: z
        .array(z.string())
        .optional()
        .describe('Caller phone numbers in E.164 format'),
      scheduledAt: z
        .string()
        .optional()
        .describe('ISO 8601 datetime with timezone for scheduling'),
      bypassCallGuardrails: z
        .boolean()
        .optional()
        .describe('Bypass calling time restrictions'),
      retryConfig: z
        .object({
          enabled: z.boolean().optional(),
          maxRetries: z.number().optional(),
          retryIntervalsMinutes: z.array(z.number()).optional()
        })
        .optional()
        .describe('Retry configuration for unanswered calls')
    })
  )
  .output(
    z.object({
      batchId: z.string().optional().describe('Batch ID'),
      status: z.string().describe('Operation result status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let input = ctx.input;

    if (input.action === 'create') {
      if (!input.agentId) throw new Error('agentId is required to create a batch');
      if (!input.csvContent) throw new Error('csvContent is required to create a batch');

      let retryConfig: Record<string, any> | undefined;
      if (input.retryConfig) {
        retryConfig = {
          ...(input.retryConfig.enabled !== undefined && {
            enabled: input.retryConfig.enabled
          }),
          ...(input.retryConfig.maxRetries && { max_retries: input.retryConfig.maxRetries }),
          ...(input.retryConfig.retryIntervalsMinutes && {
            retry_intervals_minutes: input.retryConfig.retryIntervalsMinutes
          })
        };
      }

      let result = await client.createBatch(
        input.agentId,
        input.csvContent,
        input.csvFileName || 'contacts.csv',
        input.fromPhoneNumbers,
        retryConfig
      );

      return {
        output: {
          batchId: result.batch_id,
          status: result.state || 'created'
        },
        message: `Created batch \`${result.batch_id}\` for agent \`${input.agentId}\`.`
      };
    }

    if (input.action === 'schedule') {
      if (!input.batchId) throw new Error('batchId is required to schedule a batch');
      if (!input.scheduledAt) throw new Error('scheduledAt is required to schedule a batch');

      let result = await client.scheduleBatch(
        input.batchId,
        input.scheduledAt,
        input.bypassCallGuardrails
      );

      return {
        output: {
          batchId: input.batchId,
          status: result.state || 'scheduled'
        },
        message: `Scheduled batch \`${input.batchId}\` for ${input.scheduledAt}.`
      };
    }

    if (input.action === 'stop') {
      if (!input.batchId) throw new Error('batchId is required to stop a batch');

      let result = await client.stopBatch(input.batchId);

      return {
        output: {
          batchId: input.batchId,
          status: result.state || 'stopped'
        },
        message: `Stopped batch \`${input.batchId}\`.`
      };
    }

    if (input.action === 'delete') {
      if (!input.batchId) throw new Error('batchId is required to delete a batch');

      let result = await client.deleteBatch(input.batchId);

      return {
        output: {
          batchId: input.batchId,
          status: result.state || 'deleted'
        },
        message: `Deleted batch \`${input.batchId}\`.`
      };
    }

    throw new Error(`Unknown action: ${input.action}`);
  })
  .build();
