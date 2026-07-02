import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listDevices = SlateTool.create(spec, {
  name: 'List Devices',
  key: 'list_devices',
  description: `Retrieve all devices registered to the Pushbullet account. Returns device details including nickname, manufacturer, model, and SMS capability. Useful for finding device identifiers to target pushes or send SMS messages.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      activeOnly: z
        .boolean()
        .optional()
        .default(true)
        .describe('Only return non-deleted devices')
    })
  )
  .output(
    z.object({
      devices: z.array(
        z.object({
          deviceIden: z.string().describe('Unique identifier of the device'),
          active: z.boolean().describe('Whether the device is active'),
          nickname: z.string().optional().describe('Display name of the device'),
          manufacturer: z.string().optional().describe('Device manufacturer'),
          model: z.string().optional().describe('Device model'),
          icon: z.string().optional().describe('Icon type (desktop, browser, phone, etc.)'),
          hasSms: z.string().optional().describe('Whether the device supports SMS'),
          appVersion: z.number().optional().describe('App version number'),
          created: z.string().describe('Creation Unix timestamp'),
          modified: z.string().describe('Last modification Unix timestamp')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listDevices({
      active: ctx.input.activeOnly
    });

    let devices = result.devices.map(d => ({
      deviceIden: d.iden,
      active: d.active,
      nickname: d.nickname,
      manufacturer: d.manufacturer,
      model: d.model,
      icon: d.icon,
      hasSms: d.has_sms,
      appVersion: d.app_version,
      created: String(d.created),
      modified: String(d.modified)
    }));

    return {
      output: { devices },
      message: `Found **${devices.length}** device(s).`
    };
  })
  .build();
