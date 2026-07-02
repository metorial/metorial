import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let waterVaporRecordSchema = z
  .object({
    water_vapor: z.number().optional().describe('Water vapor level'),
    createdAt: z.string().optional().describe('Record timestamp')
  })
  .passthrough();

export let getWaterVapor = SlateTool.create(spec, {
  name: 'Get Water Vapor',
  key: 'get_water_vapor',
  description: `Retrieve real-time or historical water vapor levels for a location. Useful for weather analysis, climate research, and atmospheric studies.`,
  constraints: [
    'Historical data window is limited to 48 hours.',
    'Timestamps must be in format "YYYY-MM-DD HH:mm:ss".'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      lat: z.number().min(-90).max(90).describe('Latitude (-90 to 90)'),
      lng: z.number().min(-180).max(180).describe('Longitude (-180 to 180)'),
      from: z
        .string()
        .optional()
        .describe('Start timestamp for historical data in "YYYY-MM-DD HH:mm:ss" format'),
      to: z
        .string()
        .optional()
        .describe('End timestamp for historical data in "YYYY-MM-DD HH:mm:ss" format')
    })
  )
  .output(
    z
      .object({
        message: z.string().optional(),
        waterVaporRecords: z.array(waterVaporRecordSchema).describe('Water vapor data records')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      language: ctx.config.language
    });

    let result: any;
    let isHistorical = ctx.input.from && ctx.input.to;

    if (isHistorical) {
      result = await client.getWaterVaporHistory(
        ctx.input.lat,
        ctx.input.lng,
        ctx.input.from!,
        ctx.input.to!
      );
    } else {
      result = await client.getWaterVaporLatest(ctx.input.lat, ctx.input.lng);
    }

    let waterVaporRecords = result.data || [];

    let summary =
      waterVaporRecords.length > 0
        ? `Retrieved **${waterVaporRecords.length}** water vapor record(s).${!isHistorical && waterVaporRecords[0] ? ` Current level: **${waterVaporRecords[0].water_vapor}**.` : ''}`
        : 'No water vapor data available for the specified location.';

    return {
      output: {
        message: result.message,
        waterVaporRecords
      },
      message: summary
    };
  })
  .build();
