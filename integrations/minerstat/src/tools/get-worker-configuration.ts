import { SlateTool } from 'slates';
import { z } from 'zod';
import { ManagementClient } from '../lib/client';
import { spec } from '../spec';

export let getWorkerConfigurationTool = SlateTool.create(spec, {
  name: 'Get Worker Configuration',
  key: 'get_worker_configuration',
  description:
    'Read worker configuration and system details through the management API. Optionally filter by worker name, group, or customer. Use list_workers for real-time monitoring data and manage_customers to discover customer IDs.',
  constraints: ['Requires the management API bearer token.'],
  tags: { readOnly: true }
})
  .input(
    z.object({
      workerName: z.string().optional().describe('Worker name from list_workers'),
      groupName: z.string().optional().describe('Worker group name from list_workers'),
      customerId: z
        .number()
        .optional()
        .describe('Customer ID from manage_customers with action list')
    })
  )
  .output(z.object({ response: z.any().describe('Original worker configuration response') }))
  .handleInvocation(async ctx => {
    let client = new ManagementClient({ token: ctx.auth.token });
    let response = await client.getWorker({
      name: ctx.input.workerName,
      group: ctx.input.groupName,
      user: ctx.input.customerId
    });
    return {
      output: { response },
      message: 'Retrieved worker configuration.'
    };
  })
  .build();
