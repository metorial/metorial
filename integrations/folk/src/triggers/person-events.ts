import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let changeSchema = z.object({
  path: z.array(z.string()).describe('Attribute path that changed'),
  type: z.enum(['add', 'remove', 'set']).describe('Type of change'),
  value: z.unknown().optional().describe('New value')
});

export let personEvents = SlateTrigger.create(spec, {
  name: 'Person Events',
  key: 'person_events',
  description:
    'Triggers when a person is created, updated, deleted, or their group membership changes in your Folk workspace.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of person event'),
      eventId: z.string().describe('Unique event ID'),
      personId: z.string().describe('ID of the affected person'),
      personUrl: z.string().describe('API URL to fetch person details'),
      changes: z.array(changeSchema).optional().describe('Changes made (for update events)'),
      details: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Additional details (for delete events)'),
      createdAt: z.string().describe('Event timestamp')
    })
  )
  .output(
    z.object({
      personId: z.string().describe('ID of the affected person'),
      personUrl: z.string().describe('API URL for the person'),
      fullName: z.string().optional().describe('Person full name (when available)'),
      firstName: z.string().optional().describe('Person first name (when available)'),
      lastName: z.string().optional().describe('Person last name (when available)'),
      emails: z.array(z.string()).optional().describe('Person emails (when available)'),
      phones: z.array(z.string()).optional().describe('Person phones (when available)'),
      jobTitle: z.string().optional().describe('Person job title (when available)'),
      changes: z.array(changeSchema).optional().describe('Specific changes made'),
      createdAt: z.string().describe('Event timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let webhook = await client.createWebhook({
        name: 'Slates - Person Events',
        targetUrl: ctx.input.webhookBaseUrl,
        subscribedEvents: [
          { eventType: 'person.created' },
          { eventType: 'person.updated' },
          { eventType: 'person.deleted' },
          { eventType: 'person.groups_updated' }
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
      let eventType = body.type as string;

      return {
        inputs: [
          {
            eventType,
            eventId: body.id as string,
            personId: (data?.id as string) ?? '',
            personUrl: (data?.url as string) ?? '',
            changes:
              (data?.changes as Array<{
                path: string[];
                type: 'add' | 'remove' | 'set';
                value?: unknown;
              }>) ?? undefined,
            details: (data?.details as Record<string, unknown>) ?? undefined,
            createdAt: body.createdAt as string
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let output: Record<string, unknown> = {
        personId: ctx.input.personId,
        personUrl: ctx.input.personUrl,
        createdAt: ctx.input.createdAt
      };

      if (ctx.input.changes) {
        output.changes = ctx.input.changes;
      }

      // For delete events, details contain name/emails since the resource is gone
      if (ctx.input.details) {
        let details = ctx.input.details;
        if (details.fullName) output.fullName = details.fullName;
        if (details.firstName) output.firstName = details.firstName;
        if (details.lastName) output.lastName = details.lastName;
        if (details.emails) output.emails = details.emails;
      }

      // For non-delete events, try to fetch person details
      if (ctx.input.eventType !== 'person.deleted' && ctx.input.personId) {
        try {
          let client = new Client({ token: ctx.auth.token });
          let person = await client.getPerson(ctx.input.personId);
          output.fullName = person.fullName;
          output.firstName = person.firstName;
          output.lastName = person.lastName;
          output.emails = person.emails;
          output.phones = person.phones;
          output.jobTitle = person.jobTitle;
        } catch {
          // Person may not be fetchable; continue with available data
        }
      }

      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: output as {
          personId: string;
          personUrl: string;
          createdAt: string;
          fullName?: string;
          firstName?: string;
          lastName?: string;
          emails?: string[];
          phones?: string[];
          jobTitle?: string;
          changes?: Array<{ path: string[]; type: 'add' | 'remove' | 'set'; value?: unknown }>;
        }
      };
    }
  })
  .build();
