import { SlateTool } from 'slates';
import { z } from 'zod';
import { NasaClient } from '../lib/client';
import { spec } from '../spec';

export let getFireballs = SlateTool.create(spec, {
  name: 'Get Fireball Events',
  key: 'get_fireballs',
  description: `Retrieve fireball and bolide event data from NASA's SSD/CNEOS system. Fireballs are bright meteors visible over a wide area. Returns date, location, energy, velocity, and altitude information for reported events.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      dateMin: z.string().optional().describe('Minimum event date (YYYY-MM-DD)'),
      dateMax: z.string().optional().describe('Maximum event date (YYYY-MM-DD)'),
      minEnergy: z
        .number()
        .optional()
        .describe('Minimum total radiated energy in Joules (e.g., 1e10)'),
      requireLocation: z.boolean().optional().describe('Only return events with location data')
    })
  )
  .output(
    z.object({
      count: z.number().describe('Number of fireball events'),
      fields: z.array(z.string()).describe('Column field names for the data rows'),
      data: z.array(z.array(z.any())).describe('Fireball event data rows')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NasaClient({ token: ctx.auth.token });

    let result = await client.getSsdFireballs({
      dateMin: ctx.input.dateMin,
      dateMax: ctx.input.dateMax,
      minEnergy: ctx.input.minEnergy,
      reqLoc: ctx.input.requireLocation
    });

    let fields = (result.fields || []).map((f: any) => f.name || f);
    let data = result.data || [];

    return {
      output: { count: result.count || data.length, fields, data },
      message: `Found **${result.count || data.length}** fireball events${ctx.input.dateMin ? ` since ${ctx.input.dateMin}` : ''}.`
    };
  })
  .build();
