import { SlateTool } from 'slates';
import { z } from 'zod';
import { ConnectClient } from '../lib/client';
import { spec } from '../spec';

export let testTriggerTool = SlateTool.create(spec, {
  name: 'Test Trigger',
  key: 'test_trigger',
  description: `Simulate a trigger event for a specific connection and user. This sends a test request that simulates an event firing for the user, which IFTTT will then forward to your webhook endpoint. Useful for testing and debugging connection integrations.`,
  instructions: ['The user must have the connection enabled for the test to work.']
})
  .input(
    z.object({
      connectionId: z.string().describe('The ID of the connection containing the trigger'),
      triggerId: z
        .string()
        .describe('The trigger identifier (e.g., "google_calendar.any_event_starts")'),
      userId: z.string().describe('The user ID to simulate the trigger event for'),
      userFeatureId: z
        .string()
        .optional()
        .describe('Optional user feature ID to scope the trigger test')
    })
  )
  .output(
    z.object({
      connectionId: z.string().describe('The connection ID'),
      triggerId: z.string().describe('The trigger that was tested'),
      success: z.boolean().describe('Whether the test trigger request was accepted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ConnectClient(ctx.auth.token);
    await client.testTrigger(
      ctx.input.connectionId,
      ctx.input.triggerId,
      ctx.input.userId,
      ctx.input.userFeatureId
    );

    return {
      output: {
        connectionId: ctx.input.connectionId,
        triggerId: ctx.input.triggerId,
        success: true
      },
      message: `Sent test trigger for **${ctx.input.triggerId}** on connection **${ctx.input.connectionId}** for user **${ctx.input.userId}**.`
    };
  })
  .build();
