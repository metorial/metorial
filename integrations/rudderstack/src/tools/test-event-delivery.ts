import { SlateTool } from 'slates';
import { z } from 'zod';
import { ControlPlaneClient } from '../lib/client';
import { spec } from '../spec';

export let testEventDelivery = SlateTool.create(spec, {
  name: 'Test Event Delivery',
  key: 'test_event_delivery',
  description: `Test event transformation and delivery for a given source or source-destination setup without using the Live Events tab. Verifies that events are correctly transformed and delivered through the pipeline.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      testType: z
        .enum(['destination', 'source'])
        .describe('Whether to test a specific destination or entire source pipeline'),
      sourceId: z.string().describe('Source ID to test'),
      destinationId: z
        .string()
        .optional()
        .describe('Destination ID to test (required for destination test type)'),
      stage: z
        .string()
        .optional()
        .describe(
          'Pipeline stage to test (e.g., user_transformation, dest_transformation, router)'
        ),
      event: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom test event payload to use')
    })
  )
  .output(
    z.object({
      testResults: z.record(z.string(), z.any()).describe('Test results from RudderStack')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ControlPlaneClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let { testType, sourceId, destinationId, stage, event } = ctx.input;

    let result: any;

    if (testType === 'destination') {
      if (!destinationId) throw new Error('Destination ID is required for destination test.');
      result = await client.testDestination({ destinationId, sourceId, stage, event });
    } else {
      result = await client.testSource({ sourceId, stage, event });
    }

    return {
      output: { testResults: result },
      message: `Completed **${testType}** test for source \`${sourceId}\`${destinationId ? ` → destination \`${destinationId}\`` : ''}.`
    };
  })
  .build();
