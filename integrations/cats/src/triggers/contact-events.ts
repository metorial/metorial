import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let CONTACT_EVENTS = [
  'contact.created',
  'contact.updated',
  'contact.deleted',
  'contact.status_changed'
] as const;

export let contactEvents = SlateTrigger.create(spec, {
  name: 'Contact Events',
  key: 'contact_events',
  description:
    'Triggers when a contact is created, updated, deleted, or has its status changed.'
})
  .input(
    z.object({
      eventType: z.string().describe('Event type'),
      contactId: z.string().describe('Contact ID'),
      previousStatusId: z.string().optional().describe('Previous status ID'),
      newStatusId: z.string().optional().describe('New status ID'),
      rawPayload: z.any().optional().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('Contact ID'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      title: z.string().optional().describe('Job title'),
      isHot: z.boolean().optional().describe('Whether hot'),
      previousStatusId: z.string().optional().describe('Previous status ID'),
      newStatusId: z.string().optional().describe('New status ID'),
      createdAt: z.string().optional().describe('Created date'),
      updatedAt: z.string().optional().describe('Updated date')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let webhookIds: string[] = [];
      for (let event of CONTACT_EVENTS) {
        let result = await client.createWebhook({
          url: ctx.input.webhookBaseUrl,
          event
        });
        let webhookId =
          result?.id?.toString() ?? result?._links?.self?.href?.split('/').pop() ?? '';
        webhookIds.push(webhookId);
      }

      return {
        registrationDetails: { webhookIds }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as { webhookIds: string[] };

      for (let webhookId of details?.webhookIds ?? []) {
        try {
          await client.deleteWebhook(webhookId);
        } catch {
          // Webhook may already be deleted
        }
      }
    },

    handleRequest: async ctx => {
      let data: any = await ctx.request.json();

      let contactId = data.contact_id?.toString() ?? '';
      let eventType = data.event ?? '';

      return {
        inputs: [
          {
            eventType,
            contactId,
            previousStatusId: data.previous_status_id?.toString(),
            newStatusId: data.new_status_id?.toString(),
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let contact: any = {};
      if (ctx.input.eventType !== 'contact.deleted') {
        try {
          contact = await client.getContact(ctx.input.contactId);
        } catch {
          // Contact may not exist anymore
        }
      }

      return {
        type: ctx.input.eventType,
        id: `${ctx.input.eventType}-${ctx.input.contactId}-${Date.now()}`,
        output: {
          contactId: ctx.input.contactId,
          firstName: contact.first_name,
          lastName: contact.last_name,
          title: contact.title,
          isHot: contact.is_hot,
          previousStatusId: ctx.input.previousStatusId,
          newStatusId: ctx.input.newStatusId,
          createdAt: contact.created_at,
          updatedAt: contact.updated_at
        }
      };
    }
  })
  .build();
