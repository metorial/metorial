import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let deviceSchema = z.object({
  deviceId: z.string().describe('Device identifier'),
  name: z.string().describe('Device display name'),
  os: z.string().optional().describe('Operating system (e.g., iOS, Android)'),
  osVersion: z.string().optional().describe('OS version'),
  manufacturer: z.string().optional().describe('Device manufacturer'),
  isPrivate: z.boolean().optional().describe('Whether this is a private device'),
  screenSize: z.string().optional().describe('Screen size'),
  cpuCores: z.number().optional().describe('Number of CPU cores'),
  ramSize: z.number().optional().describe('RAM size in MB')
});

export let listDevices = SlateTool.create(spec, {
  name: 'List Real Devices',
  key: 'list_devices',
  description: `Retrieve the catalog of real devices available in your Sauce Labs data center. Returns device specifications including OS, manufacturer, screen size, and capabilities.`,
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      devices: z.array(deviceSchema).describe('Available real devices'),
      totalCount: z.number().describe('Total number of devices')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.listDevices();

    let devices = (Array.isArray(result) ? result : []).map((d: any) => ({
      deviceId: d.id,
      name: d.name,
      os: d.os,
      osVersion: d.osVersion,
      manufacturer: d.manufacturer,
      isPrivate: d.isPrivate,
      screenSize: d.screenSize,
      cpuCores: d.cpuCores,
      ramSize: d.ramSize
    }));

    return {
      output: { devices, totalCount: devices.length },
      message: `Found **${devices.length}** real devices available.`
    };
  })
  .build();
