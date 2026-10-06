import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { ControlPlaneClient } from '../lib/client';
import { spec } from '../spec';

export let testEventDelivery = SlateTool.create(spec, {
  name: 'Test Event Delivery',
  key: 'test_event_delivery',
  description: `Test event transformation and delivery for a given source or source-destination setup without using the Live Events tab. Verifies that events are correctly transformed and delivered through the pipeline.`,
  constraints: [
    'User transformations can perform external requests. Router tests send to real destinations; source tests fan out to every connected destination.',
    'Destination request URLs, headers, parameters, bodies, files and raw downstream responses are concealed because they can contain credentials. Stage status and user transformation results remain available.'
  ],
  tags: {
    destructive: true,
    readOnly: false
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
          'user_transformation or dest_transformation (default) inspects payloads; router sends to real destinations. Source tests can fan out to every connected destination.'
        ),
      event: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Custom test event payload to use')
    })
  )
  .output(
    z.object({
      testResults: z.record(z.string(), z.unknown()).describe('Test results from RudderStack')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ControlPlaneClient({ token: ctx.auth.token, region: ctx.config.region });
    let { testType, sourceId, destinationId, stage, event } = ctx.input;
    if (!event)
      throw createApiServiceError('A test event with type and identity is required.');
    if (testType === 'destination' && !destinationId)
      throw createApiServiceError('Destination ID is required.');
    let testResults =
      testType === 'destination'
        ? await client.testDestination({
            destinationId: destinationId!,
            sourceId,
            stage,
            event
          })
        : await client.testSource({ sourceId, stage, event });
    return {
      output: { testResults },
      message:
        'Completed the selected verification stages. Inspect the results for stage errors; a completed request does not prove downstream delivery.'
    };
  })
  .build();
