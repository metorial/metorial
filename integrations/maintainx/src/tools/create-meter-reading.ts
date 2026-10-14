import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { organizationIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let createMeterReading = SlateTool.create(spec, {
  name: 'Create Meter Reading',
  key: 'create_meter_reading',
  description: `Records a new meter reading in MaintainX. Meter readings track equipment metrics like runtime hours, mileage, pressure, or temperature. Useful for condition-based and predictive maintenance. For multi-organization keys, call list_organizations and pass organizationId.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      organizationId: organizationIdSchema,
      meterId: z.number().describe('ID of the meter to record a reading for'),
      value: z.number().describe('Numeric reading value'),
      date: z
        .string()
        .optional()
        .describe('Date of the reading in ISO 8601 format. Defaults to now if not provided.')
    })
  )
  .output(
    z.object({
      readingId: z.number().optional().describe('ID of the created reading'),
      readingIdText: z
        .string()
        .optional()
        .describe('Provider reading ID, including string IDs'),
      readingDate: z.string().optional().describe('Timestamp when the meter was read'),
      meterId: z.number().describe('ID of the meter'),
      value: z.number().describe('Recorded value')
    })
  )
  .handleInvocation(async ctx => {
    let client = Client.fromContext(ctx);

    let result = await client.createMeterReading(ctx.input.meterId, {
      value: ctx.input.value,
      date: ctx.input.date
    });

    let reading = result.reading ?? result;

    return {
      output: {
        readingId: typeof reading.id === 'number' ? reading.id : undefined,
        readingIdText: reading.id == null ? undefined : String(reading.id),
        readingDate: reading.readingDate ?? undefined,
        meterId: ctx.input.meterId,
        value: ctx.input.value
      },
      message: `Recorded meter reading of **${ctx.input.value}** for meter **#${ctx.input.meterId}**.`
    };
  })
  .build();
