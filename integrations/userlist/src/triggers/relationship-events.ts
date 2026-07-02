import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let relationshipEvents = SlateTrigger.create(spec, {
  name: 'Relationship Events',
  key: 'relationship_events',
  description: 'Triggers when a user-company relationship is created or updated in Userlist.'
})
  .input(
    z.object({
      eventName: z.string().describe('The webhook event name.'),
      eventId: z.string().describe('Unique event ID for deduplication.'),
      user: z
        .record(z.string(), z.unknown())
        .describe('Raw user object from the webhook payload.'),
      company: z
        .record(z.string(), z.unknown())
        .describe('Raw company object from the webhook payload.'),
      relationship: z
        .record(z.string(), z.unknown())
        .describe('Raw relationship object from the webhook payload.'),
      occurredAt: z.string().describe('When the event occurred.')
    })
  )
  .output(
    z.object({
      relationshipId: z.string().describe('Internal Userlist relationship ID.'),
      userId: z.string().describe('Internal Userlist user ID.'),
      userIdentifier: z
        .string()
        .optional()
        .nullable()
        .describe('Application-provided user identifier.'),
      userEmail: z.string().optional().nullable().describe('User email address.'),
      companyId: z.string().describe('Internal Userlist company ID.'),
      companyIdentifier: z
        .string()
        .optional()
        .nullable()
        .describe('Application-provided company identifier.'),
      companyName: z.string().optional().nullable().describe('Company name.'),
      properties: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Custom relationship properties (e.g. role).'),
      createdAt: z.string().optional().describe('When the relationship was created.'),
      updatedAt: z.string().optional().describe('When the relationship was last updated.')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;
      let eventName = data.name as string;

      let validEvents = ['relationship_created', 'relationship_updated'];
      if (!validEvents.includes(eventName)) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventName,
            eventId: data.id,
            user: data.user || {},
            company: data.company || {},
            relationship: data.relationship || {},
            occurredAt: data.occurred_at
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let user = ctx.input.user as any;
      let company = ctx.input.company as any;
      let relationship = ctx.input.relationship as any;

      return {
        type: ctx.input.eventName,
        id: ctx.input.eventId,
        output: {
          relationshipId: relationship.id || '',
          userId: user.id || '',
          userIdentifier: user.identifier || null,
          userEmail: user.email || null,
          companyId: company.id || '',
          companyIdentifier: company.identifier || null,
          companyName: company.name || null,
          properties: relationship.properties || {},
          createdAt: relationship.created_at || undefined,
          updatedAt: relationship.updated_at || undefined
        }
      };
    }
  })
  .build();
