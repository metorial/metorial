import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let checkStatus = SlateTool.create(spec, {
  name: 'Check API Status',
  key: 'check_status',
  description:
    'Retrieve TPSCheck API health and its current API version from the public status endpoint. This request does not send your API key.',
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      status: z.string().describe('API health status reported by TPSCheck'),
      version: z.string().describe('Current API version reported by TPSCheck')
    })
  )
  .handleInvocation(async () => {
    let result = await new Client().getStatus();

    return {
      output: {
        status: result.status,
        version: result.version
      },
      message: `TPSCheck API status: **${result.status}**. API version: **${result.version}**.`
    };
  })
  .build();
