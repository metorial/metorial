import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { SesClient } from '../lib/client';
import { requireAwsSesArray, requireAwsSesString } from '../lib/errors';
import { spec } from '../spec';

let destinationCount = (input: {
  snsTopicArn?: string;
  eventBusArn?: string;
  cloudWatchDimensions?: unknown[];
  kinesisFirehoseDeliveryStreamArn?: string;
  kinesisFirehoseIamRoleArn?: string;
  pinpointApplicationArn?: string;
}) =>
  [
    input.snsTopicArn,
    input.eventBusArn,
    input.cloudWatchDimensions && input.cloudWatchDimensions.length > 0
      ? 'cloudwatch'
      : undefined,
    input.kinesisFirehoseDeliveryStreamArn || input.kinesisFirehoseIamRoleArn
      ? 'firehose'
      : undefined,
    input.pinpointApplicationArn
  ].filter(Boolean).length;

let validateEventDestinationMutation = (
  input: {
    eventDestinationName?: string;
    matchingEventTypes?: string[];
    snsTopicArn?: string;
    eventBusArn?: string;
    cloudWatchDimensions?: unknown[];
    kinesisFirehoseDeliveryStreamArn?: string;
    kinesisFirehoseIamRoleArn?: string;
    pinpointApplicationArn?: string;
  },
  action: string
) => {
  let eventDestinationName = requireAwsSesString(
    input.eventDestinationName,
    'eventDestinationName',
    action
  );
  let matchingEventTypes = requireAwsSesArray(
    input.matchingEventTypes,
    'matchingEventTypes',
    action
  );
  let destinations = destinationCount(input);

  if (destinations !== 1) {
    throw createApiServiceError(
      `Exactly one destination type is required for "${action}": snsTopicArn, eventBusArn, cloudWatchDimensions, kinesisFirehose*, or pinpointApplicationArn.`
    );
  }

  if (input.kinesisFirehoseDeliveryStreamArn || input.kinesisFirehoseIamRoleArn) {
    requireAwsSesString(
      input.kinesisFirehoseDeliveryStreamArn,
      'kinesisFirehoseDeliveryStreamArn',
      action
    );
    requireAwsSesString(input.kinesisFirehoseIamRoleArn, 'kinesisFirehoseIamRoleArn', action);
  }

  return { eventDestinationName, matchingEventTypes };
};

export let manageEventDestination = SlateTool.create(spec, {
  name: 'Manage Event Destination',
  key: 'manage_event_destination',
  description: `Create, update, list, or delete event destinations on an SES configuration set. Event destinations publish email sending events (sends, deliveries, bounces, complaints, opens, clicks, etc.) to SNS topics, CloudWatch, Kinesis Data Firehose, Pinpoint, or EventBridge for monitoring and alerting.`,
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
      action: z.enum(['create', 'update', 'list', 'delete']).describe('Operation to perform'),
      configurationSetName: z
        .string()
        .describe('Configuration set to manage event destinations for'),
      eventDestinationName: z
        .string()
        .optional()
        .describe('Event destination name (required for create/update/delete)'),
      matchingEventTypes: z
        .array(z.string())
        .optional()
        .describe('Event types to publish (required for create/update)'),
      enabled: z
        .boolean()
        .optional()
        .describe('Whether the event destination is enabled (for create/update)'),
      snsTopicArn: z.string().optional().describe('SNS topic ARN for SNS destination'),
      eventBusArn: z.string().optional().describe('EventBridge event bus ARN'),
      kinesisFirehoseDeliveryStreamArn: z
        .string()
        .optional()
        .describe('Kinesis Data Firehose delivery stream ARN'),
      kinesisFirehoseIamRoleArn: z
        .string()
        .optional()
        .describe('IAM role ARN that SES assumes for Kinesis Data Firehose delivery'),
      pinpointApplicationArn: z
        .string()
        .optional()
        .describe('Amazon Pinpoint application ARN'),
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
      eventDestinationName: z.string().optional().describe('Event destination name'),
      eventDestinations: z
        .array(
          z.object({
            name: z.string(),
            enabled: z.boolean(),
            matchingEventTypes: z.array(z.string()),
            snsDestination: z.object({ topicArn: z.string() }).optional(),
            cloudWatchDestination: z.any().optional(),
            eventBridgeDestination: z.object({ eventBusArn: z.string() }).optional(),
            kinesisFirehoseDestination: z
              .object({
                deliveryStreamArn: z.string(),
                iamRoleArn: z.string()
              })
              .optional(),
            pinpointDestination: z.object({ applicationArn: z.string() }).optional()
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
      let { eventDestinationName, matchingEventTypes } = validateEventDestinationMutation(
        ctx.input,
        action
      );
      await client.createConfigurationSetEventDestination({
        configurationSetName: ctx.input.configurationSetName,
        eventDestinationName,
        matchingEventTypes,
        enabled: ctx.input.enabled,
        snsDestination: ctx.input.snsTopicArn
          ? { topicArn: ctx.input.snsTopicArn }
          : undefined,
        eventBridgeDestination: ctx.input.eventBusArn
          ? { eventBusArn: ctx.input.eventBusArn }
          : undefined,
        kinesisFirehoseDestination:
          ctx.input.kinesisFirehoseDeliveryStreamArn && ctx.input.kinesisFirehoseIamRoleArn
            ? {
                deliveryStreamArn: ctx.input.kinesisFirehoseDeliveryStreamArn,
                iamRoleArn: ctx.input.kinesisFirehoseIamRoleArn
              }
            : undefined,
        pinpointDestination: ctx.input.pinpointApplicationArn
          ? { applicationArn: ctx.input.pinpointApplicationArn }
          : undefined,
        cloudWatchDestination: ctx.input.cloudWatchDimensions
          ? { dimensionConfigurations: ctx.input.cloudWatchDimensions }
          : undefined
      });
      return {
        output: { eventDestinationName },
        message: `Event destination **${eventDestinationName}** created on configuration set **${ctx.input.configurationSetName}**.`
      };
    }

    if (action === 'update') {
      let { eventDestinationName, matchingEventTypes } = validateEventDestinationMutation(
        ctx.input,
        action
      );
      await client.updateConfigurationSetEventDestination({
        configurationSetName: ctx.input.configurationSetName,
        eventDestinationName,
        matchingEventTypes,
        enabled: ctx.input.enabled,
        snsDestination: ctx.input.snsTopicArn
          ? { topicArn: ctx.input.snsTopicArn }
          : undefined,
        eventBridgeDestination: ctx.input.eventBusArn
          ? { eventBusArn: ctx.input.eventBusArn }
          : undefined,
        kinesisFirehoseDestination:
          ctx.input.kinesisFirehoseDeliveryStreamArn && ctx.input.kinesisFirehoseIamRoleArn
            ? {
                deliveryStreamArn: ctx.input.kinesisFirehoseDeliveryStreamArn,
                iamRoleArn: ctx.input.kinesisFirehoseIamRoleArn
              }
            : undefined,
        pinpointDestination: ctx.input.pinpointApplicationArn
          ? { applicationArn: ctx.input.pinpointApplicationArn }
          : undefined,
        cloudWatchDestination: ctx.input.cloudWatchDimensions
          ? { dimensionConfigurations: ctx.input.cloudWatchDimensions }
          : undefined
      });
      return {
        output: { eventDestinationName },
        message: `Event destination **${eventDestinationName}** updated on configuration set **${ctx.input.configurationSetName}**.`
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
      let eventDestinationName = requireAwsSesString(
        ctx.input.eventDestinationName,
        'eventDestinationName',
        action
      );
      await client.deleteConfigurationSetEventDestination(
        ctx.input.configurationSetName,
        eventDestinationName
      );
      return {
        output: { eventDestinationName },
        message: `Event destination **${eventDestinationName}** deleted from **${ctx.input.configurationSetName}**.`
      };
    }

    return { output: {}, message: 'No action performed.' };
  })
  .build();
