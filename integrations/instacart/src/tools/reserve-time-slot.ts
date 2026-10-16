import { SlateTool } from 'slates';
import { z } from 'zod';
import { ConnectClient } from '../lib/connect-client';
import { spec } from '../spec';

export let reserveTimeSlot = SlateTool.create(spec, {
  key: 'reserve_time_slot',
  name: 'Reserve Time Slot',
  description:
    'Reserve a time slot returned by List Cart Service Options using its ID or its desired-window reference. Requires Connect OAuth with connect:fulfillment. The provider returns the hold ID and actual expiration.',
  instructions: [
    'Provide exactly one serviceOptionId or serviceOptionReference.',
    'Use options from the completed cart, rather than Preview Service Options.',
    'A user can have one active reservation; a new request cancels the previous reservation.'
  ],
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      userId: z.string().describe('Connect user ID'),
      serviceOptionId: z
        .string()
        .optional()
        .describe('Time slot ID from List Cart Service Options'),
      serviceOptionReference: z
        .string()
        .optional()
        .describe('Desired-window reference from List Cart Service Options')
    })
  )
  .output(
    z.object({
      serviceOptionHoldId: z.number().describe('Hold ID to pass when creating an order'),
      expiresAt: z.string().describe('Actual expiration in ISO 8601 format'),
      raw: z.unknown().optional().describe('Complete provider reservation result')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ConnectClient({
      token: ctx.auth.token,
      environment: ctx.config.environment,
      baseUrl: ctx.auth.baseUrl
    });
    let result = await client.reserveTimeSlot(ctx.input.userId, ctx.input);
    return {
      output: result,
      message: `Reserved time slot for **${ctx.input.userId}** until ${result.expiresAt}. Hold ID: ${result.serviceOptionHoldId}.`
    };
  })
  .build();
