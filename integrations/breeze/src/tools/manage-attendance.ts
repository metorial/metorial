import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageAttendance = SlateTool.create(spec, {
  name: 'Manage Attendance',
  key: 'manage_attendance',
  description: `Check a person in or out of an event instance, or remove their attendance record. Supports recording arrival (check-in) and departure (check-out) timestamps.`
})
  .input(
    z.object({
      action: z
        .enum(['check_in', 'check_out', 'remove'])
        .describe(
          '"check_in": record arrival, "check_out": record departure, "remove": delete the attendance record'
        ),
      personId: z.string().describe('ID of the person'),
      instanceId: z.string().describe('Event instance ID')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result: unknown;

    if (ctx.input.action === 'remove') {
      result = await client.removeAttendance(ctx.input.personId, ctx.input.instanceId);
    } else {
      let direction = ctx.input.action === 'check_in' ? 'in' : 'out';
      result = await client.addAttendance(ctx.input.personId, ctx.input.instanceId, direction);
    }

    return {
      output: { success: result === true || result === 'true' },
      message: `${ctx.input.action === 'check_in' ? 'Checked in' : ctx.input.action === 'check_out' ? 'Checked out' : 'Removed attendance for'} person (ID: ${ctx.input.personId}) at event instance (ID: ${ctx.input.instanceId}).`
    };
  })
  .build();
