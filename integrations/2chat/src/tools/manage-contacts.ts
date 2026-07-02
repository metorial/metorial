import { SlateTool } from 'slates';
import { z } from 'zod';
import { TwoChatClient } from '../lib/client';
import { spec } from '../spec';

let contactDetailSchema = z.object({
  type: z
    .enum(['phone', 'email', 'address', 'url', 'note'])
    .describe('Type of contact detail'),
  value: z.string().describe('The value of the contact detail'),
  label: z.string().optional().describe('Label for the detail (e.g., "work", "home")')
});

let contactSchema = z.object({
  contactUuid: z.string().optional().describe('UUID of the contact'),
  firstName: z.string().optional().describe('First name'),
  lastName: z.string().optional().describe('Last name'),
  details: z
    .array(contactDetailSchema)
    .optional()
    .describe('Contact details (phone, email, etc.)'),
  createdAt: z.string().optional().describe('When the contact was created')
});

export let manageContacts = SlateTool.create(spec, {
  name: 'Manage Contacts',
  key: 'manage_contacts',
  description: `Create new contacts or search existing contacts in your 2Chat directory. Each contact must have at least a first name and some contact details like a phone number or email.`,
  instructions: [
    'Use action "create" to add a new contact with details.',
    'Use action "search" to find contacts by name, phone number, or email.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'search']).describe('Action to perform'),
      firstName: z
        .string()
        .optional()
        .describe('First name of the contact (required for "create")'),
      lastName: z.string().optional().describe('Last name of the contact'),
      details: z
        .array(contactDetailSchema)
        .optional()
        .describe('Contact details (required for "create")'),
      query: z.string().optional().describe('Search query (for "search")')
    })
  )
  .output(
    z.object({
      contact: contactSchema.optional().describe('Created contact (for "create")'),
      contacts: z.array(contactSchema).optional().describe('Found contacts (for "search")')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TwoChatClient({ token: ctx.auth.token });

    if (ctx.input.action === 'create') {
      let result = await client.createContact({
        firstName: ctx.input.firstName!,
        lastName: ctx.input.lastName,
        details: ctx.input.details || []
      });

      let contact = result.contact || result;

      return {
        output: {
          contact: {
            contactUuid: contact.uuid || contact.contact_uuid,
            firstName: contact.first_name || ctx.input.firstName,
            lastName: contact.last_name || ctx.input.lastName,
            details: (contact.details || []).map((d: any) => ({
              type: d.type,
              value: d.value,
              label: d.label
            })),
            createdAt: contact.created_at
          }
        },
        message: `Created contact **${ctx.input.firstName} ${ctx.input.lastName || ''}**.`
      };
    }

    // Search
    let result = await client.searchContacts(ctx.input.query || '');
    let contacts = (result.contacts || result.data || []).map((c: any) => ({
      contactUuid: c.uuid || c.contact_uuid,
      firstName: c.first_name,
      lastName: c.last_name,
      details: (c.details || []).map((d: any) => ({
        type: d.type,
        value: d.value,
        label: d.label
      })),
      createdAt: c.created_at
    }));

    return {
      output: { contacts },
      message: `Found **${contacts.length}** contact(s) matching "${ctx.input.query}".`
    };
  })
  .build();
