import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let recoverEndpoint = SlateTool.create(spec, {
  name: 'Recover Failed Messages',
  key: 'recover_failed_messages',
  description: `Bulk-recover all failed messages for an endpoint since a given date. This resends all messages that have exhausted their retry attempts. Use this after an outage or endpoint misconfiguration to replay missed webhooks.`,
  instructions: [
    'The "since" timestamp should be an ISO 8601 date string (e.g., "2024-01-01T00:00:00Z").',
    'Messages that were successfully delivered are not resent, even if they failed initially.'
  ]
})
  .input(
    z.object({
      applicationId: z.string().describe('Application ID or UID'),
      endpointId: z.string().describe('Endpoint ID or UID to recover messages for'),
      since: z.string().describe('Recover all failed messages since this ISO timestamp'),
      until: z.string().optional().describe('Optional upper bound ISO timestamp')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('Background task ID for the recovery operation'),
      status: z.string().describe('Status of the recovery task'),
      task: z.string().describe('Task type')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region || 'us'
    });

    ctx.progress('Initiating message recovery...');
    let result = await client.recoverEndpoint(ctx.input.applicationId, ctx.input.endpointId, {
      since: ctx.input.since,
      until: ctx.input.until
    });

    return {
      output: {
        taskId: result.id,
        status: result.status,
        task: result.task
      },
      message: `Recovery initiated for endpoint \`${ctx.input.endpointId}\` since ${ctx.input.since}. Task ID: \`${result.id}\`.`
    };
  })
  .build();
