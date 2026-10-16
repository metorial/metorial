import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { rawResponse } from '../lib/schemas';
import { spec } from '../spec';

export let listDevices = SlateTool.create(spec, {
  name: 'List Devices',
  key: 'list_devices',
  description: `Retrieve all Bolt IoT devices associated with your account. Returns a list of devices with their names and online/offline status. Useful for discovering available devices before performing operations on them.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      raw: rawResponse,
      success: z.string().describe('Whether the request was successful ("1" for success)'),
      devices: z.array(z.any()).describe('List of devices associated with the account')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      deviceName: ctx.auth.deviceName
    });

    let response = await client.getDevices();

    let devices: unknown[];
    try {
      devices = Array.isArray(response)
        ? response
        : response.value
          ? JSON.parse(response.value)
          : [response];
    } catch (error) {
      throw createApiServiceError(
        'Bolt IoT returned a device list that could not be decoded.',
        {
          reason: 'invalid_response',
          parent: error
        }
      );
    }

    return {
      output: {
        raw: response,
        success: response.success ?? '1',
        devices
      },
      message: `Retrieved device list from Bolt Cloud.`
    };
  })
  .build();
