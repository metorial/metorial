import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCurrentWeather = SlateTool.create(spec, {
  name: 'Get Current Weather',
  key: 'get_current_weather',
  description: `Get the latest weather reading reported by a specific device. Includes temperature, humidity, wind, pressure, rain, and other available sensors. Check the returned timestamp for freshness; an offline station may have an older reading.`,
  instructions: [
    'Use the **List Devices** tool to discover available MAC addresses if you do not already know one.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      macAddress: z.string().describe('MAC address of the device to get current weather for')
    })
  )
  .output(
    z.object({
      macAddress: z.string().describe('MAC address of the device'),
      deviceName: z.string().optional().describe('User-assigned device name'),
      timestamp: z.string().optional().describe('Timestamp of the reading'),
      currentConditions: z
        .record(z.string(), z.any())
        .describe('Latest sensor readings from the device')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      applicationKey: ctx.auth.applicationKey
    });

    let devices = await client.listDevices();
    let device = devices.find(
      d => d.macAddress.toLowerCase() === ctx.input.macAddress.toLowerCase()
    );

    if (!device) {
      throw createApiServiceError(
        `Device with MAC address "${ctx.input.macAddress}" not found. Use the List Devices tool to see available devices.`,
        { reason: 'ambient_weather_device_not_found' }
      );
    }

    let lastData = device.lastData || {};
    let tempF = lastData.tempf;
    let humidity = lastData.humidity;
    let windSpeed = lastData.windspeedmph;

    let summary: string[] = [];
    if (typeof tempF === 'number') summary.push(`${tempF}F`);
    if (typeof humidity === 'number') summary.push(`${humidity}% humidity`);
    if (typeof windSpeed === 'number') summary.push(`wind ${windSpeed} mph`);

    return {
      output: {
        macAddress: device.macAddress,
        deviceName: device.info?.name,
        timestamp: typeof lastData.date === 'string' ? lastData.date : undefined,
        currentConditions: lastData
      },
      message: `Latest reported weather at **${device.info?.name || device.macAddress}**: ${summary.length > 0 ? summary.join(', ') : Object.keys(lastData).length ? 'sensor readings available in output' : 'no sensor readings available'}`
    };
  })
  .build();
