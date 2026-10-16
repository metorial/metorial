import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  contactIdSchema,
  dateFilterSchemas,
  eventSchema,
  pageMetadata,
  pageMetadataSchema
} from '../lib/schemas';
import { spec } from '../spec';

export let listContactEvents = SlateTool.create(spec, {
  name: 'List Contact Events',
  key: 'list_contact_events',
  description:
    'Find the events associated with a contact, including registration data in the provider result. Call list_contacts to discover the contact ID.',
  tags: { readOnly: true }
})
  .input(z.object({ contactId: contactIdSchema, ...dateFilterSchemas }))
  .output(z.object({ events: z.array(eventSchema), ...pageMetadataSchema }))
  .handleInvocation(async ctx => {
    let { contactId, ...filters } = ctx.input;
    let result = await new Client(ctx.auth.token).getContactEvents(contactId, filters);
    return {
      output: {
        events: result.items.map(event => ({ ...event, eventId: event.id })),
        ...pageMetadata(result)
      },
      message: `Found **${result.items.length}** event(s) for contact \`${contactId}\`.`
    };
  })
  .build();
