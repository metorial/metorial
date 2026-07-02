import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let disasterHistoryRecordSchema = z.any().describe('Historical natural disaster record');

export let getNaturalDisastersHistory = SlateTool.create(spec, {
  name: 'Get Natural Disasters History',
  key: 'get_natural_disasters_history',
  description: `Retrieve historical natural disaster data within a time window. Supports querying by coordinates, continent code, or country code, with optional event type filtering.`,
  instructions: [
    'Event type codes: EQ (Earthquake), TN (Tsunami), TC (Tropical Cyclone), WF (Wildfire), FL (Flood), ET (Extreme Temperature), DR (Drought), SW (Severe Storm), SI (Sea Ice), VO (Volcano), LS (Landslide).',
    'Continent codes: AFR, ANT, ASIA, AUS, EUR, NAR, SAR, Ocean.',
    'Timestamps must be in format "YYYY-MM-DD HH:mm:ss".'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      lat: z.number().min(-90).max(90).optional().describe('Latitude (-90 to 90)'),
      lng: z.number().min(-180).max(180).optional().describe('Longitude (-180 to 180)'),
      continent: z.string().optional().describe('Continent code'),
      countryCode: z.string().optional().describe('3-letter ISO country code'),
      from: z.string().describe('Start timestamp in "YYYY-MM-DD HH:mm:ss" format'),
      to: z.string().describe('End timestamp in "YYYY-MM-DD HH:mm:ss" format'),
      eventType: z
        .enum(['EQ', 'TN', 'TC', 'WF', 'FL', 'ET', 'DR', 'SW', 'SI', 'VO', 'LS'])
        .optional()
        .describe('Filter by event type code'),
      limit: z.number().optional().describe('Number of records per page'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z
      .object({
        message: z.string().optional(),
        disasters: z.array(disasterHistoryRecordSchema).describe('Historical disaster records')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      language: ctx.config.language
    });

    let filterParams = {
      eventType: ctx.input.eventType,
      limit: ctx.input.limit,
      page: ctx.input.page
    };

    let result: any;

    if (ctx.input.lat !== undefined && ctx.input.lng !== undefined) {
      result = await client.getDisastersHistoryByLatLng(
        ctx.input.lat,
        ctx.input.lng,
        ctx.input.from,
        ctx.input.to,
        filterParams
      );
    } else if (ctx.input.continent) {
      result = await client.getDisastersHistoryByContinent(
        ctx.input.continent,
        ctx.input.from,
        ctx.input.to,
        filterParams
      );
    } else if (ctx.input.countryCode) {
      result = await client.getDisastersHistoryByCountryCode(
        ctx.input.countryCode,
        ctx.input.from,
        ctx.input.to,
        filterParams
      );
    } else {
      throw new Error('Provide lat/lng coordinates, a continent code, or a country code.');
    }

    let disasters = result.data || [];

    return {
      output: {
        message: result.message,
        disasters
      },
      message: `Retrieved **${disasters.length}** historical disaster record(s) from ${ctx.input.from} to ${ctx.input.to}.`
    };
  })
  .build();
