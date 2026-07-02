import { SlateTool } from 'slates';
import { z } from 'zod';
import { V0Client } from '../lib/client';
import { spec } from '../spec';

let hookEventTypes = z.enum([
  'chat.created',
  'chat.updated',
  'chat.deleted',
  'message.created',
  'message.updated',
  'message.deleted',
  'message.finished'
]);

let hookSchema = z.object({
  hookId: z.string().describe('Webhook identifier'),
  name: z.string().describe('Webhook name'),
  events: z.array(z.string()).optional().describe('Subscribed event types'),
  chatId: z.string().optional().describe('Scoped chat ID'),
  url: z.string().optional().describe('Target URL for webhook payloads')
});

export let listHooksTool = SlateTool.create(spec, {
  name: 'List Hooks',
  key: 'list_hooks',
  description: `Retrieve all webhooks configured in your V0 workspace.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      hooks: z.array(hookSchema).describe('List of webhooks')
    })
  )
  .handleInvocation(async ctx => {
    let client = new V0Client(ctx.auth.token);
    let result = await client.listHooks();

    let hooks = (result.data || []).map((h: any) => ({
      hookId: h.id,
      name: h.name,
      events: h.events,
      chatId: h.chatId,
      url: h.url
    }));

    return {
      output: { hooks },
      message: `Found **${hooks.length}** webhook(s).`
    };
  })
  .build();

export let createHookTool = SlateTool.create(spec, {
  name: 'Create Hook',
  key: 'create_hook',
  description: `Create a new webhook that listens for specific V0 events. Supported events include chat and message lifecycle events. Optionally scope the hook to a specific chat.`,
  instructions: [
    'Available event types: chat.created, chat.updated, chat.deleted, message.created, message.updated, message.deleted, message.finished.'
  ]
})
  .input(
    z.object({
      name: z.string().describe('Human-readable name for the webhook'),
      events: z.array(hookEventTypes).describe('Event types to subscribe to'),
      url: z.string().describe('Target URL to receive webhook payloads'),
      chatId: z.string().optional().describe('Scope the hook to a specific chat')
    })
  )
  .output(hookSchema)
  .handleInvocation(async ctx => {
    let client = new V0Client(ctx.auth.token);
    let result = await client.createHook(ctx.input);

    return {
      output: {
        hookId: result.id,
        name: result.name,
        events: result.events,
        chatId: result.chatId,
        url: result.url
      },
      message: `Created webhook **${result.name}** (${result.id}) listening for ${(result.events || []).join(', ')}.`
    };
  })
  .build();

export let getHookTool = SlateTool.create(spec, {
  name: 'Get Hook',
  key: 'get_hook',
  description: `Retrieve the details of a specific webhook by its ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      hookId: z.string().describe('The webhook ID to retrieve')
    })
  )
  .output(hookSchema)
  .handleInvocation(async ctx => {
    let client = new V0Client(ctx.auth.token);
    let result = await client.getHook(ctx.input.hookId);

    return {
      output: {
        hookId: result.id,
        name: result.name,
        events: result.events,
        chatId: result.chatId,
        url: result.url
      },
      message: `Retrieved webhook **${result.name}** (${result.id}).`
    };
  })
  .build();

export let deleteHookTool = SlateTool.create(spec, {
  name: 'Delete Hook',
  key: 'delete_hook',
  description: `Delete a webhook by its ID. This action is irreversible.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      hookId: z.string().describe('The webhook ID to delete')
    })
  )
  .output(
    z.object({
      hookId: z.string().describe('ID of the deleted webhook'),
      deleted: z.boolean().describe('Whether the webhook was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new V0Client(ctx.auth.token);
    await client.deleteHook(ctx.input.hookId);

    return {
      output: {
        hookId: ctx.input.hookId,
        deleted: true
      },
      message: `Deleted webhook ${ctx.input.hookId}.`
    };
  })
  .build();
