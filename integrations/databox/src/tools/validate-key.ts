import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let validateKey = SlateTool.create(spec, {
  name: 'Validate API Key',
  key: 'validate_key',
  description: `Validates the current API key and confirms it is active. Use this as a health check to verify that your Databox connection is working before performing other operations.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      requestId: z.string().describe('Unique request identifier'),
      status: z.string().describe('Validation status (e.g. "success")')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.validateKey();

    return {
      output: {
        requestId: result.requestId,
        status: result.status
      },
      message: `API key validation **${result.status}**.`
    };
  })
  .build();
