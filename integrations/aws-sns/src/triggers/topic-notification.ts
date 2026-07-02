import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { SnsClient } from '../lib/client';
import { spec } from '../spec';

export let topicNotification = SlateTrigger.create(spec, {
  name: 'Topic Notification',
  key: 'topic_notification',
  description:
    'Receives notifications from SNS topic HTTP/HTTPS subscriptions. Handles subscription confirmation automatically and processes incoming messages, including notification and unsubscribe confirmation events.'
})
  .input(
    z.object({
      notificationType: z
        .enum(['Notification', 'SubscriptionConfirmation', 'UnsubscribeConfirmation'])
        .describe('Type of SNS message'),
      messageId: z.string().describe('Unique SNS message identifier'),
      topicArn: z.string().describe('ARN of the topic that sent the notification'),
      subject: z.string().optional().describe('Subject of the notification (if provided)'),
      message: z.string().describe('The notification message content'),
      timestamp: z.string().describe('ISO 8601 timestamp of when the message was published'),
      subscribeUrl: z
        .string()
        .optional()
        .describe('URL to confirm subscription (for confirmation messages)'),
      unsubscribeUrl: z.string().optional().describe('URL to unsubscribe from the topic')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('Unique SNS message identifier'),
      topicArn: z.string().describe('ARN of the source topic'),
      topicName: z.string().describe('Name extracted from the topic ARN'),
      subject: z.string().optional().describe('Message subject if provided'),
      message: z.string().describe('The notification message content'),
      timestamp: z.string().describe('ISO 8601 timestamp of when the message was published'),
      unsubscribeUrl: z.string().optional().describe('URL to unsubscribe from the topic')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let _client = new SnsClient({
        accessKeyId: ctx.auth.accessKeyId,
        secretAccessKey: ctx.auth.secretAccessKey,
        sessionToken: ctx.auth.sessionToken,
        region: ctx.config.region
      });

      // The webhook URL is provided by the platform
      // Users need to subscribe this URL to their SNS topic
      // We don't auto-subscribe since we don't know which topic the user wants
      return {
        registrationDetails: {
          webhookUrl: ctx.input.webhookBaseUrl
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      // If we have a subscription ARN stored, unsubscribe it
      let registrationDetails = ctx.input.registrationDetails as { subscriptionArn?: string };
      if (registrationDetails?.subscriptionArn) {
        let client = new SnsClient({
          accessKeyId: ctx.auth.accessKeyId,
          secretAccessKey: ctx.auth.secretAccessKey,
          sessionToken: ctx.auth.sessionToken,
          region: ctx.config.region
        });
        await client.unsubscribe(registrationDetails.subscriptionArn);
      }
    },

    handleRequest: async ctx => {
      let contentType = ctx.request.headers.get('content-type') || '';
      let snsMessageType = ctx.request.headers.get('x-amz-sns-message-type') || '';

      let body: any;
      if (contentType.includes('application/json')) {
        body = await ctx.request.json();
      } else {
        let text = await ctx.request.text();
        try {
          body = JSON.parse(text);
        } catch {
          body = { Message: text };
        }
      }

      // Handle subscription confirmation automatically
      if (
        snsMessageType === 'SubscriptionConfirmation' ||
        body.Type === 'SubscriptionConfirmation'
      ) {
        if (body.SubscribeURL) {
          let client = new SnsClient({
            accessKeyId: ctx.auth.accessKeyId,
            secretAccessKey: ctx.auth.secretAccessKey,
            sessionToken: ctx.auth.sessionToken,
            region: ctx.config.region
          });

          // Confirm the subscription by calling the SubscribeURL
          await client.confirmSubscription(body.TopicArn, body.Token);
        }

        return {
          inputs: [
            {
              notificationType: 'SubscriptionConfirmation' as const,
              messageId: body.MessageId || '',
              topicArn: body.TopicArn || '',
              message: body.Message || 'Subscription confirmed',
              timestamp: body.Timestamp || new Date().toISOString(),
              subscribeUrl: body.SubscribeURL
            }
          ]
        };
      }

      // Handle unsubscribe confirmation
      if (
        snsMessageType === 'UnsubscribeConfirmation' ||
        body.Type === 'UnsubscribeConfirmation'
      ) {
        return {
          inputs: [
            {
              notificationType: 'UnsubscribeConfirmation' as const,
              messageId: body.MessageId || '',
              topicArn: body.TopicArn || '',
              message: body.Message || 'Unsubscribe confirmed',
              timestamp: body.Timestamp || new Date().toISOString()
            }
          ]
        };
      }

      // Handle notification
      return {
        inputs: [
          {
            notificationType: 'Notification' as const,
            messageId: body.MessageId || '',
            topicArn: body.TopicArn || '',
            subject: body.Subject || undefined,
            message: body.Message || '',
            timestamp: body.Timestamp || new Date().toISOString(),
            unsubscribeUrl: body.UnsubscribeURL || undefined
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let topicName = ctx.input.topicArn.split(':').pop() || ctx.input.topicArn;

      let eventType: string;
      switch (ctx.input.notificationType) {
        case 'SubscriptionConfirmation':
          eventType = 'topic.subscription_confirmed';
          break;
        case 'UnsubscribeConfirmation':
          eventType = 'topic.unsubscribe_confirmed';
          break;
        default:
          eventType = 'topic.notification';
      }

      return {
        type: eventType,
        id: ctx.input.messageId,
        output: {
          messageId: ctx.input.messageId,
          topicArn: ctx.input.topicArn,
          topicName,
          subject: ctx.input.subject,
          message: ctx.input.message,
          timestamp: ctx.input.timestamp,
          unsubscribeUrl: ctx.input.unsubscribeUrl
        }
      };
    }
  })
  .build();
