import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export const getIncident = SlateTool.create(spec, {
  key: 'get_incident',
  name: 'Get Incident',
  description:
    'Read one Splunk On-Call incident by its numeric incident number, including phase, alerts and paging targets.',
  tags: { readOnly: true }
})
  .input(z.object({ incidentNumber: z.string().describe('Numeric incident number') }))
  .output(z.object({ incident: z.record(z.string(), z.unknown()) }))
  .handleInvocation(async ctx => ({
    output: { incident: await new Client(ctx.auth).getIncident(ctx.input.incidentNumber) },
    message: 'Retrieved the incident.'
  }))
  .build();

export const deleteRoutingKey = SlateTool.create(spec, {
  key: 'delete_routing_key',
  name: 'Delete Routing Key',
  description:
    'Remove an existing routing key. The default key cannot be deleted; removing other keys changes routing of incoming alerts.',
  tags: { destructive: true, readOnly: false }
})
  .input(z.object({ routingKey: z.string().describe('Existing non-default routing key') }))
  .output(z.object({ routingKey: z.string(), result: z.string() }))
  .handleInvocation(async ctx => ({
    output: await new Client(ctx.auth).deleteRoutingKey(ctx.input.routingKey),
    message: 'Submitted routing key deletion.'
  }))
  .build();

export const listChatMessages = SlateTool.create(spec, {
  key: 'list_chat_messages',
  name: 'List Chat Messages',
  description: 'Read organization or incident chat messages with offset pagination.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      incidentId: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Restrict chat messages to this incident timeline'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(200)
        .optional()
        .describe('Maximum messages per page; default 50, maximum 200'),
      offset: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe('Messages to skip; default 0. Use nextOffset for another page.')
    })
  )
  .output(
    z.object({
      messages: z.array(z.record(z.string(), z.unknown())),
      hasMore: z.boolean(),
      returnedCount: z.number().int(),
      nextOffset: z.number().int().optional()
    })
  )
  .handleInvocation(async ctx => {
    const result = await new Client(ctx.auth).listChatMessages(ctx.input);
    return {
      output: {
        ...result,
        returnedCount: result.messages.length,
        nextOffset: result.hasMore
          ? (ctx.input.offset ?? 0) + result.messages.length
          : undefined
      },
      message: `Found ${result.messages.length} chat messages.`
    };
  })
  .build();
