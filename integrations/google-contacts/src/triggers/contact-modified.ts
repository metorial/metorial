import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { contactOutputSchema, formatContact } from '../lib/schemas';
import { googleContactsActionScopes } from '../scopes';
import { spec } from '../spec';
import {
  contactModificationEventSchema,
  contactModifications
} from './contact-modifications-trigger-group';

export const contactModified = SlateTrigger.create(spec, {
  name: 'Contact Modified',
  key: 'contact_modified',
  description:
    'Triggers for recently modified contacts. New contacts may appear as modified; deletions are unavailable.'
})
  .triggerGroup(contactModifications)
  .scopes(googleContactsActionScopes.contactModified)
  .input(contactModificationEventSchema)
  .output(
    contactOutputSchema.extend({
      changeType: z.literal('modified').describe('The contact was modified recently')
    })
  )
  .matches(payload => {
    const parsed = contactModificationEventSchema.safeParse(payload);
    return parsed.success && parsed.data.resourceName === parsed.data.contact.resourceName;
  })
  .map(async ctx => ({
    type: 'contact.modified',
    id: ctx.input.eventId,
    output: { ...formatContact(ctx.input.contact), changeType: 'modified' }
  }))
  .build();
