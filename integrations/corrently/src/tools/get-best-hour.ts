import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getBestHour = SlateTool.create(spec, {
  name: 'Best Hour for Energy Use',
  key: 'get_best_hour',
  description: `Finds the best hour to consume energy based on renewable energy availability and low CO2 emissions for a given German location. Returns whether a device should be turned on now, based on the greenest hours within the specified timeframe.`,
  constraints: [
    'Only supports German postal codes.',
    'Timeframe is limited to 1-168 hours (1 week).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      zip: z.string().describe('German postal code (Postleitzahl), 5 digits'),
      lookAheadHours: z
        .number()
        .min(1)
        .max(168)
        .optional()
        .describe('Number of hours to look ahead (default: 24, max: 168)'),
      requiredHours: z
        .number()
        .min(1)
        .optional()
        .describe('Number of consecutive hours the device needs to run')
    })
  )
  .output(
    z.object({
      shouldActivateNow: z
        .boolean()
        .optional()
        .describe('Whether the device should be activated now for optimal green energy usage'),
      bestHour: z.number().optional().describe('Best starting hour (epoch time)')
    })
  )
  .handleInvocation(async ctx => {
    let zip = ctx.input.zip || ctx.config.zip;
    if (!zip) {
      throw new Error('A German postal code (zip) is required.');
    }

    let client = new Client({ token: ctx.auth.token });
    let result = await client.getBestHour({
      zip,
      timeframe: ctx.input.lookAheadHours,
      hours: ctx.input.requiredHours
    });

    return {
      output: {
        shouldActivateNow: result.activated,
        bestHour: result.bestHour
      },
      message: result.activated
        ? `**Now** is a good time to activate your device in **${zip}** — the grid has high renewable energy availability.`
        : `It is **not** the best time to activate. The optimal window for **${zip}** is upcoming.`
    };
  })
  .build();
