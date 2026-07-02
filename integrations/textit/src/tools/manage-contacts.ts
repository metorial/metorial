import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageContacts = SlateTool.create(spec, {
  name: 'Manage Contacts',
  key: 'manage_contacts',
  description: `Create, update, or delete contacts in your TextIt workspace. Contacts can be identified by UUID or URN (e.g., \`tel:+250788123123\`, \`twitter:jack\`, \`mailto:user@example.com\`). You can set contact name, language, URNs, group memberships, and custom field values.`,
  instructions: [
    'To create a new contact, set action to "create" and provide at least one URN.',
    'To update a contact, set action to "update" and provide contactUuid or contactUrn to identify the contact.',
    'To delete a contact, set action to "delete" and provide contactUuid or contactUrn.',
    'Phone URNs must be in E.164 format (e.g., tel:+1234567890).',
    'Language must be a 3-letter ISO-639-3 code (e.g., "eng", "fra").'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('The action to perform'),
      contactUuid: z.string().optional().describe('UUID of the contact (for update/delete)'),
      contactUrn: z
        .string()
        .optional()
        .describe('URN of the contact (for update/delete, e.g., tel:+250788123123)'),
      name: z.string().optional().describe('Full name of the contact'),
      language: z
        .string()
        .optional()
        .describe('3-letter ISO-639-3 language code (e.g., eng, fra)'),
      urns: z
        .array(z.string())
        .optional()
        .describe(
          'List of URNs for the contact (e.g., ["tel:+250788123123", "mailto:user@example.com"])'
        ),
      groupUuids: z
        .array(z.string())
        .optional()
        .describe('List of group UUIDs the contact should belong to'),
      fields: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom field key-value pairs to set on the contact')
    })
  )
  .output(
    z.object({
      contactUuid: z.string().optional().describe('UUID of the contact'),
      name: z.string().nullable().optional().describe('Name of the contact'),
      status: z.string().optional().describe('Status of the contact'),
      language: z.string().nullable().optional().describe('Language of the contact'),
      urns: z.array(z.string()).optional().describe('URNs associated with the contact'),
      groups: z
        .array(
          z.object({
            groupUuid: z.string(),
            name: z.string()
          })
        )
        .optional()
        .describe('Groups the contact belongs to'),
      fields: z
        .record(z.string(), z.string().nullable())
        .optional()
        .describe('Custom field values'),
      createdOn: z.string().optional().describe('When the contact was created'),
      modifiedOn: z.string().optional().describe('When the contact was last modified')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    if (ctx.input.action === 'delete') {
      await client.deleteContact({
        uuid: ctx.input.contactUuid,
        urn: ctx.input.contactUrn
      });
      return {
        output: {},
        message: `Contact deleted successfully.`
      };
    }

    let data = {
      name: ctx.input.name,
      language: ctx.input.language,
      urns: ctx.input.urns,
      groups: ctx.input.groupUuids,
      fields: ctx.input.fields
    };

    let contact: any;
    if (ctx.input.action === 'create') {
      contact = await client.createContact(data);
    } else {
      contact = await client.updateContact(
        { uuid: ctx.input.contactUuid, urn: ctx.input.contactUrn },
        data
      );
    }

    return {
      output: {
        contactUuid: contact.uuid,
        name: contact.name,
        status: contact.status,
        language: contact.language,
        urns: contact.urns,
        groups: contact.groups.map((g: any) => ({ groupUuid: g.uuid, name: g.name })),
        fields: contact.fields,
        createdOn: contact.created_on,
        modifiedOn: contact.modified_on
      },
      message: `Contact **${contact.name || contact.uuid}** ${ctx.input.action === 'create' ? 'created' : 'updated'} successfully.`
    };
  })
  .build();
