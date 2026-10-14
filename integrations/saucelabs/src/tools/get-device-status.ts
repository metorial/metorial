import { createApiServiceError, SlateTool } from 'slates';
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
    let namePattern: RegExp | undefined;
    if (ctx.input.deviceName !== undefined) {
      try {
        namePattern = new RegExp(ctx.input.deviceName);
      } catch {
        throw createApiServiceError('deviceName must be a valid regular expression.');
      }
    }
    let result = await client.listDeviceStatus();
    let deviceNames = new Map<string, string>();
    if (namePattern) {
      let catalog = await client.listDevices();
      for (let device of Array.isArray(catalog) ? catalog : []) {
        deviceNames.set(device.id, device.name);
      }
    }
    let devices = (result.devices ?? [])
      .map((d: any) => ({
        descriptor: d.descriptor ?? undefined,
        deviceName: d.deviceName ?? deviceNames.get(d.descriptor),
        state: d.state ?? undefined,
        isPrivateDevice: d.isPrivateDevice ?? undefined,
        inUseBy: Array.isArray(d.inUseBy)
          ? d.inUseBy
              .map((user: { username?: string }) => user.username)
              .filter(Boolean)
              .join(', ') || null
          : (d.inUseBy ?? undefined)
      }))
      .filter(
        (device: z.infer<typeof deviceStatusSchema>) =>
          (ctx.input.state === undefined || device.state === ctx.input.state) &&
          (ctx.input.privateOnly !== true || device.isPrivateDevice === true) &&
          (!namePattern || namePattern.test(device.deviceName ?? device.descriptor ?? ''))
      );

    return {
      output: { devices, totalCount: devices.length },
      message: `Found **${devices.length}** devices${ctx.input.state ? ` with state **${ctx.input.state}**` : ''}.`
    };
  })
  .build();
