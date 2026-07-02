import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let contactInfoSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('email'),
    address: z.string().describe('Email address'),
    label: z.string().optional().describe('Label, e.g. "Work", "Home"')
  }),
  z.object({
    type: z.literal('phone_number'),
    phoneNumber: z.string().describe('Phone number with country code, e.g. "+15551234567"'),
    label: z.string().optional().describe('Label, e.g. "Mobile", "Work"')
  }),
  z.object({
    type: z.literal('twitter'),
    username: z.string().describe('Twitter/X username')
  }),
  z.object({
    type: z.literal('facebook'),
    url: z.string().describe('Facebook profile URL')
  }),
  z.object({
    type: z.literal('physical_address'),
    address: z.string().describe('Physical address'),
    label: z.string().optional().describe('Label, e.g. "Home", "Office"')
  }),
  z.object({
    type: z.literal('url'),
    url: z.string().describe('Website URL')
  }),
  z.object({
    type: z.literal('custom'),
    label: z.string().describe('Custom field label'),
    value: z.string().describe('Custom field value')
  })
]);

let contactFieldsSchema = z.object({
  firstName: z.string().optional().describe('First name'),
  lastName: z.string().optional().describe('Last name'),
  middleName: z.string().optional().describe('Middle name'),
  prefix: z.string().optional().describe('Name prefix'),
  suffix: z.string().optional().describe('Name suffix'),
  nickname: z.string().optional().describe('Nickname'),
  notes: z.string().optional().describe('Contact notes'),
  starred: z.boolean().optional().describe('Star the contact'),
  gender: z.string().optional().describe('Gender'),
  infos: z
    .array(contactInfoSchema)
    .optional()
    .describe(
      'Contact info entries (email, phone, etc.). Replaces all existing infos on update.'
    )
});

let contactOutputSchema = z.object({
  contactId: z.string().describe('Contact ID'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().optional().describe('Primary email if available')
});

export let manageContacts = SlateTool.create(spec, {
  name: 'Manage Contacts',
  key: 'manage_contacts',
  description: `Create or update contacts in a contact book. Contacts support rich data including emails, phone numbers, social accounts, physical addresses, and custom fields.
When updating, provide the contactId. When creating, provide the contactBookId.`,
  instructions: [
    'When updating infos (emails, phones, etc.), you must include ALL entries — the array replaces existing data entirely.',
    'Use the List Contacts tool to find contact IDs and current data before updating.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update'])
        .describe('Whether to create a new contact or update an existing one'),
      contactBookId: z.string().optional().describe('Contact book ID (required for create)'),
      contactId: z.string().optional().describe('Contact ID (required for update)'),
      fields: contactFieldsSchema.describe('Contact fields to set')
    })
  )
  .output(
    z.object({
      contacts: z.array(contactOutputSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let apiFields: Record<string, any> = {};
    let f = ctx.input.fields;
    if (f.firstName !== undefined) apiFields.first_name = f.firstName;
    if (f.lastName !== undefined) apiFields.last_name = f.lastName;
    if (f.middleName !== undefined) apiFields.middle_name = f.middleName;
    if (f.prefix !== undefined) apiFields.prefix = f.prefix;
    if (f.suffix !== undefined) apiFields.suffix = f.suffix;
    if (f.nickname !== undefined) apiFields.nickname = f.nickname;
    if (f.notes !== undefined) apiFields.notes = f.notes;
    if (f.starred !== undefined) apiFields.starred = f.starred;
    if (f.gender !== undefined) apiFields.gender = f.gender;
    if (f.infos) {
      apiFields.infos = f.infos.map(info => {
        if (info.type === 'phone_number') {
          return { type: 'phone_number', phone_number: info.phoneNumber, label: info.label };
        }
        return info;
      });
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.contactBookId)
        throw new Error('contactBookId is required for creating contacts');
      apiFields.contact_book = ctx.input.contactBookId;
      let data = await client.createContacts(apiFields);
      let contacts = Array.isArray(data.contacts) ? data.contacts : [data.contacts];
      return {
        output: {
          contacts: contacts.map((c: any) => ({
            contactId: c.id,
            firstName: c.first_name,
            lastName: c.last_name,
            email: c.infos?.find((i: any) => i.type === 'email')?.address
          }))
        },
        message: `Created **${contacts.length}** contact(s).`
      };
    } else {
      if (!ctx.input.contactId) throw new Error('contactId is required for updating contacts');
      let data = await client.updateContacts([ctx.input.contactId], apiFields);
      let contacts = Array.isArray(data.contacts) ? data.contacts : [data.contacts];
      return {
        output: {
          contacts: contacts.map((c: any) => ({
            contactId: c.id,
            firstName: c.first_name,
            lastName: c.last_name,
            email: c.infos?.find((i: any) => i.type === 'email')?.address
          }))
        },
        message: `Updated contact **${ctx.input.contactId}**.`
      };
    }
  })
  .build();
