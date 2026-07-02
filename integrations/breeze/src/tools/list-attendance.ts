import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listAttendance = SlateTool.create(spec, {
  name: 'List Attendance',
  key: 'list_attendance',
  description: `List attendance records for an event instance. Optionally include full person details and filter by attendance type. Can also retrieve the list of people eligible for check-in.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      instanceId: z.string().describe('Event instance ID'),
      details: z.boolean().optional().describe('Include full person details in the response'),
      type: z.string().optional().describe('Filter by attendance type'),
      includeEligible: z
        .boolean()
        .optional()
        .describe('Also return the list of people eligible for check-in')
    })
  )
  .output(
    z.object({
      attendance: z.array(z.any()).describe('Array of attendance records'),
      eligible: z
        .array(z.any())
        .optional()
        .describe('People eligible for check-in (when includeEligible is true)')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let attendance = await client.listAttendance(ctx.input.instanceId, {
      details: ctx.input.details,
      type: ctx.input.type
    });
    let attendanceArray = Array.isArray(attendance) ? attendance : [];

    let eligible: unknown[] | undefined;
    if (ctx.input.includeEligible) {
      let result = await client.listEligiblePeople(ctx.input.instanceId);
      eligible = Array.isArray(result) ? result : [];
    }

    return {
      output: { attendance: attendanceArray, eligible },
      message: `Found **${attendanceArray.length}** attendance records for event instance (ID: ${ctx.input.instanceId}).`
    };
  })
  .build();
