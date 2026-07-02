import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let messageActivity = SlateTrigger.create(spec, {
  name: 'Message Activity',
  key: 'message_activity',
  description:
    'Triggers when a message activity event occurs (delivered, read, clicked, unsubscribed, spam, etc.) across all channels. Configure the webhook URL in eSputnik under Settings → Data Export.',
  instructions: [
    'Configure the webhook URL in your eSputnik account under Settings → Data Export',
    'Select which activity statuses to track per webhook',
    'You can configure optional basic authentication and up to 5 custom headers for the webhook endpoint'
  ]
})
  .input(
    z.object({
      activityStatus: z
        .string()
        .describe(
          'Activity status (SENT, DELIVERED, UNDELIVERED, READ, UNSUBSCRIBED, CLICKED, SPAM, SUBSCRIPTION_CHANGED)'
        ),
      mediaType: z
        .string()
        .describe(
          'Channel type (email, sms, viber, webpush, mobilepush, appinbox, widget, inapp, telegram)'
        ),
      contactId: z.number().optional().describe('eSputnik contact ID'),
      externalCustomerId: z.string().optional().describe('External customer ID'),
      messageId: z.number().optional().describe('Message template ID'),
      messageName: z.string().optional().describe('Message name'),
      broadcastId: z.number().optional().describe('Broadcast campaign ID'),
      workflowId: z.number().optional().describe('Workflow ID'),
      workflowInstanceId: z.string().optional().describe('Workflow launch UUID'),
      workflowBlockId: z.string().optional().describe('Workflow block ID'),
      email: z.string().optional().describe('Contact email'),
      sms: z.string().optional().describe('Contact phone number'),
      iid: z.string().describe('Message instance UUID'),
      activityDateTime: z.string().describe('Activity timestamp (ISO 8601)'),
      clickEventLink: z.string().optional().describe('Clicked URL (for CLICKED status)'),
      hardBounce: z
        .boolean()
        .optional()
        .describe('Permanent delivery error (for email UNDELIVERED)'),
      statusDescription: z.string().optional().describe('Failure reason (for UNDELIVERED)'),
      from: z.string().optional().describe('Sender name'),
      messageInstanceId: z.number().optional().describe('Message instance ID'),
      messageLanguageCode: z.string().optional().describe('Message language code'),
      messageTag: z.string().optional().describe('Message tags'),
      sourceEventId: z.number().optional().describe('Triggering event ID'),
      sourceEventKey: z.string().optional().describe('Triggering event key'),
      sourceEventTypeKey: z.string().optional().describe('Triggering event type key')
    })
  )
  .output(
    z.object({
      activityStatus: z.string().describe('Activity status'),
      mediaType: z.string().describe('Channel type'),
      contactId: z.number().optional().describe('eSputnik contact ID'),
      externalCustomerId: z.string().optional().describe('External customer ID'),
      email: z.string().optional().describe('Contact email address'),
      phone: z.string().optional().describe('Contact phone number'),
      messageId: z.number().optional().describe('Message template ID'),
      messageName: z.string().optional().describe('Message name'),
      messageInstanceId: z.string().describe('Message instance UUID'),
      broadcastId: z.number().optional().describe('Broadcast campaign ID'),
      workflowId: z.number().optional().describe('Workflow ID'),
      workflowInstanceId: z.string().optional().describe('Workflow launch UUID'),
      activityDateTime: z.string().describe('Activity timestamp (ISO 8601)'),
      clickedUrl: z.string().optional().describe('Clicked URL (for CLICKED events)'),
      hardBounce: z.boolean().optional().describe('Permanent delivery error flag'),
      statusDescription: z.string().optional().describe('Failure reason description'),
      senderName: z.string().optional().describe('Sender name'),
      sourceEventTypeKey: z.string().optional().describe('Triggering event type key'),
      sourceEventKey: z.string().optional().describe('Triggering event key')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      // eSputnik can send single objects or arrays
      let events = Array.isArray(data) ? data : [data];

      let inputs = events.map((event: any) => ({
        activityStatus: event.activityStatus || '',
        mediaType: event.mediaType || '',
        contactId: event.contactId,
        externalCustomerId: event.externalCustomerId,
        messageId: event.messageId,
        messageName: event.messageName,
        broadcastId: event.broadcastId,
        workflowId: event.workflowId,
        workflowInstanceId: event.workflowInstanceId,
        workflowBlockId: event.workflowBlockId,
        email: event.email,
        sms: event.sms,
        iid: event.iid || '',
        activityDateTime: event.activityDateTime || '',
        clickEventLink: event.clickEventLink,
        hardBounce: event.hardBounce,
        statusDescription: event.statusDescription,
        from: event.from,
        messageInstanceId: event.messageInstanceId,
        messageLanguageCode: event.messageLanguageCode,
        messageTag: event.messageTag,
        sourceEventId: event.sourceEventId,
        sourceEventKey: event.sourceEventKey,
        sourceEventTypeKey: event.sourceEventTypeKey
      }));

      return { inputs };
    },

    handleEvent: async ctx => {
      let status = (ctx.input.activityStatus || '').toLowerCase();
      let media = (ctx.input.mediaType || '').toLowerCase();
      let eventType = `message.${status}`;

      // Use iid + activityStatus as unique event ID for deduplication
      let eventId = `${ctx.input.iid}-${ctx.input.activityStatus}-${ctx.input.activityDateTime}`;

      return {
        type: eventType,
        id: eventId,
        output: {
          activityStatus: ctx.input.activityStatus,
          mediaType: media,
          contactId: ctx.input.contactId,
          externalCustomerId: ctx.input.externalCustomerId,
          email: ctx.input.email,
          phone: ctx.input.sms,
          messageId: ctx.input.messageId,
          messageName: ctx.input.messageName,
          messageInstanceId: ctx.input.iid,
          broadcastId: ctx.input.broadcastId,
          workflowId: ctx.input.workflowId,
          workflowInstanceId: ctx.input.workflowInstanceId,
          activityDateTime: ctx.input.activityDateTime,
          clickedUrl: ctx.input.clickEventLink,
          hardBounce: ctx.input.hardBounce,
          statusDescription: ctx.input.statusDescription,
          senderName: ctx.input.from,
          sourceEventTypeKey: ctx.input.sourceEventTypeKey,
          sourceEventKey: ctx.input.sourceEventKey
        }
      };
    }
  })
  .build();
