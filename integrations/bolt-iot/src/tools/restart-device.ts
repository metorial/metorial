import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let restartDevice = SlateTool.create(spec, {
  name: 'Restart Device',
  key: 'restart_device',
  description: `Remotely restart a Bolt IoT device. The device will reboot and reconnect to the Bolt Cloud. Useful for recovering from errors or applying configuration changes.`,
  tags: {
    destructive: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      success: z.string().describe('Whether the restart was successful ("1" for success)'),
      message: z.string().describe('Response message from the device')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      deviceName: ctx.auth.deviceName
    });

    let response = await client.restart();

    return {
      output: {
        success: response.success,
        message: response.value
      },
      message: `Device **${ctx.auth.deviceName}** restart ${response.success === '1' ? 'initiated successfully' : 'failed'}.`
    };
  })
  .build();
