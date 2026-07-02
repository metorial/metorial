import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listDevices = SlateTool.create(spec, {
  name: 'List Devices',
  key: 'list_devices',
  description: `List all weather station devices registered to the user's Ambient Weather account. Returns each device's MAC address, name, location, and its **most recent** sensor readings (temperature, humidity, wind, rain, etc.). Use this to discover available devices before fetching historical data.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      devices: z
        .array(
          z.object({
            macAddress: z.string().describe('MAC address identifier of the device'),
            name: z.string().optional().describe('User-assigned device name'),
            location: z.string().optional().describe('Device location description'),
            latitude: z.number().optional().describe('Device latitude'),
            longitude: z.number().optional().describe('Device longitude'),
            lastData: z
              .record(z.string(), z.any())
              .optional()
              .describe('Most recent sensor readings from the device')
          })
        )
        .describe('List of registered weather station devices')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      applicationKey: ctx.auth.applicationKey
    });

    let devices = await client.listDevices();

    let mapped = devices.map(device => {
      let coords = device.info?.coords?.coords;
      return {
        macAddress: device.macAddress,
        name: device.info?.name,
        location: device.info?.location,
        latitude: coords?.lat,
        longitude: coords?.lon,
        lastData: device.lastData
      };
    });

    return {
      output: { devices: mapped },
      message: `Found **${mapped.length}** weather station device(s).${mapped.map(d => `\n- **${d.name || d.macAddress}**${d.location ? ` (${d.location})` : ''}`).join('')}`
    };
  })
  .build();
