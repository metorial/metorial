import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createEnergySchedule = SlateTool.create(spec, {
  name: 'Energy Schedule',
  key: 'create_energy_schedule',
  description: `Creates an optimized energy schedule for device operation based on real-time grid conditions, prices, and environmental factors. Supports multiple optimization modes: **price** (cheapest electricity), **solar** (align with solar generation), **emission** (minimize carbon), and **comfort** (balance efficiency with user needs). Returns hourly time slots indicating when to activate or deactivate devices.`,
  instructions: [
    'Schedules can be planned up to 36 hours in advance.',
    'Use "price" mode to minimize electricity cost, "solar" to maximize solar usage, "emission" to minimize CO2, or "comfort" for a balanced approach.'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      zip: z.string().describe('German postal code (Postleitzahl), 5 digits'),
      optimizationMode: z
        .enum(['price', 'solar', 'emission', 'comfort'])
        .describe('Optimization goal for the schedule'),
      activeHours: z
        .number()
        .min(1)
        .max(36)
        .describe('Number of active hours required for device operation')
    })
  )
  .output(
    z.object({
      schedule: z
        .array(
          z.object({
            epochTime: z.number().optional().describe('Unix timestamp in seconds'),
            timeStamp: z.number().optional().describe('Timestamp in milliseconds'),
            active: z
              .boolean()
              .optional()
              .describe('Whether the device should be active in this time slot'),
            gsi: z.number().optional().describe('GreenPowerIndex for this time slot'),
            price: z.number().optional().describe('Energy price for this time slot'),
            co2: z.number().optional().describe('CO2 emissions for this time slot')
          })
        )
        .describe('Hourly schedule slots')
    })
  )
  .handleInvocation(async ctx => {
    let zip = ctx.input.zip || ctx.config.zip;
    if (!zip) {
      throw new Error('A German postal code (zip) is required.');
    }

    let client = new Client({ token: ctx.auth.token });
    let result = await client.createSchedule({
      zip,
      law: ctx.input.optimizationMode,
      activeHours: ctx.input.activeHours
    });

    let schedule = (result.schedule || []).map(slot => ({
      epochTime: slot.epochtime,
      timeStamp: slot.timeStamp,
      active: slot.active,
      gsi: slot.gsi,
      price: slot.price,
      co2: slot.co2
    }));

    let activeSlots = schedule.filter(s => s.active).length;

    return {
      output: { schedule },
      message: `Created energy schedule for **${zip}** optimized for **${ctx.input.optimizationMode}**. **${activeSlots}** of **${schedule.length}** time slots are marked as active.`
    };
  })
  .build();
