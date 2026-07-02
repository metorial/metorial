import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let soilRecordSchema = z
  .object({
    soil_temperature: z.number().optional().describe('Soil temperature'),
    soil_moisture: z.number().optional().describe('Soil moisture level'),
    scantime: z.string().optional().describe('Scan timestamp')
  })
  .passthrough();

export let getSoil = SlateTool.create(spec, {
  name: 'Get Soil Data',
  key: 'get_soil',
  description: `Retrieve real-time or historical soil moisture and temperature data for a location. Use for agriculture, environmental monitoring, and land management applications.`,
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
        soilRecords: z.array(soilRecordSchema).describe('Soil data records')
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
      result = await client.getSoilHistory(
        ctx.input.lat,
        ctx.input.lng,
        ctx.input.from!,
        ctx.input.to!
      );
    } else {
      result = await client.getSoilLatest(ctx.input.lat, ctx.input.lng);
    }

    let soilRecords = result.data || [];

    let summary =
      soilRecords.length > 0
        ? `Retrieved **${soilRecords.length}** soil record(s). ${!isHistorical && soilRecords[0] ? `Temperature: **${soilRecords[0].soil_temperature}**, Moisture: **${soilRecords[0].soil_moisture}**.` : ''}`
        : 'No soil data available for the specified location.';

    return {
      output: {
        message: result.message,
        soilRecords
      },
      message: summary
    };
  })
  .build();
