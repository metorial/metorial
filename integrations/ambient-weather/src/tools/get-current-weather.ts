import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCurrentWeather = SlateTool.create(spec, {
  name: 'Get Current Weather',
  key: 'get_current_weather',
  description: `Get the latest real-time weather conditions from a specific device. Unlike historical data which may be delayed, this returns the most up-to-date reading available. Includes temperature, humidity, wind, pressure, rain, and all other sensors available on the station.`,
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
      throw new Error(
        `Device with MAC address "${ctx.input.macAddress}" not found. Use the List Devices tool to see available devices.`
      );
    }

    let lastData = device.lastData || {};
    let tempF = lastData.tempf as number | undefined;
    let humidity = lastData.humidity as number | undefined;
    let windSpeed = lastData.windspeedmph as number | undefined;

    let summary: string[] = [];
    if (tempF !== undefined) summary.push(`${tempF}F`);
    if (humidity !== undefined) summary.push(`${humidity}% humidity`);
    if (windSpeed !== undefined) summary.push(`wind ${windSpeed} mph`);

    return {
      output: {
        macAddress: device.macAddress,
        deviceName: device.info?.name,
        timestamp: lastData.date as string | undefined,
        currentConditions: lastData
      },
      message: `Current weather at **${device.info?.name || device.macAddress}**: ${summary.length > 0 ? summary.join(', ') : 'data available in output'}`
    };
  })
  .build();
