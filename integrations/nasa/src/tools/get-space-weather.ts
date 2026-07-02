import { SlateTool } from 'slates';
import { z } from 'zod';
import { NasaClient } from '../lib/client';
import { spec } from '../spec';

export let getSpaceWeather = SlateTool.create(spec, {
  name: 'Get Space Weather Events',
  key: 'get_space_weather',
  description: `Query NASA's Space Weather Database (DONKI) for space weather events. Retrieve data on coronal mass ejections (CME), solar flares (FLR), geomagnetic storms (GST), solar energetic particles (SEP), interplanetary shocks (IPS), magnetopause crossings (MPC), radiation belt enhancements (RBE), high speed streams (HSS), and notifications.`,
  instructions: [
    'Event types: CME (Coronal Mass Ejection), CMEAnalysis, FLR (Solar Flare), SEP (Solar Energetic Particle), GST (Geomagnetic Storm), IPS (Interplanetary Shock), MPC (Magnetopause Crossing), RBE (Radiation Belt Enhancement), HSS (High Speed Stream), notifications.',
    'Dates should be in YYYY-MM-DD format.',
    'Default date range is the last 30 days if not specified.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      eventType: z
        .enum([
          'CME',
          'CMEAnalysis',
          'FLR',
          'SEP',
          'GST',
          'IPS',
          'MPC',
          'RBE',
          'HSS',
          'notifications'
        ])
        .describe('Type of space weather event to query'),
      startDate: z
        .string()
        .optional()
        .describe('Start date (YYYY-MM-DD). Defaults to 30 days ago.'),
      endDate: z.string().optional().describe('End date (YYYY-MM-DD). Defaults to today.')
    })
  )
  .output(
    z.object({
      events: z
        .array(z.record(z.string(), z.any()))
        .describe('List of space weather events with fields specific to the event type'),
      eventCount: z.number().describe('Number of events returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NasaClient({ token: ctx.auth.token });

    let result = await client.getDonkiEvents(ctx.input.eventType, {
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate
    });

    let events = Array.isArray(result) ? result : [];

    return {
      output: { events, eventCount: events.length },
      message: `Retrieved **${events.length}** ${ctx.input.eventType} space weather events${ctx.input.startDate ? ` from ${ctx.input.startDate}` : ''}${ctx.input.endDate ? ` to ${ctx.input.endDate}` : ''}.`
    };
  })
  .build();
