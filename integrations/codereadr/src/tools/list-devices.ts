import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listDevices = SlateTool.create(spec, {
  name: 'List Devices',
  key: 'list_devices',
  description: `Retrieve devices associated with your CodeREADr account. Returns device details including UDID, name, and creation timestamp.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      deviceId: z
        .string()
        .optional()
        .describe('Specific device ID to retrieve. Leave empty to retrieve all devices.')
    })
  )
  .output(
    z.object({
      devices: z
        .array(
          z
            .object({
              deviceId: z.string().describe('Unique ID of the device'),
              udid: z.string().optional().describe('Unique device identifier'),
              deviceName: z.string().optional().describe('Device name'),
              createdAt: z.string().optional().describe('Device registration timestamp')
            })
            .passthrough()
        )
        .describe('List of devices')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let devices = await client.retrieveDevices(ctx.input.deviceId);

    return {
      output: { devices },
      message: ctx.input.deviceId
        ? `Retrieved device **${ctx.input.deviceId}**.`
        : `Retrieved **${devices.length}** device(s).`
    };
  })
  .build();
