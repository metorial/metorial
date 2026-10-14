import { SlateTool } from 'slates';
import { z } from 'zod';
import { deviceSchema, mapDevice } from '../lib/devices';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getDevice = SlateTool.create(spec, {
  name: 'Get Real Device Details',
  key: 'get_device',
  description:
    'Retrieve specifications and automation capabilities for one real device. Use list_devices to discover a device ID.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      deviceId: z.string().min(1).describe('Device ID returned by list_devices')
    })
  )
  .output(
    deviceSchema.extend({
      modelNumber: z.string().optional().describe('Device model number'),
      isTablet: z.boolean().optional().describe('Whether this is a tablet'),
      resolutionWidth: z.number().optional().describe('Screen width in pixels'),
      resolutionHeight: z.number().optional().describe('Screen height in pixels'),
      supportsAppiumWebAppTesting: z
        .boolean()
        .optional()
        .describe('Whether Appium web app testing is supported'),
      supportsXcuiTest: z.boolean().optional().describe('Whether XCUITest is supported')
    })
  )
  .handleInvocation(async ctx => {
    let device = await createClient(ctx).getDevice(ctx.input.deviceId);
    return {
      output: {
        ...mapDevice(device),
        modelNumber: device.modelNumber ?? undefined,
        isTablet: device.isTablet ?? undefined,
        resolutionWidth: device.resolutionWidth ?? undefined,
        resolutionHeight: device.resolutionHeight ?? undefined,
        supportsAppiumWebAppTesting: device.supportsAppiumWebAppTesting ?? undefined,
        supportsXcuiTest: device.supportsXcuiTest ?? undefined
      },
      message: `Device **${device.name}** (${device.id}).`
    };
  })
  .build();
