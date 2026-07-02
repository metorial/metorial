import { SlateTool } from 'slates';
import { z } from 'zod';
import { SqsClient } from '../lib/client';
import { spec } from '../spec';

export let manageMessageMoveTask = SlateTool.create(spec, {
  name: 'Manage Message Move Task',
  key: 'manage_message_move_task',
  description: `Start, list, or cancel message move tasks. Message move tasks are used to move messages from a dead-letter queue back to its source queue or to another destination queue for reprocessing.`,
  instructions: [
    'Set "action" to "start" to begin moving messages from a DLQ.',
    'Set "action" to "list" to view active and recent move tasks for a source ARN.',
    'Set "action" to "cancel" to stop an in-progress move task.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['start', 'list', 'cancel']).describe('The action to perform'),
      sourceArn: z
        .string()
        .optional()
        .describe('ARN of the source DLQ (required for "start" and "list")'),
      destinationArn: z
        .string()
        .optional()
        .describe(
          'ARN of the destination queue (optional for "start"; defaults to source queue\'s original queue)'
        ),
      maxNumberOfMessagesPerSecond: z
        .number()
        .optional()
        .describe('Throttle rate for message move (optional for "start")'),
      taskHandle: z
        .string()
        .optional()
        .describe('Handle of the task to cancel (required for "cancel")'),
      maxResults: z.number().optional().describe('Max results to return (for "list")')
    })
  )
  .output(
    z.object({
      taskHandle: z.string().optional().describe('Handle of the started task'),
      approximateNumberOfMessagesMoved: z
        .number()
        .optional()
        .describe('Messages moved so far (returned on cancel)'),
      tasks: z
        .array(
          z.object({
            taskHandle: z.string().optional().describe('Task handle'),
            status: z.string().optional().describe('Task status'),
            sourceArn: z.string().optional().describe('Source queue ARN'),
            destinationArn: z.string().optional().describe('Destination queue ARN'),
            approximateNumberOfMessagesMoved: z
              .number()
              .optional()
              .describe('Messages moved so far'),
            approximateNumberOfMessagesToMove: z
              .number()
              .optional()
              .describe('Total messages to move'),
            startedTimestamp: z
              .number()
              .optional()
              .describe('When the task started (epoch milliseconds)'),
            failureReason: z.string().optional().describe('Reason for failure if applicable')
          })
        )
        .optional()
        .describe('List of message move tasks')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SqsClient({
      region: ctx.config.region,
      credentials: {
        accessKeyId: ctx.auth.accessKeyId,
        secretAccessKey: ctx.auth.secretAccessKey,
        sessionToken: ctx.auth.sessionToken
      }
    });

    if (ctx.input.action === 'start') {
      if (!ctx.input.sourceArn) {
        throw new Error('"sourceArn" is required for "start" action');
      }
      let result = await client.startMessageMoveTask(
        ctx.input.sourceArn,
        ctx.input.destinationArn,
        ctx.input.maxNumberOfMessagesPerSecond
      );
      return {
        output: { taskHandle: result.taskHandle },
        message: `Started message move task from DLQ`
      };
    }

    if (ctx.input.action === 'list') {
      if (!ctx.input.sourceArn) {
        throw new Error('"sourceArn" is required for "list" action');
      }
      let result = await client.listMessageMoveTasks(
        ctx.input.sourceArn,
        ctx.input.maxResults
      );
      return {
        output: { tasks: result.results },
        message:
          result.results.length === 0
            ? 'No message move tasks found'
            : `Found **${result.results.length}** message move task(s)`
      };
    }

    if (ctx.input.action === 'cancel') {
      if (!ctx.input.taskHandle) {
        throw new Error('"taskHandle" is required for "cancel" action');
      }
      let result = await client.cancelMessageMoveTask(ctx.input.taskHandle);
      return {
        output: { approximateNumberOfMessagesMoved: result.approximateNumberOfMessagesMoved },
        message: `Cancelled message move task. Approximately **${result.approximateNumberOfMessagesMoved}** messages were moved.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
