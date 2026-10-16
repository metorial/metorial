import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listDevices = SlateTool.create(spec, {
  name: 'List Devices',
  key: 'list_devices',
  description: `Retrieve a page of devices registered to the Pushbullet account. Returns device details including nickname, manufacturer, model, and SMS capability. Useful for finding device identifiers to target pushes or send SMS messages.`,
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
        .describe('Only return non-deleted devices'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response'),
      limit: z.number().optional().describe('Maximum results per page, from 1 to 500'),
      modifiedAfter: z
        .string()
        .optional()
        .describe('Only return records modified after this Unix timestamp in seconds')
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
          modified: z.string().describe('Last modification Unix timestamp'),
          raw: z.unknown().optional().describe('Complete provider record')
        })
      ),
      cursor: z
        .string()
        .optional()
        .describe('Cursor for the next page, when more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listDevices({
      active: ctx.input.activeOnly,
      cursor: ctx.input.cursor,
      limit: ctx.input.limit,
      modifiedAfter: ctx.input.modifiedAfter
    });

    let devices = (result.devices ?? []).map(d => ({
      deviceIden: d.iden,
      active: d.active,
      nickname: d.nickname,
      manufacturer: d.manufacturer,
      model: d.model,
      icon: d.icon,
      hasSms: d.has_sms === undefined ? undefined : String(d.has_sms),
      appVersion: d.app_version,
      created: String(d.created),
      modified: String(d.modified),
      raw: d
    }));

    return {
      output: { devices, cursor: result.cursor },
      message: `Found **${devices.length}** device(s).`
    };
  })
  .build();
