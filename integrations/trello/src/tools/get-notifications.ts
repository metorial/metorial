import { SlateTool } from 'slates';
import { z } from 'zod';
import { TrelloClient } from '../lib/client';
import { spec } from '../spec';

let notificationSchema = z.object({
  notificationId: z.string().describe('Notification ID'),
  type: z.string().optional().describe('Notification type'),
  unread: z.boolean().optional().describe('Whether the notification is unread'),
  date: z.string().optional().describe('When the notification was created'),
  dateRead: z.string().optional().describe('When the notification was read'),
  memberCreatorId: z.string().optional().describe('Member who created the notification'),
  actionId: z.string().optional().describe('Associated Trello action ID'),
  cardId: z.string().optional().describe('Associated card ID'),
  cardName: z.string().optional().describe('Associated card name'),
  boardId: z.string().optional().describe('Associated board ID'),
  boardName: z.string().optional().describe('Associated board name')
});

let mapNotification = (notification: any) => ({
  notificationId: notification.id,
  type: notification.type || undefined,
  unread: notification.unread,
  date: notification.date || undefined,
  dateRead: notification.dateRead || undefined,
  memberCreatorId: notification.idMemberCreator || undefined,
  actionId: notification.idAction || undefined,
  cardId: notification.data?.card?.id || notification.card?.id,
  cardName: notification.data?.card?.name || notification.card?.name,
  boardId: notification.data?.board?.id || notification.board?.id,
  boardName: notification.data?.board?.name || notification.board?.name
});

export let getNotifications = SlateTool.create(spec, {
  name: 'Get Notifications',
  key: 'get_notifications',
  description: `List Trello notifications for the authenticated user or another accessible member. Use to review recent card, board, and workspace activity without marking notifications read.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      memberId: z
        .string()
        .optional()
        .describe(
          'Member ID to list notifications for. Defaults to the authenticated user ("me")'
        ),
      readFilter: z
        .enum(['all', 'read', 'unread'])
        .optional()
        .describe('Filter notifications by read status. Defaults to "all"'),
      limit: z.number().optional().describe('Maximum notifications to return. Defaults to 50')
    })
  )
  .output(
    z.object({
      notifications: z.array(notificationSchema).describe('Trello notifications')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TrelloClient({ apiKey: ctx.auth.apiKey, token: ctx.auth.token });
    let rawNotifications = await client.getNotifications(ctx.input.memberId || 'me', {
      readFilter: ctx.input.readFilter,
      limit: ctx.input.limit
    });
    let notifications = rawNotifications.map(mapNotification);

    return {
      output: { notifications },
      message: `Found **${notifications.length}** notification(s).`
    };
  })
  .build();
