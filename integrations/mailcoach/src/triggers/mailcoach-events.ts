import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let mailcoachEvents = SlateTrigger.create(spec, {
  name: 'Mailcoach Events',
  key: 'mailcoach_events',
  description:
    'Receives webhook events from Mailcoach including subscriber changes, campaign sends, tag changes, email engagement (opens, clicks), and bounces. Configure the webhook URL in your Mailcoach settings.'
})
  .input(
    z.object({
      eventType: z.string().describe('The Mailcoach event type name'),
      subscriberEmail: z
        .string()
        .nullable()
        .describe('Email address of the affected subscriber'),
      subscriberFirstName: z.string().nullable().describe('First name of the subscriber'),
      subscriberLastName: z.string().nullable().describe('Last name of the subscriber'),
      emailListUuid: z.string().nullable().describe('UUID of the associated email list'),
      subscriberTags: z.array(z.string()).nullable().describe('Tags on the subscriber'),
      subscribedAt: z.string().nullable().describe('Subscription timestamp'),
      unsubscribedAt: z.string().nullable().describe('Unsubscription timestamp'),
      campaignUuid: z.string().nullable().describe('UUID of the associated campaign'),
      campaignName: z.string().nullable().describe('Name of the campaign'),
      tagName: z.string().nullable().describe('Name of the tag added or removed'),
      rawPayload: z.record(z.string(), z.unknown()).describe('Full raw webhook payload')
    })
  )
  .output(
    z.object({
      subscriberEmail: z
        .string()
        .nullable()
        .describe('Email address of the affected subscriber'),
      subscriberFirstName: z.string().nullable().describe('First name'),
      subscriberLastName: z.string().nullable().describe('Last name'),
      emailListUuid: z.string().nullable().describe('UUID of the email list'),
      subscriberTags: z.array(z.string()).nullable().describe('Tags on the subscriber'),
      subscribedAt: z.string().nullable().describe('Subscription timestamp'),
      unsubscribedAt: z.string().nullable().describe('Unsubscription timestamp'),
      campaignUuid: z.string().nullable().describe('UUID of the campaign'),
      campaignName: z.string().nullable().describe('Name of the campaign'),
      tagName: z.string().nullable().describe('Tag name (for tag events)'),
      extraAttributes: z
        .record(z.string(), z.unknown())
        .nullable()
        .describe('Extra subscriber attributes'),
      campaignStatus: z.string().nullable().describe('Campaign status'),
      sentToNumberOfSubscribers: z
        .number()
        .nullable()
        .describe('Number of subscribers the campaign was sent to'),
      openCount: z.number().nullable().describe('Number of opens'),
      clickCount: z.number().nullable().describe('Number of clicks')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data: any;
      try {
        data = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      if (!data?.event) {
        return { inputs: [] };
      }

      let eventType = data.event as string;

      return {
        inputs: [
          {
            eventType,
            subscriberEmail: data.email ?? null,
            subscriberFirstName: data.first_name ?? null,
            subscriberLastName: data.last_name ?? null,
            emailListUuid: data.email_list_uuid ?? null,
            subscriberTags: data.tags ?? null,
            subscribedAt: data.subscribed_at ?? null,
            unsubscribedAt: data.unsubscribed_at ?? null,
            campaignUuid: data.uuid ?? null,
            campaignName: data.name ?? null,
            tagName: data.tag_name ?? null,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { input } = ctx;

      let typeMap: Record<string, string> = {
        SubscribedEvent: 'subscriber.subscribed',
        UnconfirmedSubscriberCreatedEvent: 'subscriber.unconfirmed',
        UnsubscribedEvent: 'subscriber.unsubscribed',
        CampaignSentEvent: 'campaign.sent',
        TagAddedEvent: 'subscriber.tag_added',
        TagRemovedEvent: 'subscriber.tag_removed',
        CampaignOpenedEvent: 'email.opened',
        CampaignLinkClickedEvent: 'email.link_clicked',
        BounceRegisteredEvent: 'email.bounced',
        ComplaintRegisteredEvent: 'email.complaint',
        SoftBounceRegisteredEvent: 'email.soft_bounced'
      };

      let type = typeMap[input.eventType] ?? `mailcoach.${input.eventType.toLowerCase()}`;
      let raw = input.rawPayload as Record<string, any>;

      let eventId = [
        input.eventType,
        input.subscriberEmail ?? input.campaignUuid ?? '',
        raw.created_at ?? raw.sent_at ?? new Date().toISOString()
      ].join('-');

      return {
        type,
        id: eventId,
        output: {
          subscriberEmail: input.subscriberEmail,
          subscriberFirstName: input.subscriberFirstName,
          subscriberLastName: input.subscriberLastName,
          emailListUuid: input.emailListUuid,
          subscriberTags: input.subscriberTags,
          subscribedAt: input.subscribedAt,
          unsubscribedAt: input.unsubscribedAt,
          campaignUuid: input.campaignUuid,
          campaignName: input.campaignName,
          tagName: input.tagName,
          extraAttributes: raw.extra_attributes ?? null,
          campaignStatus: raw.status ?? null,
          sentToNumberOfSubscribers: raw.sent_to_number_of_subscribers ?? null,
          openCount: raw.open_count ?? null,
          clickCount: raw.click_count ?? null
        }
      };
    }
  });
