import {
  CreateTopicCommand,
  DeleteTopicCommand,
  GetTopicAttributesCommand,
  ListSubscriptionsByTopicCommand,
  ListTopicsCommand,
  PublishCommand,
  SetTopicAttributesCommand,
  SubscribeCommand,
  UnsubscribeCommand
} from '@aws-sdk/client-sns';
import { SlateTool } from 'slates';
import { z } from 'zod';
import { awsServiceError } from '../lib/errors';
import { clientFromContext } from '../lib/helpers';
import { spec } from '../spec';

let topicSchema = z.object({
  topicArn: z.string().describe('ARN of the SNS topic')
});

let subscriptionSchema = z.object({
  subscriptionArn: z.string().describe('ARN of the subscription'),
  topicArn: z.string().describe('ARN of the topic the subscription belongs to'),
  protocol: z.string().describe('Delivery protocol (email, sqs, lambda, http, https, etc.)'),
  endpoint: z.string().describe('Endpoint receiving notifications'),
  owner: z.string().describe('AWS account ID of the subscription owner')
});

let topicAttributesSchema = z
  .record(z.string(), z.string())
  .describe('SNS topic attributes as key-value pairs');

export let manageSnsTool = SlateTool.create(spec, {
  name: 'Manage SNS',
  key: 'manage_sns',
  description: `Manage AWS SNS (Simple Notification Service) topics and subscriptions. Supports listing topics, creating and deleting topics, getting and setting topic attributes, publishing messages, listing subscriptions for a topic, subscribing endpoints (email, SQS, Lambda, HTTP/HTTPS), and unsubscribing. Set the **operation** field to choose the action.`,
  instructions: [
    'Set "operation" to one of: "list_topics", "create_topic", "delete_topic", "get_topic_attributes", "set_topic_attribute", "publish", "list_subscriptions", "subscribe", or "unsubscribe".',
    'For "list_topics": optionally provide "nextToken" for pagination.',
    'For "create_topic": provide "name" and optionally "tags".',
    'For "delete_topic": provide "topicArn". This also removes all subscriptions.',
    'For "get_topic_attributes": provide "topicArn".',
    'For "set_topic_attribute": provide "topicArn", "attributeName", and "attributeValue".',
    'For "publish": provide "topicArn" and "message". Optionally provide "subject" for email subscribers.',
    'For "list_subscriptions": provide "topicArn" and optionally "nextToken".',
    'For "subscribe": provide "topicArn", "protocol", and "endpoint". HTTP/S and email subscriptions require confirmation by the endpoint owner.',
    'For "unsubscribe": provide "subscriptionArn".'
  ]
})
  .input(
    z.object({
      operation: z
        .enum([
          'list_topics',
          'create_topic',
          'delete_topic',
          'get_topic_attributes',
          'set_topic_attribute',
          'publish',
          'list_subscriptions',
          'subscribe',
          'unsubscribe'
        ])
        .describe('The SNS operation to perform'),
      topicArn: z
        .string()
        .optional()
        .describe(
          'ARN of the SNS topic (required for delete_topic, publish, list_subscriptions, subscribe)'
        ),
      nextToken: z
        .string()
        .optional()
        .describe(
          'Pagination token from a previous request (for list_topics and list_subscriptions)'
        ),
      name: z
        .string()
        .optional()
        .describe(
          'Name for the new topic (required for create_topic). FIFO topic names must end with .fifo'
        ),
      tags: z
        .array(
          z.object({
            key: z.string().describe('Tag key'),
            value: z.string().describe('Tag value')
          })
        )
        .optional()
        .describe('Tags to attach to the topic (for create_topic)'),
      message: z
        .string()
        .optional()
        .describe('Message body to publish (required for publish). Max 256 KB'),
      subject: z
        .string()
        .optional()
        .describe('Subject line for email subscribers (for publish, max 100 characters)'),
      attributeName: z
        .string()
        .optional()
        .describe(
          'SNS topic attribute name to set, e.g. DisplayName, Policy, DeliveryPolicy, TracingConfig, KmsMasterKeyId'
        ),
      attributeValue: z
        .string()
        .optional()
        .describe('New attribute value for set_topic_attribute'),
      protocol: z
        .enum([
          'email',
          'email-json',
          'sqs',
          'lambda',
          'http',
          'https',
          'sms',
          'application',
          'firehose'
        ])
        .optional()
        .describe('Delivery protocol for the subscription (required for subscribe)'),
      endpoint: z
        .string()
        .optional()
        .describe(
          'Endpoint to receive notifications: email address, SQS ARN, Lambda ARN, HTTP/S URL, phone number, etc. (required for subscribe)'
        ),
      subscriptionArn: z
        .string()
        .optional()
        .describe('ARN of the subscription to remove (required for unsubscribe)')
    })
  )
  .output(
    z.object({
      operation: z.string().describe('The operation that was performed'),
      topics: z.array(topicSchema).optional().describe('List of SNS topics (for list_topics)'),
      nextToken: z
        .string()
        .optional()
        .describe('Pagination token for the next page of results'),
      topicArn: z.string().optional().describe('ARN of the created or affected topic'),
      deleted: z
        .boolean()
        .optional()
        .describe('Whether the topic was successfully deleted (for delete_topic)'),
      messageId: z
        .string()
        .optional()
        .describe('Unique identifier of the published message (for publish)'),
      attributes: topicAttributesSchema
        .optional()
        .describe('Topic attributes returned by get_topic_attributes or set_topic_attribute'),
      updated: z.boolean().optional().describe('Whether a topic attribute was updated'),
      subscriptions: z
        .array(subscriptionSchema)
        .optional()
        .describe('List of subscriptions (for list_subscriptions)'),
      subscriptionArn: z
        .string()
        .optional()
        .describe(
          'ARN of the subscription, or "pending confirmation" if confirmation is required (for subscribe)'
        ),
      unsubscribed: z
        .boolean()
        .optional()
        .describe('Whether the unsubscription was successful (for unsubscribe)')
    })
  )
  .handleInvocation(async ctx => {
    let client = clientFromContext(ctx);
    let { operation } = ctx.input;

    if (operation === 'list_topics') {
      let response = await client.send('SNS ListTopics', () =>
        client.sns.send(new ListTopicsCommand({ NextToken: ctx.input.nextToken }))
      );
      let topics = (response.Topics ?? [])
        .map(topic => (topic.TopicArn ? { topicArn: topic.TopicArn } : null))
        .filter((topic): topic is { topicArn: string } => topic !== null);

      return {
        output: {
          operation: 'list_topics',
          topics,
          nextToken: response.NextToken
        },
        message: `Found **${topics.length}** SNS topic(s)${response.NextToken ? ' (more available)' : ''}.`
      };
    }

    if (operation === 'create_topic') {
      if (!ctx.input.name) throw awsServiceError('"name" is required for create_topic.');

      let response = await client.send('SNS CreateTopic', () =>
        client.sns.send(
          new CreateTopicCommand({
            Name: ctx.input.name,
            Tags: ctx.input.tags?.map(tag => ({ Key: tag.key, Value: tag.value }))
          })
        )
      );
      let topicArn = response.TopicArn ?? '';

      return {
        output: {
          operation: 'create_topic',
          topicArn
        },
        message: `Created topic **${ctx.input.name}** with ARN \`${topicArn}\`.`
      };
    }

    if (operation === 'delete_topic') {
      if (!ctx.input.topicArn)
        throw awsServiceError('"topicArn" is required for delete_topic.');

      await client.send('SNS DeleteTopic', () =>
        client.sns.send(new DeleteTopicCommand({ TopicArn: ctx.input.topicArn }))
      );

      return {
        output: {
          operation: 'delete_topic',
          topicArn: ctx.input.topicArn,
          deleted: true
        },
        message: `Deleted topic \`${ctx.input.topicArn}\` and all its subscriptions.`
      };
    }

    if (operation === 'get_topic_attributes') {
      if (!ctx.input.topicArn)
        throw awsServiceError('"topicArn" is required for get_topic_attributes.');

      let response = await client.send('SNS GetTopicAttributes', () =>
        client.sns.send(new GetTopicAttributesCommand({ TopicArn: ctx.input.topicArn }))
      );
      let attributes = response.Attributes ?? {};

      return {
        output: {
          operation: 'get_topic_attributes',
          topicArn: ctx.input.topicArn,
          attributes
        },
        message: `Retrieved **${Object.keys(attributes).length}** attribute(s) for topic \`${ctx.input.topicArn}\`.`
      };
    }

    if (operation === 'set_topic_attribute') {
      if (!ctx.input.topicArn)
        throw awsServiceError('"topicArn" is required for set_topic_attribute.');
      if (!ctx.input.attributeName)
        throw awsServiceError('"attributeName" is required for set_topic_attribute.');
      if (ctx.input.attributeValue === undefined)
        throw awsServiceError('"attributeValue" is required for set_topic_attribute.');

      await client.send('SNS SetTopicAttributes', () =>
        client.sns.send(
          new SetTopicAttributesCommand({
            TopicArn: ctx.input.topicArn,
            AttributeName: ctx.input.attributeName,
            AttributeValue: ctx.input.attributeValue
          })
        )
      );

      return {
        output: {
          operation: 'set_topic_attribute',
          topicArn: ctx.input.topicArn,
          attributes: {
            [ctx.input.attributeName]: ctx.input.attributeValue
          },
          updated: true
        },
        message: `Updated SNS topic attribute **${ctx.input.attributeName}**.`
      };
    }

    if (operation === 'publish') {
      if (!ctx.input.topicArn) throw awsServiceError('"topicArn" is required for publish.');
      if (!ctx.input.message) throw awsServiceError('"message" is required for publish.');

      let response = await client.send('SNS Publish', () =>
        client.sns.send(
          new PublishCommand({
            TopicArn: ctx.input.topicArn,
            Message: ctx.input.message,
            Subject: ctx.input.subject
          })
        )
      );

      return {
        output: {
          operation: 'publish',
          messageId: response.MessageId ?? '',
          topicArn: ctx.input.topicArn
        },
        message: `Published message \`${response.MessageId ?? ''}\` to topic \`${ctx.input.topicArn}\`.`
      };
    }

    if (operation === 'list_subscriptions') {
      if (!ctx.input.topicArn)
        throw awsServiceError('"topicArn" is required for list_subscriptions.');

      let response = await client.send('SNS ListSubscriptionsByTopic', () =>
        client.sns.send(
          new ListSubscriptionsByTopicCommand({
            TopicArn: ctx.input.topicArn,
            NextToken: ctx.input.nextToken
          })
        )
      );
      let subscriptions = (response.Subscriptions ?? [])
        .map(subscription => {
          if (
            !subscription.SubscriptionArn ||
            !subscription.TopicArn ||
            !subscription.Protocol ||
            !subscription.Endpoint ||
            !subscription.Owner
          ) {
            return null;
          }

          return {
            subscriptionArn: subscription.SubscriptionArn,
            topicArn: subscription.TopicArn,
            protocol: subscription.Protocol,
            endpoint: subscription.Endpoint,
            owner: subscription.Owner
          };
        })
        .filter(
          (
            subscription
          ): subscription is {
            subscriptionArn: string;
            topicArn: string;
            protocol: string;
            endpoint: string;
            owner: string;
          } => subscription !== null
        );

      return {
        output: {
          operation: 'list_subscriptions',
          subscriptions,
          nextToken: response.NextToken
        },
        message: `Found **${subscriptions.length}** subscription(s) for topic \`${ctx.input.topicArn}\`${response.NextToken ? ' (more available)' : ''}.`
      };
    }

    if (operation === 'subscribe') {
      if (!ctx.input.topicArn) throw awsServiceError('"topicArn" is required for subscribe.');
      if (!ctx.input.protocol) throw awsServiceError('"protocol" is required for subscribe.');
      if (!ctx.input.endpoint) throw awsServiceError('"endpoint" is required for subscribe.');

      let response = await client.send('SNS Subscribe', () =>
        client.sns.send(
          new SubscribeCommand({
            TopicArn: ctx.input.topicArn,
            Protocol: ctx.input.protocol,
            Endpoint: ctx.input.endpoint
          })
        )
      );
      let subscriptionArn = response.SubscriptionArn ?? 'pending confirmation';
      let isPending =
        subscriptionArn === 'pending confirmation' ||
        subscriptionArn === 'PendingConfirmation';

      return {
        output: {
          operation: 'subscribe',
          subscriptionArn,
          topicArn: ctx.input.topicArn
        },
        message: isPending
          ? `Subscription to \`${ctx.input.topicArn}\` via **${ctx.input.protocol}** is pending confirmation at \`${ctx.input.endpoint}\`.`
          : `Subscribed \`${ctx.input.endpoint}\` to \`${ctx.input.topicArn}\` via **${ctx.input.protocol}** -- ARN: \`${subscriptionArn}\`.`
      };
    }

    if (operation === 'unsubscribe') {
      if (!ctx.input.subscriptionArn)
        throw awsServiceError('"subscriptionArn" is required for unsubscribe.');

      await client.send('SNS Unsubscribe', () =>
        client.sns.send(new UnsubscribeCommand({ SubscriptionArn: ctx.input.subscriptionArn }))
      );

      return {
        output: {
          operation: 'unsubscribe',
          unsubscribed: true
        },
        message: `Unsubscribed \`${ctx.input.subscriptionArn}\`.`
      };
    }

    throw awsServiceError(
      `Unknown operation: "${operation}". Expected one of: list_topics, create_topic, delete_topic, get_topic_attributes, set_topic_attribute, publish, list_subscriptions, subscribe, unsubscribe.`
    );
  })
  .build();
