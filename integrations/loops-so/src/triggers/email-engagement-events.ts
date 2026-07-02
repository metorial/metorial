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
  sourceType: z.string().optional(),
  campaignId: z.string().optional(),
  loopId: z.string().optional(),
  transactionalId: z.string().optional()
});

export let emailEngagementEvents = SlateTrigger.create(spec, {
  name: 'Email Engagement Events',
  key: 'email_engagement_events',
  description:
    'Triggers on email engagement activities: delivery, bounces, opens, clicks, unsubscribes, resubscribes, and spam reports.'
})
  .input(webhookInputSchema)
  .output(
    z.object({
      engagementType: z
        .enum([
          'delivered',
          'soft_bounced',
          'hard_bounced',
          'opened',
          'clicked',
          'unsubscribed',
          'resubscribed',
          'spam_reported'
        ])
        .describe('Type of engagement event'),
      sourceType: z
        .enum(['campaign', 'loop', 'transactional'])
        .describe('Type of email that generated this engagement'),
      sourceId: z.string().describe('ID of the campaign, loop, or transactional email'),
      contactId: z.string().describe('ID of the contact'),
      contactEmail: z.string().describe('Email address of the contact'),
      contactUserId: z.string().nullable().describe('External user ID of the contact'),
      emailId: z.string().optional().describe('Internal email ID'),
      emailMessageId: z.string().optional().describe('Email message ID'),
      subject: z.string().optional().describe('Subject line of the email'),
      eventTime: z.string().describe('ISO timestamp of when the engagement occurred')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, unknown>;
      let webhookId =
        ctx.request.headers.get('Webhook-Id') || `${data.eventName}-${data.eventTime}`;

      let eventName = data.eventName as string;
      let engagementEvents = [
        'email.delivered',
        'email.softBounced',
        'email.hardBounced',
        'email.opened',
        'email.clicked',
        'email.unsubscribed',
        'email.resubscribed',
        'email.spamReported'
      ];

      if (!engagementEvents.includes(eventName)) {
        return { inputs: [] };
      }

      let emailData = data.email as
        | { id?: string; emailMessageId?: string; subject?: string }
        | undefined;
      let contactIdentity = data.contactIdentity as
        | { id?: string; email?: string; userId?: string | null }
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
            sourceType: data.sourceType as string | undefined,
            campaignId: data.campaignId as string | undefined,
            loopId: data.loopId as string | undefined,
            transactionalId: data.transactionalId as string | undefined
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
        sourceType: rawSourceType,
        campaignId,
        loopId,
        transactionalId
      } = ctx.input;

      let engagementTypeMap: Record<string, string> = {
        'email.delivered': 'delivered',
        'email.softBounced': 'soft_bounced',
        'email.hardBounced': 'hard_bounced',
        'email.opened': 'opened',
        'email.clicked': 'clicked',
        'email.unsubscribed': 'unsubscribed',
        'email.resubscribed': 'resubscribed',
        'email.spamReported': 'spam_reported'
      };

      let engagementType = (engagementTypeMap[eventName] || 'delivered') as
        | 'delivered'
        | 'soft_bounced'
        | 'hard_bounced'
        | 'opened'
        | 'clicked'
        | 'unsubscribed'
        | 'resubscribed'
        | 'spam_reported';

      let sourceType = (rawSourceType || 'campaign') as 'campaign' | 'loop' | 'transactional';
      let sourceId = campaignId || loopId || transactionalId || '';

      return {
        type: eventName,
        id: webhookId,
        output: {
          engagementType,
          sourceType,
          sourceId,
          contactId: contactIdentity?.contactId || '',
          contactEmail: contactIdentity?.email || '',
          contactUserId: contactIdentity?.userId ?? null,
          emailId: email?.emailId,
          emailMessageId: email?.emailMessageId,
          subject: email?.subject,
          eventTime: new Date(eventTime * 1000).toISOString()
        }
      };
    }
  })
  .build();
