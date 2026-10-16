import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { deviceName, rawResponse } from '../lib/schemas';
import { spec } from '../spec';

export let getDeviceVersion = SlateTool.create(spec, {
  name: 'Get Device Version',
  key: 'get_device_version',
  description:
    'Query a Bolt device for its hardware and firmware version without first making a status request. Returns the complete version response.',
  tags: { readOnly: true }
})
  .input(z.object({ deviceName }))
  .output(
    z.object({
      success: z.string().describe('Provider request success indicator.'),
      resultValue: z.string().describe('Unmodified version response value.'),
      raw: rawResponse
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      deviceName: ctx.input.deviceName ?? ctx.auth.deviceName
    });
    let response = await client.getVersion();

    return {
      output: {
        success: response.success,
        resultValue: response.value,
        raw: response
      },
      message: 'Retrieved the device version response.'
    };
  })
  .build();
