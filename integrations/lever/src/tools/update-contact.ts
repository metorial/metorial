import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { id, type Row, stringList, text } from '../lib/contracts';
import { spec } from '../spec';

export let updateContactTool = SlateTool.create(spec, {
  name: 'Update Contact',
  key: 'update_contact',
  description: `View or update a contact's information in Lever. Contacts represent unique individuals and are shared across all of their opportunities. Updating a contact affects all their opportunities.`,
  instructions: [
    'Provide contactId to view. Add fields to update them.',
    "Contact changes apply across all of the individual's opportunities."
  ]
})
  .input(
    z.object({
      contactId: z.string().describe('Contact ID to view or update'),
      name: z.string().optional().describe('Updated full name'),
      headline: z.string().optional().describe('Updated headline or current title'),
      location: z.string().optional().describe('Updated location'),
      emails: z
        .array(z.string())
        .optional()
        .describe('Updated email addresses (replaces existing)'),
      phones: z
        .array(
          z.object({
            type: z.enum(['mobile', 'home', 'work', 'other']).optional(),
            value: z.string()
          })
        )
        .optional()
        .describe('Updated phone numbers (replaces existing)')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('ID of the contact'),
      contact: z.any().describe('The contact object'),
      updated: z.boolean().describe('Whether the contact was updated (vs just viewed)')
    })
  )
  .handleInvocation(async ctx => {
    const contactId = id(ctx.input.contactId, 'Contact ID');
    const data: Row = {};
    for (const key of ['name', 'headline', 'location'] as const)
      if (ctx.input[key] !== undefined) data[key] = text(ctx.input[key], key, key !== 'name');
    if (ctx.input.emails !== undefined) data.emails = stringList(ctx.input.emails, 'Emails');
    if (ctx.input.phones !== undefined)
      data.phones = ctx.input.phones.map(phone => ({
        ...phone,
        value: text(phone.value, 'Phone number')
      }));
    const updated = Object.keys(data).length > 0;
    const client = new Client(ctx.auth);
    const result = updated
      ? await client.updateContact(contactId, data)
      : await client.getContact(contactId);
    return {
      output: { contactId: result.data.id, contact: result.data, updated },
      message: `${updated ? 'Updated' : 'Retrieved'} contact ${contactId}.`
    };
  })
  .build();
