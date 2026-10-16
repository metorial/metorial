import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapSchedule, scheduleId, scheduleOutput } from '../lib/schedule';
import { spec } from '../spec';

export let reportEnergyScheduleConsumption = SlateTool.create(spec, {
  name: 'Report Energy Schedule Consumption',
  key: 'report_energy_schedule_consumption',
  description:
    'Reports measured energy or power and completed time slots for an existing schedule. Use the schedule ID returned by create_energy_schedule.',
  tags: { readOnly: false }
})
  .input(
    z.object({
      scheduleId,
      currentEnergy: z.number().optional().describe('Current measured energy'),
      currentPower: z.number().optional().describe('Current measured power'),
      timeSlots: z
        .array(
          z.object({
            startTime: z.string().describe('ISO 8601 start timestamp'),
            endTime: z.string().describe('ISO 8601 end timestamp'),
            energy: z.number().describe('Measured energy in the slot'),
            averagePower: z.number().describe('Average measured power in the slot')
          })
        )
        .optional()
    })
  )
  .output(scheduleOutput)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.updateScheduleConsumption(ctx.input.scheduleId, {
      currentEnergy: ctx.input.currentEnergy,
      currentPower: ctx.input.currentPower,
      timeSlots: ctx.input.timeSlots
    });
    return {
      output: mapSchedule(result),
      message: 'Reported consumption to the energy schedule.'
    };
  })
  .build();
