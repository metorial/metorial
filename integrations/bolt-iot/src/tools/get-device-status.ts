import { SlateTool } from 'slates';
import { z } from 'zod';
import { type BoltResponse, Client } from '../lib/client';
import { deviceName, rawResponse } from '../lib/schemas';
import { spec } from '../spec';

export let getDeviceStatus = SlateTool.create(spec, {
  name: 'Get Device Status',
  key: 'get_device_status',
  description: `Check whether a Bolt IoT device is online (alive) or offline (dead), and retrieve its firmware and hardware version information. Combines the status check and version query into a single tool for complete device health overview.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({ deviceName }))
  .output(
    z.object({
      raw: rawResponse,
      isOnline: z.boolean().describe('Whether the device is currently online'),
      statusValue: z.string().describe('Raw status value from the device ("alive" or "dead")'),
      firmwareVersion: z.string().optional().describe('Firmware version of the device'),
      hardwareVersion: z.string().optional().describe('Hardware/Bolt version of the device')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      deviceName: ctx.input.deviceName ?? ctx.auth.deviceName
    });

    let aliveResponse = await client.isAlive();
    let isOnline = aliveResponse.value === 'alive';

    let firmwareVersion: string | undefined;
    let hardwareVersion: string | undefined;
    let versionResponse: BoltResponse | undefined;

    if (isOnline) {
      try {
        versionResponse = await client.getVersion();
        if (versionResponse.success === '1') {
          let versionData = JSON.parse(versionResponse.value);
          firmwareVersion = versionData['Firmware Version'];
          hardwareVersion =
            versionData['Bolt Version'] ?? versionData['Bolt Hardware Version'];
        }
      } catch {
        ctx.warn('Could not retrieve version information');
      }
    }

    return {
      output: {
        raw: { status: aliveResponse, version: versionResponse },
        isOnline,
        statusValue: aliveResponse.value,
        firmwareVersion,
        hardwareVersion
      },
      message: `Device **${ctx.input.deviceName ?? ctx.auth.deviceName}** is **${isOnline ? 'online' : 'offline'}**.${firmwareVersion ? ` Firmware: ${firmwareVersion}` : ''}${hardwareVersion ? `, Hardware: ${hardwareVersion}` : ''}`
    };
  })
  .build();
