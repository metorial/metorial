import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let communityEvents = SlateTrigger.create(spec, {
  name: 'Community Events',
  key: 'community_events',
  description:
    'Triggers on community activity via webhooks — new users, user updates, new threads, new events, group joins, course completions, event RSVPs, abandoned invitation links, and direct messages. Configure webhooks in your Heartbeat settings.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of the webhook event'),
      webhookPayload: z
        .record(z.string(), z.any())
        .describe('Raw webhook payload from Heartbeat')
    })
  )
  .output(
    z.object({
      userId: z.string().optional().describe('ID of the user involved'),
      email: z.string().optional().describe('Email of the user involved'),
      firstName: z.string().optional().describe('First name of the user'),
      lastName: z.string().optional().describe('Last name of the user'),
      groupId: z.string().optional().describe('ID of the group involved'),
      threadId: z.string().optional().describe('ID of the thread involved'),
      channelId: z.string().optional().describe('ID of the channel involved'),
      eventId: z.string().optional().describe('ID of the event involved'),
      chatId: z.string().optional().describe('ID of the chat (for direct messages)'),
      messageId: z.string().optional().describe('ID of the message (for direct messages)'),
      senderUserId: z.string().optional().describe('Sender user ID (for direct messages)'),
      receiverUserId: z.string().optional().describe('Receiver user ID (for direct messages)'),
      courseId: z.string().optional().describe('ID of the course (for course completions)')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body: Record<string, any>;
      try {
        body = (await ctx.request.json()) as Record<string, any>;
      } catch {
        return { inputs: [] };
      }

      let eventType = (body.action || body.actionType || body.type || 'unknown') as string;

      return {
        inputs: [
          {
            eventType: eventType.toLowerCase(),
            webhookPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let payload = ctx.input.webhookPayload as Record<string, any>;
      let eventType = ctx.input.eventType;

      let str = (val: unknown): string | undefined => {
        return typeof val === 'string' ? val : undefined;
      };

      let typeMap: Record<string, string> = {
        new_user: 'user.created',
        user_updated: 'user.updated',
        new_thread: 'thread.created',
        new_event: 'event.created',
        group_join: 'group.joined',
        course_completion: 'course.completed',
        event_rsvp: 'event.rsvp',
        abandoned_invitation_link: 'invitation.abandoned',
        direct_message: 'direct_message.received'
      };

      let mappedType = typeMap[eventType] || `community.${eventType}`;
      let eventId =
        payload.id ||
        payload.eventId ||
        payload.messageId ||
        payload.chatMessageID ||
        `${eventType}-${Date.now()}`;

      return {
        type: mappedType,
        id: String(eventId),
        output: {
          userId: str(payload.userId || payload.userID || payload.senderUserID),
          email: str(payload.email),
          firstName: str(payload.firstName),
          lastName: str(payload.lastName),
          groupId: str(payload.groupId || payload.groupID),
          threadId: str(payload.threadId || payload.threadID),
          channelId: str(payload.channelId || payload.channelID),
          eventId: str(payload.eventId || payload.eventID),
          chatId: str(payload.chatId || payload.chatID),
          messageId: str(payload.messageId || payload.chatMessageID),
          senderUserId: str(payload.senderUserID || payload.senderUserId),
          receiverUserId: str(payload.receiverUserID || payload.receiverUserId),
          courseId: str(payload.courseId || payload.courseID)
        }
      };
    }
  })
  .build();
