import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapSchedule, optimizationMode, scheduleOutput } from '../lib/schedule';
import { spec } from '../spec';

export let createEnergySchedule = SlateTool.create(spec, {
  name: 'Energy Schedule',
  key: 'create_energy_schedule',
  description:
    'Creates an optimized device-operation schedule for a German location using price, solar, emission, or comfort optimization. Returns time slots and a schedule ID for subsequent retrieval and updates.',
  instructions: [
    'Use get_energy_schedule to retrieve the current recommendation and progress by scheduleId.'
  ],
  tags: { readOnly: false }
})
  .input(
    z.object({
      zip: z.string().describe('German postal code (Postleitzahl), 5 digits'),
      optimizationMode: optimizationMode.describe('Optimization goal for the schedule'),
      activeHours: z
        .number()
        .min(1)
        .max(36)
        .describe('Number of whole active hours required for device operation'),
      date: z.string().optional().describe('Schedule date in YYYY-MM-DD format'),
      coverageHours: z
        .number()
        .optional()
        .describe('Whole hours to cover, 1-36; provider default is 24'),
      consecutiveHours: z
        .boolean()
        .optional()
        .describe('Whether the active hours must be consecutive'),
      energyDemand: z.number().optional().describe('Total energy demand'),
      maxLoad: z.number().optional().describe('Maximum power load'),
      avgLoad: z.number().optional().describe('Average power load')
    })
  )
  .output(scheduleOutput)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { optimizationMode, ...input } = ctx.input;
    let result = await client.createSchedule({
      ...input,
      zip: ctx.input.zip || ctx.config.zip || '',
      law: optimizationMode
    });
    let output = mapSchedule(result);
    return {
      output,
      message: `Created energy schedule${output.scheduleId ? ` **${output.scheduleId}**` : ''} with **${output.schedule.filter(slot => slot.active).length}** active time slots.`
    };
  })
  .build();
