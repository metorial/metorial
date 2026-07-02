import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let EVENT_TYPES = ['account_created', 'account_updated', 'account_deleted'] as const;

export let accountEvents = SlateTrigger.create(spec, {
  name: 'Account Events',
  key: 'account_events',
  description:
    'Triggers when an account (company) is created, updated, or deleted in SalesLoft.'
})
  .input(
    z.object({
      eventType: z.enum(EVENT_TYPES).describe('Type of account event'),
      eventId: z.string().describe('Unique event identifier'),
      account: z.any().describe('Account data from webhook payload')
    })
  )
  .output(
    z.object({
      accountId: z.number().describe('SalesLoft account ID'),
      name: z.string().nullable().optional().describe('Account name'),
      domain: z.string().nullable().optional().describe('Domain'),
      website: z.string().nullable().optional().describe('Website URL'),
      phone: z.string().nullable().optional().describe('Phone number'),
      industry: z.string().nullable().optional().describe('Industry'),
      city: z.string().nullable().optional().describe('City'),
      state: z.string().nullable().optional().describe('State'),
      country: z.string().nullable().optional().describe('Country'),
      size: z.string().nullable().optional().describe('Company size'),
      doNotContact: z.boolean().nullable().optional().describe('Do-not-contact flag'),
      ownerId: z.number().nullable().optional().describe('Owner user ID'),
      customFields: z
        .record(z.string(), z.any())
        .nullable()
        .optional()
        .describe('Custom fields'),
      tags: z.array(z.string()).nullable().optional().describe('Tags'),
      createdAt: z.string().nullable().optional().describe('Creation timestamp'),
      updatedAt: z.string().nullable().optional().describe('Last update timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let registrations: Array<{ subscriptionId: number; eventType: string }> = [];

      for (let eventType of EVENT_TYPES) {
        let subscription = await client.createWebhookSubscription(
          ctx.input.webhookBaseUrl,
          eventType
        );
        registrations.push({
          subscriptionId: subscription.id,
          eventType
        });
      }

      return {
        registrationDetails: { registrations }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as {
        registrations: Array<{ subscriptionId: number }>;
      };

      for (let reg of details.registrations) {
        try {
          await client.deleteWebhookSubscription(reg.subscriptionId);
        } catch (_e) {
          // Subscription may already be deleted
        }
      }
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      let eventType = ctx.request.headers.get('x-salesloft-event') || 'account_updated';

      return {
        inputs: [
          {
            eventType: eventType as (typeof EVENT_TYPES)[number],
            eventId: `${eventType}_${body?.id || Date.now()}`,
            account: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let raw = ctx.input.account;

      return {
        type: `account.${ctx.input.eventType.replace('account_', '')}`,
        id: ctx.input.eventId,
        output: {
          accountId: raw.id,
          name: raw.name,
          domain: raw.domain,
          website: raw.website,
          phone: raw.phone,
          industry: raw.industry,
          city: raw.city,
          state: raw.state,
          country: raw.country,
          size: raw.size,
          doNotContact: raw.do_not_contact,
          ownerId: raw.owner?.id ?? null,
          customFields: raw.custom_fields,
          tags: raw.tags,
          createdAt: raw.created_at,
          updatedAt: raw.updated_at
        }
      };
    }
  })
  .build();
