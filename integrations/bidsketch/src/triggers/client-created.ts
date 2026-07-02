import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { BidsketchClient } from '../lib/client';
import { spec } from '../spec';

export let clientCreated = SlateTrigger.create(spec, {
  name: 'Client Created',
  key: 'client_created',
  description:
    'Triggers when a new client is created in Bidsketch, whether through the API or the Bidsketch app.'
})
  .input(
    z.object({
      eventType: z.string().describe('Event type'),
      clientId: z.number().describe('Client ID'),
      firstName: z.string().describe('Client first name'),
      lastName: z.string().describe('Client last name'),
      email: z.string().describe('Client email'),
      phone: z.string().nullable().describe('Phone number'),
      website: z.string().nullable().describe('Website'),
      address: z.string().nullable().describe('Street address'),
      address2: z.string().nullable().describe('Address line 2'),
      city: z.string().nullable().describe('City'),
      state: z.string().nullable().describe('State'),
      postalZip: z.string().nullable().describe('Postal/ZIP code'),
      locale: z.string().nullable().describe('Country/locale'),
      notes: z.string().nullable().describe('Private notes'),
      url: z.string().nullable().describe('API URL'),
      appUrl: z.string().nullable().describe('Bidsketch app URL'),
      createdAt: z.string().nullable().describe('Creation timestamp'),
      updatedAt: z.string().nullable().describe('Last update timestamp')
    })
  )
  .output(
    z.object({
      clientId: z.number().describe('Unique client ID'),
      firstName: z.string().describe('Client first name'),
      lastName: z.string().describe('Client last name'),
      email: z.string().describe('Client email address'),
      phone: z.string().nullable().describe('Phone number'),
      website: z.string().nullable().describe('Website URL'),
      address: z.string().nullable().describe('Street address'),
      address2: z.string().nullable().describe('Address line 2'),
      city: z.string().nullable().describe('City'),
      state: z.string().nullable().describe('State/province'),
      postalZip: z.string().nullable().describe('Postal/ZIP code'),
      locale: z.string().nullable().describe('Country/locale'),
      notes: z.string().nullable().describe('Private notes'),
      url: z.string().nullable().describe('API URL'),
      appUrl: z.string().nullable().describe('Bidsketch app URL'),
      createdAt: z.string().nullable().describe('Creation timestamp'),
      updatedAt: z.string().nullable().describe('Last update timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new BidsketchClient(ctx.auth.token);
      let webhook = await client.createWebhook('client_created', ctx.input.webhookBaseUrl);

      return {
        registrationDetails: {
          webhookId: webhook.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new BidsketchClient(ctx.auth.token);
      let details = ctx.input.registrationDetails as { webhookId: number };
      await client.deleteWebhook(details.webhookId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as { event: string; data: any };

      let d = body.data;

      return {
        inputs: [
          {
            eventType: body.event,
            clientId: d.id,
            firstName: d.first_name,
            lastName: d.last_name,
            email: d.email,
            phone: d.phone ?? null,
            website: d.website ?? null,
            address: d.address ?? null,
            address2: d.address2 ?? null,
            city: d.city ?? null,
            state: d.state ?? null,
            postalZip: d.postal_zip ?? null,
            locale: d.locale ?? null,
            notes: d.notes ?? null,
            url: d.url ?? null,
            appUrl: d.app_url ?? null,
            createdAt: d.created_at ?? null,
            updatedAt: d.updated_at ?? null
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'client.created',
        id: `client_created_${ctx.input.clientId}`,
        output: {
          clientId: ctx.input.clientId,
          firstName: ctx.input.firstName,
          lastName: ctx.input.lastName,
          email: ctx.input.email,
          phone: ctx.input.phone,
          website: ctx.input.website,
          address: ctx.input.address,
          address2: ctx.input.address2,
          city: ctx.input.city,
          state: ctx.input.state,
          postalZip: ctx.input.postalZip,
          locale: ctx.input.locale,
          notes: ctx.input.notes,
          url: ctx.input.url,
          appUrl: ctx.input.appUrl,
          createdAt: ctx.input.createdAt,
          updatedAt: ctx.input.updatedAt
        }
      };
    }
  })
  .build();
