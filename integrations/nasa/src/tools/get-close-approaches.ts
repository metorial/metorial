import { SlateTool } from 'slates';
import { z } from 'zod';
import { NasaClient } from '../lib/client';
import { spec } from '../spec';

export let getCloseApproaches = SlateTool.create(spec, {
  name: 'Get Close Approach Data',
  key: 'get_close_approaches',
  description: `Retrieve close approach data for asteroids and comets from NASA's SSD/CNEOS system. Find when small bodies pass near Earth or other solar system bodies, with distance and velocity information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      dateMin: z
        .string()
        .optional()
        .describe('Minimum close approach date (YYYY-MM-DD or "now" for current date)'),
      dateMax: z
        .string()
        .optional()
        .describe('Maximum close approach date (YYYY-MM-DD or "+60" for 60 days from now)'),
      distMax: z
        .string()
        .optional()
        .describe(
          'Maximum approach distance filter (e.g., "0.05" in AU, or "10LD" for lunar distances)'
        ),
      body: z
        .string()
        .optional()
        .describe('Close approach body (default "Earth"). Use "ALL" for all bodies.')
    })
  )
  .output(
    z.object({
      count: z.number().describe('Number of close approach records'),
      fields: z.array(z.string()).describe('Column field names for the data rows'),
      data: z
        .array(z.array(z.string()))
        .describe('Close approach data rows (values correspond to fields)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NasaClient({ token: ctx.auth.token });

    let result = await client.getSsdCloseApproach({
      dateMin: ctx.input.dateMin,
      dateMax: ctx.input.dateMax,
      distMax: ctx.input.distMax,
      body: ctx.input.body
    });

    let fields = (result.fields || []).map((f: any) => f.name || f);
    let data = result.data || [];

    return {
      output: { count: result.count || data.length, fields, data },
      message: `Found **${result.count || data.length}** close approach records${ctx.input.body && ctx.input.body !== 'Earth' ? ` for ${ctx.input.body}` : ''}.`
    };
  })
  .build();
