import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let verificationEvents = SlateTrigger.create(spec, {
  name: 'Verification Events',
  key: 'verification_events',
  description:
    'Receive notifications when email verification operations complete, such as bulk list verification jobs finishing or individual verifications completing.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of verification event'),
      eventId: z.string().describe('Unique identifier for this event'),
      listId: z.string().optional().describe('ID of the email list if applicable'),
      email: z
        .string()
        .optional()
        .describe('Email address if this is a single verification event'),
      status: z.string().optional().describe('Verification status'),
      totalEmails: z.number().optional().describe('Total emails in the list'),
      deliverable: z.number().optional().describe('Number of deliverable emails'),
      undeliverable: z.number().optional().describe('Number of undeliverable emails'),
      risky: z.number().optional().describe('Number of risky emails'),
      unknown: z.number().optional().describe('Number of unknown emails'),
      completedAt: z.string().optional().describe('When the verification completed')
    })
  )
  .output(
    z.object({
      listId: z.string().optional().describe('ID of the email list if applicable'),
      listName: z.string().optional().describe('Name of the email list if applicable'),
      email: z.string().optional().describe('Email address for single verification events'),
      status: z.string().optional().describe('Verification status'),
      totalEmails: z.number().optional().describe('Total number of emails in the list'),
      deliverable: z.number().optional().describe('Number of deliverable emails'),
      undeliverable: z.number().optional().describe('Number of undeliverable emails'),
      risky: z.number().optional().describe('Number of risky emails'),
      unknown: z.number().optional().describe('Number of unknown emails'),
      completedAt: z.string().optional().describe('When the verification completed')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let webhook = await client.createWebhook(ctx.input.webhookBaseUrl, [
        'list.completed',
        'verification.completed'
      ]);

      return {
        registrationDetails: {
          webhookId: webhook.webhookId
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, any>;

      let eventType = data.event || data.type || 'unknown';
      let eventId = data.id || data.eventId || `${eventType}-${Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            eventId,
            listId: data.listId || data.list_id,
            email: data.email,
            status: data.status,
            totalEmails: data.totalEmails || data.total_emails,
            deliverable: data.deliverable,
            undeliverable: data.undeliverable,
            risky: data.risky,
            unknown: data.unknown,
            completedAt: data.completedAt || data.completed_at
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let listName: string | undefined;

      if (ctx.input.listId) {
        try {
          let client = new Client({ token: ctx.auth.token });
          let list = await client.getList(ctx.input.listId);
          listName = list.name;
        } catch {
          // List details may not be available; proceed without name
        }
      }

      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          listId: ctx.input.listId,
          listName,
          email: ctx.input.email,
          status: ctx.input.status,
          totalEmails: ctx.input.totalEmails,
          deliverable: ctx.input.deliverable,
          undeliverable: ctx.input.undeliverable,
          risky: ctx.input.risky,
          unknown: ctx.input.unknown,
          completedAt: ctx.input.completedAt
        }
      };
    }
  })
  .build();
