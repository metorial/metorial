import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getDeviceData = SlateTool.create(spec, {
  name: 'Get Device Data',
  key: 'get_device_data',
  description: `Retrieve historical weather data for a specific device. Returns sensor readings stored in 5 or 30 minute increments, depending on the device. Data includes temperature, humidity, wind, barometric pressure, rain, UV, solar radiation, and more depending on the station model. Results are returned in reverse chronological order.`,
  instructions: [
    'Use the **List Devices** tool first to discover available MAC addresses.',
    'The most recent historical data may be delayed by up to 10 minutes. For real-time data, use the List Devices tool which includes the latest reading.'
  ],
  constraints: [
    'Maximum of 288 records per request.',
    'API rate limited to 1 request/second per API key.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      macAddress: z.string().describe('MAC address of the device to fetch data for'),
      limit: z
        .number()
        .min(1)
        .max(288)
        .optional()
        .describe(
          'Maximum number of records to return (max 288). Defaults to the API default.'
        ),
      endDate: z
        .string()
        .optional()
        .describe(
          'ISO 8601 date string for the most recent datetime to query from. Results descend from this point. If omitted, returns the most recent data.'
        )
    })
  )
  .output(
    z.object({
      macAddress: z.string().describe('MAC address of the queried device'),
      recordCount: z.number().describe('Number of records returned'),
      readings: z
        .array(z.record(z.string(), z.any()))
        .describe('Array of weather data readings in reverse chronological order')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      applicationKey: ctx.auth.applicationKey
    });

    let endDateEpoch: number | undefined;
    if (ctx.input.endDate) {
      endDateEpoch = new Date(ctx.input.endDate).getTime();
    }

    let data = await client.getDeviceData(ctx.input.macAddress, {
      limit: ctx.input.limit,
      endDate: endDateEpoch
    });

    let firstDate = data.length > 0 ? String(data[0]?.date ?? '') : undefined;
    let lastDate = data.length > 0 ? String(data[data.length - 1]?.date ?? '') : undefined;

    return {
      output: {
        macAddress: ctx.input.macAddress,
        recordCount: data.length,
        readings: data
      },
      message: `Retrieved **${data.length}** weather data record(s) for device \`${ctx.input.macAddress}\`.${firstDate && lastDate ? `\nDate range: ${lastDate} to ${firstDate}` : ''}`
    };
  })
  .build();
