import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let EVENT_TYPES = ['note_created', 'note_updated', 'note_deleted'] as const;

export let noteEvents = SlateTrigger.create(spec, {
  name: 'Note Events',
  key: 'note_events',
  description: 'Triggers when a note is created, updated, or deleted in SalesLoft.'
})
  .input(
    z.object({
      eventType: z.enum(EVENT_TYPES).describe('Type of note event'),
      eventId: z.string().describe('Unique event identifier'),
      note: z.any().describe('Note data from webhook payload')
    })
  )
  .output(
    z.object({
      noteId: z.number().describe('SalesLoft note ID'),
      content: z.string().nullable().optional().describe('Note content'),
      associatedWithType: z
        .string()
        .nullable()
        .optional()
        .describe('Type of associated resource'),
      associatedWithId: z
        .number()
        .nullable()
        .optional()
        .describe('ID of the associated resource'),
      userId: z.number().nullable().optional().describe('Author user ID'),
      callId: z.number().nullable().optional().describe('Associated call ID'),
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
      let eventType = ctx.request.headers.get('x-salesloft-event') || 'note_updated';

      return {
        inputs: [
          {
            eventType: eventType as (typeof EVENT_TYPES)[number],
            eventId: `${eventType}_${body?.id || Date.now()}`,
            note: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let raw = ctx.input.note;

      return {
        type: `note.${ctx.input.eventType.replace('note_', '')}`,
        id: ctx.input.eventId,
        output: {
          noteId: raw.id,
          content: raw.content,
          associatedWithType: raw.associated_with_type,
          associatedWithId: raw.associated_with?.id ?? null,
          userId: raw.user?.id ?? null,
          callId: raw.call?.id ?? null,
          createdAt: raw.created_at,
          updatedAt: raw.updated_at
        }
      };
    }
  })
  .build();
