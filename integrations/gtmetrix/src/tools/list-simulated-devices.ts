import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSimulatedDevices = SlateTool.create(spec, {
  name: 'List Simulated Devices',
  key: 'list_simulated_devices',
  description:
    'Lists GTmetrix simulated-device presets with IDs, viewport dimensions, pixel ratios, and user agents. Pass a device ID to run_test as simulateDevice.',
  constraints: [
    'Running a test with a simulated device requires access to PRO analysis options.'
  ],
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      devices: z.array(
        z.object({
          deviceId: z.string(),
          name: z.string(),
          manufacturer: z.string(),
          category: z.string(),
          width: z.number(),
          height: z.number(),
          dppx: z.number(),
          userAgent: z.string()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let devices = await new Client({ token: ctx.auth.token }).listSimulatedDevices();
    return {
      output: { devices },
      message: `Found **${devices.length}** simulated-device preset(s).`
    };
  })
  .build();
