import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getPlatformStatus = SlateTool.create(spec, {
  name: 'Get Platform Status',
  key: 'get_platform_status',
  description: `Check if the Sauce Labs platform is operational. Returns the current service status and average wait time for test sessions.`,
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      serviceOperational: z.boolean().describe('Whether the platform is operational'),
      statusMessage: z.string().describe('Human-readable status message'),
      waitTime: z
        .number()
        .optional()
        .describe('Average wait time in seconds for a test session')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.getPlatformStatus();

    return {
      output: {
        serviceOperational: result.service_operational,
        statusMessage: result.status_message,
        waitTime: result.wait_time
      },
      message: result.service_operational
        ? `Sauce Labs is **operational**. Average wait time: ${result.wait_time ?? 'N/A'}s.`
        : `Sauce Labs is **experiencing issues**: ${result.status_message}`
    };
  })
  .build();
