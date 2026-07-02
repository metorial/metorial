import { SlateTool } from 'slates';
import { z } from 'zod';
import { SendlaneClient } from '../lib/client';
import { spec } from '../spec';

export let getContact = SlateTool.create(spec, {
  name: 'Get Contact',
  key: 'get_contact',
  description: `Retrieve detailed information about a specific contact, including their tags and custom field values.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      contactId: z.number().describe('Sendlane contact ID')
    })
  )
  .output(
    z.object({
      contactId: z.number().describe('Sendlane contact ID'),
      email: z.string().describe('Contact email address'),
      firstName: z.string().describe('Contact first name'),
      lastName: z.string().describe('Contact last name'),
      phone: z.string().describe('Contact phone number'),
      createdAt: z.string().describe('When the contact was created'),
      updatedAt: z.string().describe('When the contact was last updated'),
      tags: z
        .array(
          z.object({
            tagId: z.number(),
            tagName: z.string()
          })
        )
        .describe('Tags assigned to this contact'),
      customFields: z
        .array(
          z.object({
            customFieldId: z.number(),
            value: z.string()
          })
        )
        .describe('Custom field values for this contact')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SendlaneClient(ctx.auth.token);

    let contact = await client.getContact(ctx.input.contactId);
    let tags = await client.getContactTags(ctx.input.contactId);
    let customFields = await client.getContactCustomFields(ctx.input.contactId);

    return {
      output: {
        contactId: contact.id,
        email: contact.email ?? '',
        firstName: contact.first_name ?? '',
        lastName: contact.last_name ?? '',
        phone: contact.phone ?? '',
        createdAt: contact.created_at ?? '',
        updatedAt: contact.updated_at ?? '',
        tags: tags.map(t => ({
          tagId: t.id,
          tagName: t.name ?? ''
        })),
        customFields: customFields.map(cf => ({
          customFieldId: cf.custom_field_id,
          value: cf.value ?? ''
        }))
      },
      message: `Retrieved contact **${contact.email}** (ID: ${contact.id}) with ${tags.length} tags and ${customFields.length} custom fields.`
    };
  })
  .build();
