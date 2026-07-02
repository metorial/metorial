import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let ndviRecordSchema = z
  .object({
    ndvi: z
      .number()
      .optional()
      .describe('Normalized Difference Vegetation Index value (-1 to 1)'),
    evi: z.number().optional().describe('Enhanced Vegetation Index value'),
    uvi: z.number().optional().describe('UV Index value')
  })
  .passthrough();

export let getNdvi = SlateTool.create(spec, {
  name: 'Get NDVI / EVI',
  key: 'get_ndvi',
  description: `Retrieve real-time or historical NDVI (Normalized Difference Vegetation Index), EVI (Enhanced Vegetation Index), and UVI data for a location. Useful for agriculture, reforestation monitoring, and urban planning.`,
  constraints: ['Timestamps must be in format "YYYY-MM-DD HH:mm:ss" for historical queries.'],
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
        ndviRecords: z.array(ndviRecordSchema).describe('NDVI/EVI data records')
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
      result = await client.getNdviHistory(
        ctx.input.lat,
        ctx.input.lng,
        ctx.input.from!,
        ctx.input.to!
      );
    } else {
      result = await client.getNdviLatest(ctx.input.lat, ctx.input.lng);
    }

    let ndviRecords = result.data || [];

    let summary =
      ndviRecords.length > 0
        ? `Retrieved **${ndviRecords.length}** NDVI/EVI record(s).${!isHistorical && ndviRecords[0] ? ` NDVI: **${ndviRecords[0].ndvi}**, EVI: **${ndviRecords[0].evi}**.` : ''}`
        : 'No NDVI/EVI data available for the specified location.';

    return {
      output: {
        message: result.message,
        ndviRecords
      },
      message: summary
    };
  })
  .build();
