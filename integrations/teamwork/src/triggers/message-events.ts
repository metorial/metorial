import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let messageEvents = SlateTrigger.create(spec, {
  name: 'Message Events',
  key: 'message_events',
  description:
    'Triggers when a message (discussion post) is created, updated, or deleted in Teamwork.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of message event'),
      messageId: z.string().describe('ID of the affected message'),
      projectId: z.string().optional().describe('Project ID'),
      eventPayload: z.any().describe('Raw webhook event payload')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('ID of the affected message'),
      title: z.string().optional().describe('Message title'),
      body: z.string().optional().describe('Message body'),
      projectId: z.string().optional().describe('Project ID'),
      projectName: z.string().optional().describe('Project name'),
      authorId: z.string().optional().describe('ID of the message author'),
      authorName: z.string().optional().describe('Name of the message author'),
      createdAt: z.string().optional().describe('When the message was created')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;
      let event = data.event || data;
      let message = event.post || event.message || event.objectData || {};
      let eventType = event.event || data.event || 'unknown';
      let messageId = message.id
        ? String(message.id)
        : event.objectId
          ? String(event.objectId)
          : '';

      if (!messageId) return { inputs: [] };

      return {
        inputs: [
          {
            eventType: String(eventType),
            messageId,
            projectId: message.projectId
              ? String(message.projectId)
              : message['project-id']
                ? String(message['project-id'])
                : undefined,
            eventPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let payload = ctx.input.eventPayload;
      let event = payload?.event || payload;
      let message = event?.post || event?.message || event?.objectData || {};
      let user = event?.user || event?.eventCreator || {};

      return {
        type: `message.${ctx.input.eventType.replace(/^MESSAGE\./, '').toLowerCase()}`,
        id: `message-${ctx.input.messageId}-${ctx.input.eventType}-${Date.now()}`,
        output: {
          messageId: ctx.input.messageId,
          title: message.title || undefined,
          body: message.body || undefined,
          projectId: ctx.input.projectId || undefined,
          projectName: message.projectName || message['project-name'] || undefined,
          authorId: user.id ? String(user.id) : undefined,
          authorName: user.firstName
            ? `${user.firstName} ${user.lastName || ''}`.trim()
            : undefined,
          createdAt:
            message['created-on'] || message.createdOn || message.createdAt || undefined
        }
      };
    }
  })
  .build();
