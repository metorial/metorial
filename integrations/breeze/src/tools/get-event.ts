import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getEvent = SlateTool.create(spec, {
  name: 'Get Event',
  key: 'get_event',
  description: `Retrieve detailed information about a specific event instance. Optionally include the event's schedule (related series instances).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      instanceId: z.string().describe('Event instance ID'),
      schedule: z.boolean().optional().describe('Include related series instances'),
      scheduleDirection: z
        .enum(['previous', 'next'])
        .optional()
        .describe('Direction for schedule query'),
      scheduleLimit: z
        .number()
        .optional()
        .describe('Maximum number of schedule instances to return'),
      details: z.boolean().optional().describe('Include full event details'),
      eligible: z.boolean().optional().describe('Include check-in eligibility settings')
    })
  )
  .output(
    z.object({
      event: z.any().describe('Event instance details')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let event = await client.getEvent(ctx.input.instanceId, {
      schedule: ctx.input.schedule,
      scheduleDirection: ctx.input.scheduleDirection,
      scheduleLimit: ctx.input.scheduleLimit,
      details: ctx.input.details,
      eligible: ctx.input.eligible
    });

    return {
      output: { event },
      message: `Retrieved event (instance ID: ${ctx.input.instanceId}).`
    };
  })
  .build();
