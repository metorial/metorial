import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let sendEvent = SlateTool.create(spec, {
  name: 'Send Lead Event',
  key: 'send_event',
  description: `Send a lead or event to Follow Up Boss. Use this to notify FUB when events occur on your website or system (e.g., registration, property inquiry, seller inquiry). FUB will automatically match or create the associated contact and may trigger action plans.`,
  instructions: [
    'Provide at least a "person" object with the lead\'s contact info (email or phone required).',
    'Supported event types: Registration, Property Inquiry, Seller Inquiry, General Inquiry, Visited Open House.',
    'New leads created by this method will only trigger action plans for specified event types.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      source: z.string().optional().describe('Lead source name'),
      system: z.string().optional().describe('System name (overrides X-System)'),
      type: z
        .enum([
          'Registration',
          'Property Inquiry',
          'Seller Inquiry',
          'General Inquiry',
          'Visited Open House',
          'Other'
        ])
        .optional()
        .describe('Event type'),
      message: z.string().optional().describe('Message or description of the event'),
      description: z.string().optional().describe('Additional description'),
      person: z
        .object({
          firstName: z.string().optional(),
          lastName: z.string().optional(),
          emails: z
            .array(z.object({ value: z.string(), type: z.string().optional() }))
            .optional(),
          phones: z
            .array(z.object({ value: z.string(), type: z.string().optional() }))
            .optional(),
          tags: z.array(z.string()).optional()
        })
        .describe('Person/lead information'),
      property: z
        .object({
          street: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          code: z.string().optional(),
          mlsNumber: z.string().optional(),
          price: z.number().optional(),
          forRent: z.boolean().optional(),
          url: z.string().optional(),
          type: z.string().optional(),
          bedrooms: z.number().optional(),
          bathrooms: z.number().optional(),
          area: z.number().optional()
        })
        .optional()
        .describe('Property details associated with the event'),
      campaign: z.string().optional().describe('Campaign name for marketing tracking'),
      medium: z.string().optional().describe('Marketing medium (e.g., "cpc", "email")'),
      content: z.string().optional().describe('Campaign content identifier'),
      term: z.string().optional().describe('Campaign search term')
    })
  )
  .output(
    z.object({
      eventId: z.number().optional(),
      personId: z.number().optional(),
      created: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let data: Record<string, any> = {};

    if (ctx.input.source) data.source = ctx.input.source;
    if (ctx.input.system) data.system = ctx.input.system;
    if (ctx.input.type) data.type = ctx.input.type;
    if (ctx.input.message) data.message = ctx.input.message;
    if (ctx.input.description) data.description = ctx.input.description;
    if (ctx.input.person) data.person = ctx.input.person;
    if (ctx.input.property) data.property = ctx.input.property;
    if (ctx.input.campaign) data.campaign = ctx.input.campaign;
    if (ctx.input.medium) data.medium = ctx.input.medium;
    if (ctx.input.content) data.content = ctx.input.content;
    if (ctx.input.term) data.term = ctx.input.term;

    let result = await client.createEvent(data);

    return {
      output: {
        eventId: result.id,
        personId: result.personId,
        created: true
      },
      message: `Created event${ctx.input.type ? ` of type **${ctx.input.type}**` : ''}${result.personId ? ` for person ID **${result.personId}**` : ''}.`
    };
  })
  .build();
