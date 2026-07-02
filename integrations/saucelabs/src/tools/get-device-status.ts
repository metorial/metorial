import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let deviceStatusSchema = z.object({
  descriptor: z.string().optional().describe('Device descriptor/identifier'),
  deviceName: z.string().optional().describe('Device display name'),
  state: z
    .string()
    .optional()
    .describe('Current state (AVAILABLE, IN_USE, CLEANING, REBOOTING, MAINTENANCE, OFFLINE)'),
  isPrivateDevice: z.boolean().optional().describe('Whether this is a private device'),
  inUseBy: z.string().nullable().optional().describe('Username currently using the device')
});

export let getDeviceStatus = SlateTool.create(spec, {
  name: 'Get Device Status',
  key: 'get_device_status',
  description: `Check the current availability and status of real devices. Filter by state, device name, or private devices only. Useful for finding available devices before starting a test.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      state: z
        .enum(['AVAILABLE', 'IN_USE', 'CLEANING', 'REBOOTING', 'MAINTENANCE', 'OFFLINE'])
        .optional()
        .describe('Filter by device state'),
      deviceName: z
        .string()
        .optional()
        .describe('Filter by device name (supports regex patterns, e.g. "iPhone.*")'),
      privateOnly: z.boolean().optional().describe('Only show private devices')
    })
  )
  .output(
    z.object({
      devices: z.array(deviceStatusSchema).describe('Devices matching the filter criteria'),
      totalCount: z.number().describe('Number of devices returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.listDeviceStatus({
      state: ctx.input.state,
      deviceName: ctx.input.deviceName,
      privateOnly: ctx.input.privateOnly
    });

    let devices = (result.devices ?? []).map((d: any) => ({
      descriptor: d.descriptor,
      deviceName: d.deviceName,
      state: d.state,
      isPrivateDevice: d.isPrivateDevice,
      inUseBy: d.inUseBy
    }));

    return {
      output: { devices, totalCount: devices.length },
      message: `Found **${devices.length}** devices${ctx.input.state ? ` with state **${ctx.input.state}**` : ''}.`
    };
  })
  .build();
