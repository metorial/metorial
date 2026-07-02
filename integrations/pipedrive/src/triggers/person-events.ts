import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let personEvents = SlateTrigger.create(spec, {
  name: 'Person Events',
  key: 'person_events',
  description: 'Triggers when a person contact is created, updated, or deleted in Pipedrive.'
})
  .input(
    z.object({
      action: z.enum(['created', 'changed', 'deleted']).describe('Event action type'),
      eventId: z.string().describe('Unique event identifier'),
      current: z.any().optional().describe('Current state of the person'),
      previous: z.any().optional().describe('Previous state of the person')
    })
  )
  .output(
    z.object({
      personId: z.number().describe('Person ID'),
      name: z.string().optional().describe('Person name'),
      primaryEmail: z.string().optional().nullable().describe('Primary email address'),
      primaryPhone: z.string().optional().nullable().describe('Primary phone number'),
      organizationId: z.number().optional().nullable().describe('Linked organization ID'),
      userId: z.number().optional().describe('Owner user ID'),
      addTime: z.string().optional().describe('Creation timestamp'),
      updateTime: z.string().optional().nullable().describe('Last update timestamp'),
      openDealsCount: z.number().optional().describe('Number of open deals')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = createClient(ctx);
      let result = await client.createWebhook({
        subscription_url: ctx.input.webhookBaseUrl,
        event_action: '*',
        event_object: 'person'
      });
      return {
        registrationDetails: { webhookId: result?.data?.id }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = createClient(ctx);
      let webhookId = ctx.input.registrationDetails?.webhookId;
      if (webhookId) {
        await client.deleteWebhook(webhookId);
      }
    },

    handleRequest: async ctx => {
      let data: any = await ctx.request.json();
      let action = data.meta?.action;
      let current = data.current;
      let previous = data.previous;

      let actionMap: Record<string, string> = {
        added: 'created',
        updated: 'changed',
        deleted: 'deleted',
        merged: 'changed'
      };

      return {
        inputs: [
          {
            action: actionMap[action] || action,
            eventId: `person-${current?.id || previous?.id}-${data.meta?.timestamp || Date.now()}`,
            current,
            previous
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let person = ctx.input.current || ctx.input.previous || {};
      let emails = person.email || [];
      let phones = person.phone || [];
      let primaryEmail = Array.isArray(emails)
        ? (emails.find((e: any) => e.primary)?.value ?? emails[0]?.value ?? null)
        : null;
      let primaryPhone = Array.isArray(phones)
        ? (phones.find((p: any) => p.primary)?.value ?? phones[0]?.value ?? null)
        : null;

      return {
        type: `person.${ctx.input.action}`,
        id: ctx.input.eventId,
        output: {
          personId: person.id,
          name: person.name,
          primaryEmail,
          primaryPhone,
          organizationId: person.org_id,
          userId: person.owner_id,
          addTime: person.add_time,
          updateTime: person.update_time,
          openDealsCount: person.open_deals_count
        }
      };
    }
  });
