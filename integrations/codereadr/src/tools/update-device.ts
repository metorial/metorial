import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateDevice = SlateTool.create(spec, {
  name: 'Update Device',
  key: 'update_device',
  description: `Rename a device registered to your CodeREADr account.`
})
  .input(
    z.object({
      deviceId: z.string().describe('ID of the device to rename'),
      deviceName: z.string().describe('New name for the device')
    })
  )
  .output(
    z.object({
      deviceId: z.string().describe('ID of the updated device')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    await client.updateDevice(ctx.input.deviceId, ctx.input.deviceName);

    return {
      output: { deviceId: ctx.input.deviceId },
      message: `Renamed device **${ctx.input.deviceId}** to **${ctx.input.deviceName}**.`
    };
  })
  .build();
