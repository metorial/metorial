import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlanyoClient } from '../lib/client';
import { spec } from '../spec';

export let checkAvailability = SlateTool.create(spec, {
  name: 'Check Availability',
  key: 'check_availability',
  description: `Checks whether a reservation can be made for a resource during a given time period. Uses the comprehensive \`can_make_reservation\` check which considers all booking constraints (not just availability). Optionally returns the calculated price.`,
  instructions: [
    'This performs a full feasibility check including booking rules, buffer times, weekday constraints, etc.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      resourceId: z.string().describe('ID of the resource to check'),
      startTime: z.string().describe('Desired rental start time'),
      endTime: z.string().describe('Desired rental end time'),
      quantity: z.number().describe('Number of units needed'),
      includePrice: z.boolean().optional().describe('Also return the calculated rental price'),
      userId: z.string().optional().describe('User ID for user-dependent pricing')
    })
  )
  .output(
    z.object({
      isAvailable: z.boolean().describe('Whether the reservation can be made'),
      reason: z.string().optional().describe('Explanation if unavailable'),
      problemTime: z.string().optional().describe('First conflicting time if unavailable'),
      totalPrice: z
        .number()
        .optional()
        .describe('Calculated rental price (if includePrice was true)'),
      currency: z.string().optional().describe('Currency code (if price returned)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlanyoClient(ctx.auth, ctx.config);

    let result = await client.canMakeReservation({
      resourceId: ctx.input.resourceId,
      startTime: ctx.input.startTime,
      endTime: ctx.input.endTime,
      quantity: ctx.input.quantity,
      returnPrice: ctx.input.includePrice,
      userId: ctx.input.userId
    });

    let isAvailable = Boolean(result.is_reservation_possible);

    return {
      output: {
        isAvailable,
        reason: result.reason,
        problemTime: result.problem_time ? String(result.problem_time) : undefined,
        totalPrice: result.total != null ? Number(result.total) : undefined,
        currency: result.currency
      },
      message: isAvailable
        ? `Resource ${ctx.input.resourceId} **is available** for ${ctx.input.startTime} to ${ctx.input.endTime}.${result.total != null ? ` Price: ${result.currency || ''} ${result.total}` : ''}`
        : `Resource ${ctx.input.resourceId} **is not available**: ${result.reason || 'unavailable'}`
    };
  })
  .build();
