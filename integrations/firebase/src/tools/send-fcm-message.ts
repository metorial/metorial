import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { MessagingClient } from '../lib/client';
import { firebaseServiceError } from '../lib/errors';
import { firebaseActionScopes } from '../scopes';
import { spec } from '../spec';

export let sendFcmMessage = SlateTool.create(spec, {
  name: 'Send Push Notification',
  key: 'send_fcm_message',
  description: `Send a push notification or data message via Firebase Cloud Messaging (FCM). Target individual devices by token, or broadcast to topics or conditions. Supports platform-specific configuration for Android, iOS (APNs), and Web.`,
  instructions: [
    'Provide exactly one of: deviceToken, topic, or condition.',
    'A topic targets all devices subscribed to that topic.',
    "A condition can combine topics with logical operators, e.g. \"'TopicA' in topics && 'TopicB' in topics\".",
    'Use dataPayload for silent data messages that the app processes in the background.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(firebaseActionScopes.sendFcmMessage)
  .input(
    z.object({
      deviceToken: z
        .string()
        .optional()
        .describe('FCM registration token of the target device'),
      topic: z.string().optional().describe('Topic name to send to (without /topics/ prefix)'),
      condition: z
        .string()
        .optional()
        .describe(
          "Topic condition expression, e.g. \"'news' in topics || 'weather' in topics\""
        ),
      title: z.string().optional().describe('Notification title'),
      body: z.string().optional().describe('Notification body text'),
      imageUrl: z
        .string()
        .optional()
        .describe('URL of an image to include in the notification'),
      dataPayload: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom key-value data payload. Values must be strings.'),
      android: z
        .object({
          priority: z.enum(['HIGH', 'NORMAL']).optional().describe('Android message priority'),
          ttl: z.string().optional().describe('Time-to-live duration, e.g. "3600s"'),
          channelId: z.string().optional().describe('Android notification channel ID'),
          icon: z.string().optional().describe('Notification icon name'),
          color: z.string().optional().describe('Notification icon color in #RRGGBB format'),
          sound: z.string().optional().describe('Sound to play, "default" for system default'),
          clickAction: z.string().optional().describe('Android click action activity')
        })
        .optional()
        .describe('Android-specific configuration'),
      apns: z
        .object({
          headers: z
            .record(z.string(), z.string())
            .optional()
            .describe('APNs headers, e.g. apns-priority, apns-expiration'),
          badge: z.number().optional().describe('App badge number'),
          sound: z.string().optional().describe('Sound to play')
        })
        .optional()
        .describe('Apple Push Notification service configuration'),
      webpush: z
        .object({
          headers: z
            .record(z.string(), z.string())
            .optional()
            .describe('Webpush protocol headers'),
          link: z.string().optional().describe('URL to open when notification is clicked')
        })
        .optional()
        .describe('Web push configuration'),
      validateOnly: z
        .boolean()
        .optional()
        .describe('Validate the request without delivering the message.')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('FCM message resource name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MessagingClient({
      token: ctx.auth.token,
      projectId: ctx.config.projectId
    });

    let {
      deviceToken,
      topic,
      condition,
      title,
      body,
      imageUrl,
      dataPayload,
      android,
      apns,
      webpush,
      validateOnly
    } = ctx.input;

    let targetCount = [deviceToken, topic, condition].filter(Boolean).length;
    if (targetCount !== 1) {
      throw firebaseServiceError(
        'Exactly one of deviceToken, topic, or condition must be provided'
      );
    }

    let message: any = {};

    if (deviceToken) message.token = deviceToken;
    if (topic) message.topic = topic;
    if (condition) message.condition = condition;

    if (title || body || imageUrl) {
      message.notification = {};
      if (title) message.notification.title = title;
      if (body) message.notification.body = body;
      if (imageUrl) message.notification.image = imageUrl;
    }

    if (dataPayload) {
      message.data = dataPayload;
    }

    if (android) {
      message.android = {
        priority: android.priority,
        ttl: android.ttl
      };
      if (
        android.channelId ||
        android.icon ||
        android.color ||
        android.sound ||
        android.clickAction
      ) {
        message.android.notification = {
          channel_id: android.channelId,
          icon: android.icon,
          color: android.color,
          sound: android.sound,
          click_action: android.clickAction
        };
      }
    }

    if (apns) {
      message.apns = {
        headers: apns.headers,
        payload: {
          aps: {
            badge: apns.badge,
            sound: apns.sound
          }
        }
      };
    }

    if (webpush) {
      message.webpush = {
        headers: webpush.headers,
        fcm_options: webpush.link ? { link: webpush.link } : undefined
      };
    }

    let result = await client.sendMessage(message, { validateOnly });

    let target = deviceToken ? `device` : topic ? `topic "${topic}"` : `condition`;
    return {
      output: result,
      message: `${validateOnly ? 'Validated' : 'Sent'} message to ${target}. Message ID: **${result.messageId}**`
    };
  })
  .build();
