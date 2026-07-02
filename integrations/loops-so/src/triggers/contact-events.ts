import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let contactIdentitySchema = z.object({
  contactId: z.string().describe('Unique ID of the contact'),
  email: z.string().describe('Email address of the contact'),
  userId: z.string().nullable().describe('External user ID of the contact')
});

let mailingListSchema = z.object({
  mailingListId: z.string().describe('ID of the mailing list'),
  name: z.string().describe('Name of the mailing list'),
  description: z.string().nullable().optional().describe('Description of the mailing list'),
  isPublic: z.boolean().optional().describe('Whether the list is publicly visible')
});

let webhookInputSchema = z.object({
  eventName: z.string().describe('Webhook event type'),
  eventTime: z.number().describe('Unix timestamp of when the event occurred'),
  webhookId: z.string().describe('Unique webhook event ID for deduplication'),
  contactIdentity: contactIdentitySchema.optional().describe('Minimal contact identity'),
  contact: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Full contact data (for contact.created)'),
  mailingList: z
    .object({
      id: z.string().describe('ID of the mailing list'),
      name: z.string().describe('Name of the mailing list'),
      description: z
        .string()
        .nullable()
        .optional()
        .describe('Description of the mailing list'),
      isPublic: z.boolean().optional().describe('Whether the list is publicly visible')
    })
    .optional()
    .describe('Mailing list details (for mailing list events)')
});

export let contactEvents = SlateTrigger.create(spec, {
  name: 'Contact Events',
  key: 'contact_events',
  description:
    'Triggers when contacts are created, unsubscribed, deleted, or when their mailing list subscriptions change.'
})
  .input(webhookInputSchema)
  .output(
    z.object({
      contactId: z.string().describe('Unique ID of the contact'),
      email: z.string().describe('Email address of the contact'),
      userId: z.string().nullable().describe('External user ID of the contact'),
      firstName: z
        .string()
        .nullable()
        .optional()
        .describe('First name (available on contact.created)'),
      lastName: z
        .string()
        .nullable()
        .optional()
        .describe('Last name (available on contact.created)'),
      source: z
        .string()
        .nullable()
        .optional()
        .describe('Contact source (available on contact.created)'),
      subscribed: z
        .boolean()
        .optional()
        .describe('Subscription status (available on contact.created)'),
      userGroup: z
        .string()
        .nullable()
        .optional()
        .describe('User group (available on contact.created)'),
      mailingList: mailingListSchema
        .optional()
        .describe('Mailing list details (for subscription events)'),
      eventTime: z.string().describe('ISO timestamp of when the event occurred'),
      customProperties: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Custom contact properties (available on contact.created)')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, unknown>;
      let webhookId =
        ctx.request.headers.get('Webhook-Id') || `${data.eventName}-${data.eventTime}`;

      let eventName = data.eventName as string;
      let contactEventTypes = [
        'contact.created',
        'contact.unsubscribed',
        'contact.deleted',
        'contact.mailingList.subscribed',
        'contact.mailingList.unsubscribed'
      ];

      if (!contactEventTypes.includes(eventName)) {
        return { inputs: [] };
      }

      let rawIdentity = data.contactIdentity as
        | { id?: string; email?: string; userId?: string | null }
        | undefined;
      let rawMailingList = data.mailingList as
        | { id?: string; name?: string; description?: string | null; isPublic?: boolean }
        | undefined;

      return {
        inputs: [
          {
            eventName: eventName,
            eventTime: data.eventTime as number,
            webhookId: webhookId,
            contactIdentity: rawIdentity
              ? {
                  contactId: rawIdentity.id || '',
                  email: rawIdentity.email || '',
                  userId: rawIdentity.userId ?? null
                }
              : undefined,
            contact: data.contact as Record<string, unknown> | undefined,
            mailingList: rawMailingList
              ? {
                  id: rawMailingList.id || '',
                  name: rawMailingList.name || '',
                  description: rawMailingList.description,
                  isPublic: rawMailingList.isPublic
                }
              : undefined
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { eventName, eventTime, webhookId, contactIdentity, contact, mailingList } =
        ctx.input;

      let contactId: string;
      let email: string;
      let userId: string | null;
      let firstName: string | null | undefined;
      let lastName: string | null | undefined;
      let source: string | null | undefined;
      let subscribed: boolean | undefined;
      let userGroup: string | null | undefined;
      let customProperties: Record<string, unknown> | undefined;

      if (contact && eventName === 'contact.created') {
        contactId = contact.id as string;
        email = contact.email as string;
        userId = (contact.userId as string) || null;
        firstName = (contact.firstName as string) || null;
        lastName = (contact.lastName as string) || null;
        source = (contact.source as string) || null;
        subscribed = contact.subscribed as boolean;
        userGroup = (contact.userGroup as string) || null;

        let knownKeys = [
          'id',
          'email',
          'userId',
          'firstName',
          'lastName',
          'source',
          'subscribed',
          'userGroup',
          'mailingLists',
          'optInStatus'
        ];
        let custom: Record<string, unknown> = {};
        for (let key of Object.keys(contact)) {
          if (!knownKeys.includes(key)) {
            custom[key] = contact[key];
          }
        }
        if (Object.keys(custom).length > 0) {
          customProperties = custom;
        }
      } else if (contactIdentity) {
        contactId = contactIdentity.contactId;
        email = contactIdentity.email;
        userId = contactIdentity.userId;
      } else {
        return {
          type: eventName,
          id: webhookId,
          output: {
            contactId: 'unknown',
            email: 'unknown',
            userId: null,
            eventTime: new Date(eventTime * 1000).toISOString()
          }
        };
      }

      let mappedMailingList = mailingList
        ? {
            mailingListId: mailingList.id,
            name: mailingList.name,
            description: mailingList.description ?? null,
            isPublic: mailingList.isPublic
          }
        : undefined;

      return {
        type: eventName,
        id: webhookId,
        output: {
          contactId,
          email,
          userId,
          firstName,
          lastName,
          source,
          subscribed,
          userGroup,
          mailingList: mappedMailingList,
          eventTime: new Date(eventTime * 1000).toISOString(),
          customProperties
        }
      };
    }
  })
  .build();
