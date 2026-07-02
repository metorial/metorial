import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let attemptSchema = z.object({
  attemptId: z.string().describe('Unique attempt ID'),
  messageId: z.string().describe('Associated message ID'),
  endpointId: z.string().describe('Target endpoint ID'),
  responseBody: z.string().describe('Response body from the endpoint'),
  responseDurationMs: z.number().describe('Endpoint response duration in milliseconds'),
  responseStatusCode: z.number().describe('HTTP status code returned'),
  status: z
    .number()
    .describe('Attempt status: 0=Success, 1=Pending, 2=Failed, 3=Sending, 4=Canceled'),
  statusText: z.string().describe('Attempt status text'),
  timestamp: z.string().describe('When the attempt was made'),
  triggerType: z.number().describe('What triggered the attempt: 0=Scheduled, 1=Manual'),
  url: z.string().describe('URL the message was sent to')
});

export let listAttemptsByMessage = SlateTool.create(spec, {
  name: 'List Attempts by Message',
  key: 'list_attempts_by_message',
  description: `List delivery attempts for a specific message. Shows the status, response, and endpoint for each attempt. Use this to debug delivery failures or verify successful delivery.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      applicationId: z.string().describe('Application ID or UID'),
      messageId: z.string().describe('Message ID to list attempts for'),
      limit: z.number().optional().describe('Maximum number of attempts to return'),
      iterator: z.string().optional().describe('Pagination cursor'),
      order: z
        .enum(['ascending', 'descending'])
        .optional()
        .describe('Sort order for returned attempts'),
      status: z
        .number()
        .optional()
        .describe('Filter by status: 0=Success, 1=Pending, 2=Failed, 3=Sending, 4=Canceled'),
      statusCodeClass: z
        .number()
        .optional()
        .describe('Filter by HTTP status code class: 0, 100, 200, 300, 400, or 500'),
      channel: z.string().optional().describe('Filter by channel'),
      tag: z.string().optional().describe('Filter by tag'),
      eventTypes: z.array(z.string()).optional().describe('Filter by event types'),
      expandedStatuses: z
        .boolean()
        .optional()
        .describe('Whether to expand status values where supported by Svix'),
      before: z.string().optional().describe('Only return attempts before this ISO timestamp'),
      after: z.string().optional().describe('Only return attempts after this ISO timestamp')
    })
  )
  .output(
    z.object({
      attempts: z.array(attemptSchema),
      hasMore: z.boolean().describe('Whether there are more results'),
      iterator: z.string().optional().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region || 'us'
    });

    ctx.progress('Fetching message attempts...');
    let result = await client.listAttemptsByMessage(
      ctx.input.applicationId,
      ctx.input.messageId,
      {
        limit: ctx.input.limit,
        iterator: ctx.input.iterator,
        order: ctx.input.order,
        status: ctx.input.status,
        statusCodeClass: ctx.input.statusCodeClass,
        channel: ctx.input.channel,
        tag: ctx.input.tag,
        eventTypes: ctx.input.eventTypes,
        expandedStatuses: ctx.input.expandedStatuses,
        before: ctx.input.before,
        after: ctx.input.after
      }
    );

    let attempts = result.data.map(a => ({
      attemptId: a.id,
      messageId: a.msgId,
      endpointId: a.endpointId,
      responseBody: a.response,
      responseDurationMs: a.responseDurationMs,
      responseStatusCode: a.responseStatusCode,
      status: a.status,
      statusText: a.statusText,
      timestamp: a.timestamp,
      triggerType: a.triggerType,
      url: a.url
    }));

    return {
      output: {
        attempts,
        hasMore: !result.done,
        iterator: result.iterator ?? undefined
      },
      message: `Found **${attempts.length}** attempt(s) for message \`${ctx.input.messageId}\`.`
    };
  })
  .build();

export let listAttemptsByEndpoint = SlateTool.create(spec, {
  name: 'List Attempts by Endpoint',
  key: 'list_attempts_by_endpoint',
  description: `List delivery attempts targeting a specific endpoint across all messages. Useful for diagnosing endpoint health and delivery patterns.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      applicationId: z.string().describe('Application ID or UID'),
      endpointId: z.string().describe('Endpoint ID or UID'),
      limit: z.number().optional().describe('Maximum number of attempts to return'),
      iterator: z.string().optional().describe('Pagination cursor'),
      order: z
        .enum(['ascending', 'descending'])
        .optional()
        .describe('Sort order for returned attempts'),
      status: z
        .number()
        .optional()
        .describe('Filter by status: 0=Success, 1=Pending, 2=Failed, 3=Sending, 4=Canceled'),
      statusCodeClass: z
        .number()
        .optional()
        .describe('Filter by HTTP status code class: 0, 100, 200, 300, 400, or 500'),
      channel: z.string().optional().describe('Filter by channel'),
      tag: z.string().optional().describe('Filter by tag'),
      eventTypes: z.array(z.string()).optional().describe('Filter by event types'),
      expandedStatuses: z
        .boolean()
        .optional()
        .describe('Whether to expand status values where supported by Svix'),
      before: z.string().optional().describe('Only return attempts before this ISO timestamp'),
      after: z.string().optional().describe('Only return attempts after this ISO timestamp')
    })
  )
  .output(
    z.object({
      attempts: z.array(attemptSchema),
      hasMore: z.boolean().describe('Whether there are more results'),
      iterator: z.string().optional().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region || 'us'
    });

    ctx.progress('Fetching endpoint attempts...');
    let result = await client.listAttemptsByEndpoint(
      ctx.input.applicationId,
      ctx.input.endpointId,
      {
        limit: ctx.input.limit,
        iterator: ctx.input.iterator,
        order: ctx.input.order,
        status: ctx.input.status,
        statusCodeClass: ctx.input.statusCodeClass,
        channel: ctx.input.channel,
        tag: ctx.input.tag,
        eventTypes: ctx.input.eventTypes,
        expandedStatuses: ctx.input.expandedStatuses,
        before: ctx.input.before,
        after: ctx.input.after
      }
    );

    let attempts = result.data.map(a => ({
      attemptId: a.id,
      messageId: a.msgId,
      endpointId: a.endpointId,
      responseBody: a.response,
      responseDurationMs: a.responseDurationMs,
      responseStatusCode: a.responseStatusCode,
      status: a.status,
      statusText: a.statusText,
      timestamp: a.timestamp,
      triggerType: a.triggerType,
      url: a.url
    }));

    return {
      output: {
        attempts,
        hasMore: !result.done,
        iterator: result.iterator ?? undefined
      },
      message: `Found **${attempts.length}** attempt(s) for endpoint \`${ctx.input.endpointId}\`.`
    };
  })
  .build();

export let resendMessage = SlateTool.create(spec, {
  name: 'Resend Message',
  key: 'resend_message',
  description: `Manually resend a specific message to a specific endpoint. Use this to retry a single failed delivery without recovering all messages.`
})
  .input(
    z.object({
      applicationId: z.string().describe('Application ID or UID'),
      messageId: z.string().describe('Message ID to resend'),
      endpointId: z.string().describe('Endpoint ID or UID to resend to')
    })
  )
  .output(
    z.object({
      resent: z.boolean().describe('Whether the resend was initiated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region || 'us'
    });

    ctx.progress('Resending message...');
    await client.resendMessage(
      ctx.input.applicationId,
      ctx.input.messageId,
      ctx.input.endpointId
    );

    return {
      output: { resent: true },
      message: `Resent message \`${ctx.input.messageId}\` to endpoint \`${ctx.input.endpointId}\`.`
    };
  })
  .build();
