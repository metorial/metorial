import { SlateTool } from 'slates';
import { z } from 'zod';
import { deviceSchema, mapDevice } from '../lib/devices';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

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

    let devices = (Array.isArray(result) ? result : []).map(mapDevice);

    return {
      output: { devices, totalCount: devices.length },
      message: `Found **${devices.length}** real devices available.`
    };
  })
  .build();
