import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let companyObjectSchema = z.object({
  companyId: z.string().describe('Internal Userlist company ID.'),
  identifier: z
    .string()
    .optional()
    .nullable()
    .describe('Application-provided company identifier.'),
  name: z.string().optional().nullable().describe('Company name.'),
  signedUpAt: z.string().optional().nullable().describe('When the company signed up.'),
  properties: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Custom company properties.'),
  createdAt: z.string().optional().describe('When the company record was created.'),
  updatedAt: z.string().optional().describe('When the company record was last updated.')
});

export let companyEvents = SlateTrigger.create(spec, {
  name: 'Company Events',
  key: 'company_events',
  description: 'Triggers when a company is created or updated in Userlist.'
})
  .input(
    z.object({
      eventName: z.string().describe('The webhook event name.'),
      eventId: z.string().describe('Unique event ID for deduplication.'),
      company: z
        .record(z.string(), z.unknown())
        .describe('Raw company object from the webhook payload.'),
      occurredAt: z.string().describe('When the event occurred.')
    })
  )
  .output(companyObjectSchema)
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;
      let eventName = data.name as string;

      let validEvents = ['company_created', 'company_updated'];
      if (!validEvents.includes(eventName)) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventName,
            eventId: data.id,
            company: data.company || {},
            occurredAt: data.occurred_at
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let company = ctx.input.company as any;

      return {
        type: ctx.input.eventName,
        id: ctx.input.eventId,
        output: {
          companyId: company.id || '',
          identifier: company.identifier || null,
          name: company.name || null,
          signedUpAt: company.signed_up_at || null,
          properties: company.properties || {},
          createdAt: company.created_at || undefined,
          updatedAt: company.updated_at || undefined
        }
      };
    }
  })
  .build();
