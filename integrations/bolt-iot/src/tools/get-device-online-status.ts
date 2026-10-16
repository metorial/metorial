import { isApiErrorRecord, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { deviceName, rawResponse } from '../lib/schemas';
import { spec } from '../spec';

export let getDeviceOnlineStatus = SlateTool.create(spec, {
  name: 'Get Device Online Status',
  key: 'get_device_online_status',
  description:
    'Retrieve the online/offline status recorded by Bolt Cloud and the provider timestamp when that status changed. Use get_device_status for the separate alive/dead status query.',
  tags: { readOnly: true }
})
  .input(z.object({ deviceName }))
  .output(
    z.object({
      success: z.unknown().optional().describe('Provider request success indicator.'),
      isOnline: z.boolean().optional().describe('Whether the reported status is online.'),
      statusValue: z.unknown().optional().describe('Unmodified provider status value.'),
      statusChangedAt: z
        .unknown()
        .optional()
        .describe('Unmodified provider time when the reported status changed.'),
      raw: rawResponse
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      deviceName: ctx.input.deviceName ?? ctx.auth.deviceName
    });
    let response = await client.isOnline();
    let record = isApiErrorRecord(response) ? response : undefined;
    let value = record?.value;
    let isOnline =
      typeof value === 'boolean'
        ? value
        : value === 'online'
          ? true
          : value === 'offline'
            ? false
            : undefined;

    return {
      output: {
        success: record?.success,
        isOnline,
        statusValue: value,
        statusChangedAt: record?.time,
        raw: response
      },
      message: 'Retrieved the status recorded by Bolt Cloud.'
    };
  })
  .build();
