import { SlateTool } from 'slates';
import { z } from 'zod';
import { RuntimeClient } from '../lib/client';
import { resolveRuntimeParams, runtimeScopeFields } from '../lib/schemas';
import { spec } from '../spec';

export let createEventTool = SlateTool.create(spec, {
  name: 'Create Event',
  key: 'create_event',
  description: `Send an event to a bot for asynchronous processing. Events trigger bot workflows and can be scoped to a conversation or user. Use this to push external data or signals into a bot. Call list_workspaces to discover workspace IDs, then list_bots to discover bot IDs.`
})
  .input(
    z.object({
      ...runtimeScopeFields,
      eventType: z.string().describe('Event type identifier, e.g. "custom:myEvent"'),
      payload: z.record(z.string(), z.unknown()).describe('Event payload data'),
      conversationId: z.string().optional().describe('Scope the event to a conversation'),
      userId: z.string().optional().describe('Scope the event to a user')
    })
  )
  .output(
    z.object({
      eventId: z.string(),
      eventType: z.string(),
      status: z.string().optional(),
      createdAt: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new RuntimeClient({
      token: ctx.auth.token,
      ...resolveRuntimeParams(ctx.input, ctx.config)
    });

    let result = await client.createEvent({
      type: ctx.input.eventType,
      payload: ctx.input.payload,
      conversationId: ctx.input.conversationId,
      userId: ctx.input.userId
    });

    let evt = result.event;
    return {
      output: {
        eventId: evt.id,
        eventType: evt.type,
        status: evt.status,
        createdAt: evt.createdAt
      },
      message: `Created event **${evt.type}** (${evt.id}) with status **${evt.status}**.`
    };
  })
  .build();
