import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let webhookInputSchema = z.object({
  eventName: z.string().describe('Webhook event type'),
  eventTime: z.number().describe('Unix timestamp of when the event occurred'),
  webhookId: z.string().describe('Unique webhook event ID for deduplication'),
  contactIdentity: z
    .object({
      contactId: z.string().describe('Unique ID of the contact'),
      email: z.string().describe('Email address of the contact'),
      userId: z.string().nullable().describe('External user ID of the contact')
    })
    .optional()
    .describe('Contact identity from webhook'),
  email: z
    .object({
      emailId: z.string().describe('Internal email ID'),
      emailMessageId: z.string().describe('Email message ID'),
      subject: z.string().describe('Subject line of the email')
    })
    .optional()
    .describe('Email details from webhook'),
  campaignId: z.string().optional(),
  loopId: z.string().optional(),
  transactionalId: z.string().optional(),
  mailingLists: z
    .array(
      z.object({
        mailingListId: z.string(),
        name: z.string()
      })
    )
    .optional()
});

export let emailSendingEvents = SlateTrigger.create(spec, {
  name: 'Email Sending Events',
  key: 'email_sending_events',
  description: 'Triggers when campaign, loop, or transactional emails are sent to recipients.'
})
  .input(webhookInputSchema)
  .output(
    z.object({
      sourceType: z
        .enum(['campaign', 'loop', 'transactional'])
        .describe('Type of email that was sent'),
      sourceId: z.string().describe('ID of the campaign, loop, or transactional email'),
      contactId: z.string().describe('ID of the recipient contact'),
      contactEmail: z.string().describe('Email address of the recipient'),
      contactUserId: z.string().nullable().describe('External user ID of the recipient'),
      emailId: z.string().optional().describe('Internal email ID'),
      emailMessageId: z.string().optional().describe('Email message ID'),
      subject: z.string().optional().describe('Subject line of the sent email'),
      mailingLists: z
        .array(
          z.object({
            mailingListId: z.string().describe('ID of the mailing list'),
            name: z.string().describe('Name of the mailing list')
          })
        )
        .optional()
        .describe('Related mailing lists (for campaign emails)'),
      eventTime: z.string().describe('ISO timestamp of when the email was sent')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, unknown>;
      let webhookId =
        ctx.request.headers.get('Webhook-Id') || `${data.eventName}-${data.eventTime}`;

      let eventName = data.eventName as string;
      let sendingEvents = [
        'campaign.email.sent',
        'loop.email.sent',
        'transactional.email.sent'
      ];

      if (!sendingEvents.includes(eventName)) {
        return { inputs: [] };
      }

      let emailData = data.email as
        | { id?: string; emailMessageId?: string; subject?: string }
        | undefined;
      let contactIdentity = data.contactIdentity as
        | { id?: string; email?: string; userId?: string | null }
        | undefined;
      let mailingListsRaw = data.mailingLists as
        | Array<{ id?: string; name?: string }>
        | undefined;

      return {
        inputs: [
          {
            eventName,
            eventTime: data.eventTime as number,
            webhookId,
            contactIdentity: contactIdentity
              ? {
                  contactId: contactIdentity.id || '',
                  email: contactIdentity.email || '',
                  userId: contactIdentity.userId ?? null
                }
              : undefined,
            email: emailData
              ? {
                  emailId: emailData.id || '',
                  emailMessageId: emailData.emailMessageId || '',
                  subject: emailData.subject || ''
                }
              : undefined,
            campaignId: data.campaignId as string | undefined,
            loopId: data.loopId as string | undefined,
            transactionalId: data.transactionalId as string | undefined,
            mailingLists: mailingListsRaw?.map(ml => ({
              mailingListId: ml.id || '',
              name: ml.name || ''
            }))
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let {
        eventName,
        eventTime,
        webhookId,
        contactIdentity,
        email,
        campaignId,
        loopId,
        transactionalId,
        mailingLists
      } = ctx.input;

      let sourceType: 'campaign' | 'loop' | 'transactional';
      let sourceId: string;

      if (eventName === 'campaign.email.sent') {
        sourceType = 'campaign';
        sourceId = campaignId || '';
      } else if (eventName === 'loop.email.sent') {
        sourceType = 'loop';
        sourceId = loopId || '';
      } else {
        sourceType = 'transactional';
        sourceId = transactionalId || '';
      }

      return {
        type: eventName,
        id: webhookId,
        output: {
          sourceType,
          sourceId,
          contactId: contactIdentity?.contactId || '',
          contactEmail: contactIdentity?.email || '',
          contactUserId: contactIdentity?.userId ?? null,
          emailId: email?.emailId,
          emailMessageId: email?.emailMessageId,
          subject: email?.subject,
          mailingLists,
          eventTime: new Date(eventTime * 1000).toISOString()
        }
      };
    }
  })
  .build();
