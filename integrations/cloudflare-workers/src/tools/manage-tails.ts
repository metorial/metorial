import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let tailSchema = z.object({
  tailId: z.string().describe('Tail session UUID'),
  websocketUrl: z.string().optional().describe('WebSocket URL for streaming logs'),
  expiresAt: z.string().optional().describe('ISO 8601 expiration timestamp')
});

export let createTail = SlateTool.create(spec, {
  name: 'Start Tail Session',
  key: 'create_tail',
  description: `Start a real-time log tail for a Worker script. Returns a WebSocket URL that streams logs and exceptions from the Worker as they occur. Useful for live debugging.`
})
  .input(
    z.object({
      scriptName: z.string().describe('Name of the Worker script to tail')
    })
  )
  .output(
    z.object({
      tailId: z.string().describe('Tail session UUID'),
      websocketUrl: z.string().optional().describe('WebSocket URL for streaming logs'),
      expiresAt: z
        .string()
        .optional()
        .describe('ISO 8601 expiration timestamp for the tail session')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.createTail(ctx.input.scriptName);

    return {
      output: {
        tailId: result.id,
        websocketUrl: result.url,
        expiresAt: result.expires_at
      },
      message: `Started tail session for Worker **${ctx.input.scriptName}**. Connect to the WebSocket URL to stream logs.`
    };
  })
  .build();

export let listTails = SlateTool.create(spec, {
  name: 'List Tail Sessions',
  key: 'list_tails',
  description: `List all active tail sessions for a Worker script.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      scriptName: z.string().describe('Name of the Worker script')
    })
  )
  .output(
    z.object({
      tails: z.array(tailSchema).describe('Active tail sessions for the Worker'),
      tailId: z.string().optional().describe('Active tail session UUID'),
      websocketUrl: z.string().optional().describe('WebSocket URL for streaming logs'),
      expiresAt: z.string().optional().describe('ISO 8601 expiration timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.listTails(ctx.input.scriptName);

    let tails = (Array.isArray(result) ? result : result ? [result] : []).map((tail: any) => ({
      tailId: tail.id,
      websocketUrl: tail.url,
      expiresAt: tail.expires_at
    }));
    let tail = tails[0];

    return {
      output: {
        tails,
        tailId: tail?.tailId,
        websocketUrl: tail?.websocketUrl,
        expiresAt: tail?.expiresAt
      },
      message: tail?.tailId
        ? `Active tail session **${tail.tailId}** for Worker **${ctx.input.scriptName}**.`
        : `No active tail sessions for Worker **${ctx.input.scriptName}**.`
    };
  })
  .build();

export let deleteTail = SlateTool.create(spec, {
  name: 'Stop Tail Session',
  key: 'delete_tail',
  description: `Stop an active tail session for a Worker script.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      scriptName: z.string().describe('Name of the Worker script'),
      tailId: z.string().describe('Tail session UUID to stop')
    })
  )
  .output(
    z.object({
      stopped: z.boolean().describe('Whether the tail session was stopped')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    await client.deleteTail(ctx.input.scriptName, ctx.input.tailId);

    return {
      output: { stopped: true },
      message: `Tail session **${ctx.input.tailId}** has been stopped.`
    };
  })
  .build();
