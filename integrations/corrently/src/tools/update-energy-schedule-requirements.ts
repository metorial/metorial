import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapSchedule, optimizationMode, scheduleId, scheduleOutput } from '../lib/schedule';
import { spec } from '../spec';

export let updateEnergyScheduleRequirements = SlateTool.create(spec, {
  name: 'Update Energy Schedule Requirements',
  key: 'update_energy_schedule_requirements',
  description:
    'Updates the optimization requirements of an existing energy schedule. Use the schedule ID returned by create_energy_schedule.',
  tags: { readOnly: false }
})
  .input(
    z.object({
      scheduleId,
      optimizationMode: optimizationMode.describe('Optimization goal'),
      activeHours: z.number().optional().describe('Required whole active hours, 1-36'),
      consecutiveHours: z.boolean().optional(),
      energyDemand: z.number().optional().describe('Total energy demand'),
      maxLoad: z.number().optional().describe('Maximum power load'),
      avgLoad: z.number().optional().describe('Average power load')
    })
  )
  .output(scheduleOutput)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.updateScheduleRequirements(ctx.input.scheduleId, {
      law: ctx.input.optimizationMode,
      activeHours: ctx.input.activeHours,
      consecutiveHours: ctx.input.consecutiveHours,
      energyDemand: ctx.input.energyDemand,
      maxLoad: ctx.input.maxLoad,
      avgLoad: ctx.input.avgLoad
    });
    return {
      output: mapSchedule(result),
      message: 'Updated the energy schedule requirements.'
    };
  })
  .build();
