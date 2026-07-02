import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let notificationTypeMap: Record<number, string> = {
  0: 'expense.added',
  1: 'expense.updated',
  2: 'expense.deleted',
  3: 'comment.added',
  4: 'expense.undeleted',
  5: 'group.member_added',
  6: 'group.member_removed',
  7: 'friend.added',
  8: 'friend.removed',
  9: 'debt.simplified',
  10: 'group.created',
  11: 'group.updated',
  12: 'group.deleted',
  13: 'expense.reminder',
  14: 'payment.added',
  15: 'currency.converted'
};

export let accountActivity = SlateTrigger.create(spec, {
  name: 'Account Activity',
  key: 'account_activity',
  description:
    "Triggers on new notifications in the authenticated user's Splitwise account, including expenses added/updated/deleted, comments, group changes, friend changes, and debt simplifications."
})
  .input(
    z.object({
      notificationId: z.number().describe('Notification ID'),
      notificationType: z.number().describe('Numeric notification type'),
      content: z.string().describe('Notification content (HTML formatted)'),
      createdAt: z.string().describe('Notification creation timestamp'),
      createdBy: z.number().nullable().describe('User ID who triggered the notification'),
      sourceType: z.string().nullable().describe('Source resource type (e.g., "Expense")'),
      sourceId: z.number().nullable().describe('Source resource ID'),
      sourceUrl: z.string().nullable().describe('URL to the source resource'),
      imageUrl: z.string().nullable().describe('Associated image URL')
    })
  )
  .output(
    z.object({
      notificationId: z.number().describe('Notification ID'),
      eventType: z.string().describe('Event type (e.g., "expense.added", "comment.added")'),
      content: z.string().describe('Notification content'),
      createdAt: z.string().describe('Notification timestamp'),
      createdBy: z.number().nullable().describe('User ID who caused the notification'),
      sourceType: z.string().nullable().describe('Source resource type'),
      sourceId: z.number().nullable().describe('Source resource ID'),
      sourceUrl: z.string().nullable().describe('URL to the source'),
      imageUrl: z.string().nullable().describe('Image URL')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let updatedAfter = ctx.state?.lastCreatedAt as string | undefined;

      let notifications = await client.getNotifications({
        updatedAfter
      });

      if (!notifications || notifications.length === 0) {
        return {
          inputs: [],
          updatedState: ctx.state || {}
        };
      }

      let inputs = notifications.map((n: any) => ({
        notificationId: n.id,
        notificationType: n.type,
        content: n.content || '',
        createdAt: n.created_at,
        createdBy: n.created_by ?? null,
        sourceType: n.source?.type ?? null,
        sourceId: n.source?.id ?? null,
        sourceUrl: n.source?.url ?? null,
        imageUrl: n.image_url ?? null
      }));

      let latestTimestamp = notifications[0]?.created_at || updatedAfter;

      return {
        inputs,
        updatedState: {
          lastCreatedAt: latestTimestamp
        }
      };
    },

    handleEvent: async ctx => {
      let eventType =
        notificationTypeMap[ctx.input.notificationType] ||
        `notification.type_${ctx.input.notificationType}`;

      return {
        type: eventType,
        id: String(ctx.input.notificationId),
        output: {
          notificationId: ctx.input.notificationId,
          eventType,
          content: ctx.input.content,
          createdAt: ctx.input.createdAt,
          createdBy: ctx.input.createdBy,
          sourceType: ctx.input.sourceType,
          sourceId: ctx.input.sourceId,
          sourceUrl: ctx.input.sourceUrl,
          imageUrl: ctx.input.imageUrl
        }
      };
    }
  })
  .build();
