import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let checkStatus = SlateTool.create(spec, {
  name: 'Check Status',
  key: 'check_status',
  description: `Check if the Carbone API service is running and accessible. This endpoint does not require authentication.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      success: z.boolean().describe('Whether the Carbone service is running.'),
      message: z.string().describe('Status message from the Carbone API.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl,
      carboneVersion: ctx.config.carboneVersion
    });

    let result = await client.getStatus();

    return {
      output: result,
      message: result.success
        ? 'Carbone API is **running** and accessible.'
        : `Carbone API status: ${result.message}`
    };
  })
  .build();
