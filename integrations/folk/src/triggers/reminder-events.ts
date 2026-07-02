import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let reminderEvents = SlateTrigger.create(spec, {
  name: 'Reminder Events',
  key: 'reminder_events',
  description:
    'Triggers when a reminder is created, updated, deleted, or triggered (fires at scheduled time) in your Folk workspace.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of reminder event'),
      eventId: z.string().describe('Unique event ID'),
      reminderId: z.string().describe('ID of the affected reminder'),
      reminderUrl: z.string().describe('API URL for the reminder'),
      details: z.record(z.string(), z.unknown()).optional().describe('Additional details'),
      createdAt: z.string().describe('Event timestamp')
    })
  )
  .output(
    z.object({
      reminderId: z.string().describe('ID of the affected reminder'),
      reminderUrl: z.string().describe('API URL for the reminder'),
      name: z.string().optional().describe('Reminder name (when available)'),
      entityId: z.string().optional().describe('ID of the associated entity'),
      entityType: z.string().optional().describe('Type of associated entity'),
      lastTriggerTime: z
        .string()
        .nullable()
        .optional()
        .describe('Last trigger time (for triggered events)'),
      nextTriggerTime: z
        .string()
        .nullable()
        .optional()
        .describe('Next trigger time (for triggered events)'),
      createdAt: z.string().describe('Event timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let webhook = await client.createWebhook({
        name: 'Slates - Reminder Events',
        targetUrl: ctx.input.webhookBaseUrl,
        subscribedEvents: [
          { eventType: 'reminder.created' },
          { eventType: 'reminder.updated' },
          { eventType: 'reminder.deleted' },
          { eventType: 'reminder.triggered' }
        ]
      });

      return {
        registrationDetails: {
          webhookId: webhook.id,
          signingSecret: webhook.signingSecret
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as Record<string, unknown>;

      let data = body.data as Record<string, unknown> | undefined;

      return {
        inputs: [
          {
            eventType: body.type as string,
            eventId: body.id as string,
            reminderId: (data?.id as string) ?? '',
            reminderUrl: (data?.url as string) ?? '',
            details: (data?.details as Record<string, unknown>) ?? undefined,
            createdAt: body.createdAt as string
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let output: Record<string, unknown> = {
        reminderId: ctx.input.reminderId,
        reminderUrl: ctx.input.reminderUrl,
        createdAt: ctx.input.createdAt
      };

      if (ctx.input.details) {
        let details = ctx.input.details;
        if (details.name) output.name = details.name;
        if (details.entityId) output.entityId = details.entityId;
        if (details.entityType) output.entityType = details.entityType;
        if (details.lastTriggeredTime) output.lastTriggerTime = details.lastTriggeredTime;
        if (details.nextTriggeredTime) output.nextTriggerTime = details.nextTriggeredTime;
      }

      // Fetch full details for non-delete events
      if (ctx.input.eventType !== 'reminder.deleted' && ctx.input.reminderId) {
        try {
          let client = new Client({ token: ctx.auth.token });
          let reminder = await client.getReminder(ctx.input.reminderId);
          output.name = reminder.name;
          output.entityId = reminder.entity.id;
          output.entityType = reminder.entity.entityType;
          output.lastTriggerTime = reminder.lastTriggerTime;
          output.nextTriggerTime = reminder.nextTriggerTime;
        } catch {
          // Reminder may not be fetchable
        }
      }

      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: output as {
          reminderId: string;
          reminderUrl: string;
          createdAt: string;
          name?: string;
          entityId?: string;
          entityType?: string;
          lastTriggerTime?: string | null;
          nextTriggerTime?: string | null;
        }
      };
    }
  })
  .build();
