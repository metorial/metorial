import { SlateTool } from 'slates';
import { z } from 'zod';
import { SesClient } from '../lib/client';
import { spec } from '../spec';

export let manageEventDestination = SlateTool.create(spec, {
  name: 'Manage Event Destination',
  key: 'manage_event_destination',
  description: `Create, list, or delete event destinations on an SES configuration set. Event destinations publish email sending events (sends, deliveries, bounces, complaints, opens, clicks, etc.) to SNS topics, CloudWatch, or EventBridge for monitoring and alerting.`,
  instructions: [
    'Valid event types: SEND, DELIVERY, BOUNCE, COMPLAINT, REJECT, DELIVERY_DELAY, OPEN, CLICK, RENDERING_FAILURE, SUBSCRIPTION.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'list', 'delete']).describe('Operation to perform'),
      configurationSetName: z
        .string()
        .describe('Configuration set to manage event destinations for'),
      eventDestinationName: z
        .string()
        .optional()
        .describe('Event destination name (required for create/delete)'),
      matchingEventTypes: z
        .array(z.string())
        .optional()
        .describe('Event types to publish (required for create)'),
      snsTopicArn: z.string().optional().describe('SNS topic ARN for SNS destination'),
      eventBusArn: z.string().optional().describe('EventBridge event bus ARN'),
      cloudWatchDimensions: z
        .array(
          z.object({
            dimensionName: z.string(),
            dimensionValueSource: z.enum(['MESSAGE_TAG', 'EMAIL_HEADER', 'LINK_TAG']),
            defaultDimensionValue: z.string()
          })
        )
        .optional()
        .describe('CloudWatch dimension configurations')
    })
  )
  .output(
    z.object({
      eventDestinations: z
        .array(
          z.object({
            name: z.string(),
            enabled: z.boolean(),
            matchingEventTypes: z.array(z.string()),
            snsDestination: z.object({ topicArn: z.string() }).optional(),
            eventBridgeDestination: z.object({ eventBusArn: z.string() }).optional()
          })
        )
        .optional()
        .describe('List of event destinations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SesClient({
      accessKeyId: ctx.auth.accessKeyId,
      secretAccessKey: ctx.auth.secretAccessKey,
      sessionToken: ctx.auth.sessionToken,
      region: ctx.config.region
    });

    let { action } = ctx.input;

    if (action === 'create') {
      await client.createConfigurationSetEventDestination({
        configurationSetName: ctx.input.configurationSetName,
        eventDestinationName: ctx.input.eventDestinationName!,
        matchingEventTypes: ctx.input.matchingEventTypes!,
        snsDestination: ctx.input.snsTopicArn
          ? { topicArn: ctx.input.snsTopicArn }
          : undefined,
        eventBridgeDestination: ctx.input.eventBusArn
          ? { eventBusArn: ctx.input.eventBusArn }
          : undefined,
        cloudWatchDestination: ctx.input.cloudWatchDimensions
          ? { dimensionConfigurations: ctx.input.cloudWatchDimensions }
          : undefined
      });
      return {
        output: {},
        message: `Event destination **${ctx.input.eventDestinationName}** created on configuration set **${ctx.input.configurationSetName}**.`
      };
    }

    if (action === 'list') {
      let result = await client.getConfigurationSetEventDestinations(
        ctx.input.configurationSetName
      );
      return {
        output: { eventDestinations: result.eventDestinations },
        message: `Found **${result.eventDestinations.length}** event destination(s) on **${ctx.input.configurationSetName}**.`
      };
    }

    if (action === 'delete') {
      await client.deleteConfigurationSetEventDestination(
        ctx.input.configurationSetName,
        ctx.input.eventDestinationName!
      );
      return {
        output: {},
        message: `Event destination **${ctx.input.eventDestinationName}** deleted from **${ctx.input.configurationSetName}**.`
      };
    }

    return { output: {}, message: 'No action performed.' };
  })
  .build();
