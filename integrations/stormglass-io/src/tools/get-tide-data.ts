import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, getResponseRows } from '../lib/client';
import { spec } from '../spec';

export let getTideDataTool = SlateTool.create(spec, {
  name: 'Get Tide Data',
  key: 'get_tide_data',
  description: `Retrieve tide data for a specific location, including sea level predictions and high/low tide extremes. Automatically selects the closest tide station to the provided coordinates.

Can return either **sea level** data (hourly predicted sea levels) or **extremes** data (high and low tide times and heights), or both.`,
  instructions: [
    'Provide latitude and longitude for the target location.',
    'Choose the data type: "seaLevel" for hourly predictions, "extremes" for high/low tide times, or "both" for combined data.',
    'Choose a datum reference level; the default is MSL (Mean Sea Level). Heights are relative to the chosen datum and do not represent water depth.',
    'The end timestamp is inclusive for sea level and exclusive for extremes.'
  ],
  constraints: [
    'Defaults to 10-day range if end is not specified.',
    'Tide station is automatically selected based on proximity to given coordinates.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      latitude: z.number().describe('Latitude of the location (-90 to 90)'),
      longitude: z.number().describe('Longitude of the location (-180 to 180)'),
      dataType: z
        .enum(['seaLevel', 'extremes', 'both'])
        .default('both')
        .describe('Type of tide data to retrieve'),
      start: z
        .string()
        .optional()
        .describe(
          'Start time in UTC ISO 8601 or UNIX seconds. Provider ignores ISO timezone offsets.'
        ),
      end: z
        .string()
        .optional()
        .describe(
          'End time in UTC ISO 8601 or UNIX seconds. Inclusive for sea level; exclusive for extremes.'
        ),
      datum: z
        .enum(['MSL', 'MLLW', 'LAT', 'MLW', 'MHW', 'MHHW', 'HAT'])
        .optional()
        .describe('Datum reference level. Defaults to MSL (Mean Sea Level).')
    })
  )
  .output(
    z.object({
      seaLevel: z
        .array(
          z
            .object({
              time: z.string().describe('UTC timestamp'),
              sg: z
                .number()
                .optional()
                .describe('Sea level value in meters from Stormglass AI')
            })
            .catchall(z.any())
        )
        .optional()
        .describe('Hourly sea level data points'),
      extremes: z
        .array(
          z.object({
            time: z.string().describe('UTC timestamp of the extreme'),
            height: z.number().describe('Sea level height in meters'),
            type: z.string().describe('Type of extreme: "high" or "low"')
          })
        )
        .optional()
        .describe('High and low tide extremes'),
      meta: z
        .record(z.string(), z.any())
        .describe('Request metadata including station information'),
      seaLevelMeta: z
        .record(z.string(), z.any())
        .optional()
        .describe('Metadata for the sea-level request'),
      extremesMeta: z
        .record(z.string(), z.any())
        .optional()
        .describe('Metadata for the extremes request'),
      raw: z
        .record(z.string(), z.any())
        .optional()
        .describe('Complete original provider responses by data type')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let tideParams = {
      lat: ctx.input.latitude,
      lng: ctx.input.longitude,
      start: ctx.input.start,
      end: ctx.input.end,
      datum: ctx.input.datum
    };

    let seaLevelData: any;
    let extremesData: any;
    let meta: Record<string, any> = {};
    let seaLevelMeta: Record<string, any> | undefined;
    let extremesMeta: Record<string, any> | undefined;
    let raw: Record<string, any> = {};

    if (ctx.input.dataType === 'seaLevel' || ctx.input.dataType === 'both') {
      let seaLevelResult = await client.getTideSeaLevel(tideParams);
      seaLevelData = getResponseRows(seaLevelResult, 'data');
      seaLevelMeta = seaLevelResult.meta;
      raw.seaLevel = seaLevelResult;
      meta = { ...meta, ...seaLevelMeta };
    }

    if (ctx.input.dataType === 'extremes' || ctx.input.dataType === 'both') {
      let extremesResult = await client.getTideExtremes(tideParams);
      extremesData = getResponseRows(extremesResult, 'data');
      extremesMeta = extremesResult.meta;
      raw.extremes = extremesResult;
      meta = { ...meta, ...extremesMeta };
    }

    let messageParts: string[] = [];
    if (seaLevelData) {
      messageParts.push(`**${seaLevelData.length}** sea level data points`);
    }
    if (extremesData) {
      messageParts.push(`**${extremesData.length}** tide extremes`);
    }

    return {
      output: {
        seaLevel: seaLevelData,
        extremes: extremesData,
        meta,
        seaLevelMeta,
        extremesMeta,
        raw
      },
      message: `Retrieved ${messageParts.join(' and ')} for coordinates (${ctx.input.latitude}, ${ctx.input.longitude}).`
    };
  })
  .build();
