import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { AblyControlClient } from '../lib/control-client';
import { appIdInput } from '../lib/schemas';
import { validateInteger } from '../lib/validation';
import { spec } from '../spec';

export let manageQueues = SlateTool.create(spec, {
  name: 'Manage Queues',
  key: 'manage_queues',
  description: `List, create, or delete Ably message queues using the Control API.
Queues allow worker servers to consume realtime messages via AMQP or STOMP protocols without managing queueing infrastructure.`,
  instructions: [
    'Requires Control API Token authentication.',
    'App ID is required for all operations.',
    'Queues are region-specific and can be configured with TTL and max length.',
    'For create, supply ttlMinutes, maxLength, and region as required by the Control API. ttlMinutes takes precedence over ttl.',
    'The legacy ttl field retains its historical unchanged numeric request value; its seconds label is inaccurate for the provider. Use ttlMinutes to set an unambiguous duration.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'delete']).describe('Operation to perform'),
      appId: appIdInput,
      queueId: z.string().optional().describe('Queue ID. Required for delete.'),
      name: z.string().optional().describe('Queue name. Required for create.'),
      ttlMinutes: z
        .number()
        .optional()
        .describe(
          'Message TTL in minutes for create. Takes precedence over the legacy ttl field.'
        ),
      ttl: z
        .number()
        .optional()
        .describe('Time to live for messages in the queue (in seconds)'),
      maxLength: z.number().optional().describe('Maximum number of messages in the queue'),
      region: z
        .string()
        .optional()
        .describe('AWS region for the queue (e.g. "us-east-1-a", "eu-west-1-a")')
    })
  )
  .output(
    z.object({
      queues: z.array(z.any()).optional().describe('List of queues (list action)'),
      queue: z.any().optional().describe('Created queue details'),
      deleted: z.boolean().optional().describe('Whether the queue was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AblyControlClient(ctx.auth.token, ctx.auth.authType);
    let appId = ctx.input.appId || ctx.config.appId;
    if (!appId)
      throw createApiServiceError(
        'appId is required. Call manage_apps with action list to discover an app ID, then supply appId.'
      );

    if (ctx.input.action === 'list') {
      let queues = await client.listQueues(appId);
      return {
        output: { queues },
        message: `Found **${queues.length}** queue(s) for app **${appId}**.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.name)
        throw createApiServiceError('name is required for creating a queue.');
      validateInteger('ttlMinutes', ctx.input.ttlMinutes, 1);
      let queue = await client.createQueue(appId, {
        name: ctx.input.name,
        ttl: ctx.input.ttlMinutes ?? ctx.input.ttl,
        maxLength: ctx.input.maxLength,
        region: ctx.input.region
      });
      return {
        output: { queue },
        message: `Created queue **${queue.name}** in app **${appId}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.queueId)
        throw createApiServiceError('queueId is required for deleting a queue.');
      await client.deleteQueue(appId, ctx.input.queueId);
      return {
        output: { deleted: true },
        message: `Deleted queue **${ctx.input.queueId}** from app **${appId}**.`
      };
    }

    throw createApiServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
