import { SlateTool } from 'slates';
import { z } from 'zod';
import { SuperchatClient } from '../lib/client';
import { spec } from '../spec';

let contactHandleSchema = z.object({
  type: z.enum(['phone', 'mail']).describe('Type of handle'),
  value: z.string().describe('Handle value (phone number in E164 format or email address)')
});

let contactResponseSchema = z.object({
  contactId: z.string().describe('Unique contact identifier'),
  contactUrl: z.string().optional().describe('Resource URL of the contact'),
  firstName: z.string().optional().nullable().describe('First name'),
  lastName: z.string().optional().nullable().describe('Last name'),
  gender: z.string().optional().nullable().describe('Gender (female, male, diverse)'),
  handles: z
    .array(
      z.object({
        handleId: z.string().describe('Handle identifier'),
        type: z.string().describe('Handle type (phone or mail)'),
        value: z.string().describe('Handle value')
      })
    )
    .optional()
    .describe('Contact handles (phone numbers, emails)'),
  customAttributes: z
    .array(z.record(z.string(), z.any()))
    .optional()
    .describe('Custom attribute values'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

let mapContact = (contact: any) => ({
  contactId: contact.id,
  contactUrl: contact.url,
  firstName: contact.first_name,
  lastName: contact.last_name,
  gender: contact.gender,
  handles: contact.handles?.map((h: any) => ({
    handleId: h.id,
    type: h.type,
    value: h.value
  })),
  customAttributes: contact.custom_attributes,
  createdAt: contact.created_at,
  updatedAt: contact.updated_at
});

export let createContact = SlateTool.create(spec, {
  name: 'Create Contact',
  key: 'create_contact',
  description: `Create a new contact in your Superchat workspace with phone number and/or email handles, name, and optional custom attributes.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      handles: z
        .array(contactHandleSchema)
        .min(1)
        .describe('At least one handle (phone or email) is required'),
      firstName: z.string().optional().describe('Contact first name'),
      lastName: z.string().optional().describe('Contact last name'),
      gender: z.enum(['female', 'male', 'diverse']).optional().describe('Contact gender'),
      customAttributes: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Custom attribute objects')
    })
  )
  .output(contactResponseSchema)
  .handleInvocation(async ctx => {
    let client = new SuperchatClient({ token: ctx.auth.token });

    let result = await client.createContact({
      handles: ctx.input.handles,
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      gender: ctx.input.gender,
      customAttributes: ctx.input.customAttributes
    });

    let name = [result.first_name, result.last_name].filter(Boolean).join(' ') || 'Unknown';

    return {
      output: mapContact(result),
      message: `Contact **${name}** created with ID \`${result.id}\`.`
    };
  })
  .build();

export let getContact = SlateTool.create(spec, {
  name: 'Get Contact',
  key: 'get_contact',
  description: `Retrieve a contact's full details including handles, custom attributes, and timestamps.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      contactId: z.string().describe('ID of the contact to retrieve')
    })
  )
  .output(contactResponseSchema)
  .handleInvocation(async ctx => {
    let client = new SuperchatClient({ token: ctx.auth.token });
    let result = await client.getContact(ctx.input.contactId);

    let name = [result.first_name, result.last_name].filter(Boolean).join(' ') || 'Unknown';

    return {
      output: mapContact(result),
      message: `Retrieved contact **${name}** (\`${result.id}\`).`
    };
  })
  .build();

export let updateContact = SlateTool.create(spec, {
  name: 'Update Contact',
  key: 'update_contact',
  description: `Update an existing contact's name, gender, or custom attributes.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      contactId: z.string().describe('ID of the contact to update'),
      firstName: z.string().optional().describe('Updated first name'),
      lastName: z.string().optional().describe('Updated last name'),
      gender: z.enum(['female', 'male', 'diverse']).optional().describe('Updated gender'),
      customAttributes: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Updated custom attributes')
    })
  )
  .output(contactResponseSchema)
  .handleInvocation(async ctx => {
    let client = new SuperchatClient({ token: ctx.auth.token });

    let result = await client.updateContact(ctx.input.contactId, {
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      gender: ctx.input.gender,
      customAttributes: ctx.input.customAttributes
    });

    let name = [result.first_name, result.last_name].filter(Boolean).join(' ') || 'Unknown';

    return {
      output: mapContact(result),
      message: `Contact **${name}** (\`${result.id}\`) updated.`
    };
  })
  .build();

export let deleteContact = SlateTool.create(spec, {
  name: 'Delete Contact',
  key: 'delete_contact',
  description: `Permanently delete a contact from the workspace. This cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      contactId: z.string().describe('ID of the contact to delete')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('ID of the deleted contact')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SuperchatClient({ token: ctx.auth.token });
    let result = await client.deleteContact(ctx.input.contactId);

    return {
      output: {
        contactId: result.id || ctx.input.contactId
      },
      message: `Contact \`${ctx.input.contactId}\` deleted.`
    };
  })
  .build();

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `List contacts in the workspace with cursor-based pagination. Results are sorted by creation date descending.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Maximum number of contacts to return'),
      after: z.string().optional().describe('Cursor for forward pagination'),
      before: z.string().optional().describe('Cursor for backward pagination')
    })
  )
  .output(
    z.object({
      contacts: z.array(contactResponseSchema).describe('List of contacts'),
      pagination: z
        .object({
          next: z.string().optional().nullable().describe('Cursor for the next page'),
          previous: z.string().optional().nullable().describe('Cursor for the previous page')
        })
        .optional()
        .describe('Pagination cursors')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SuperchatClient({ token: ctx.auth.token });
    let result = await client.listContacts({
      limit: ctx.input.limit,
      after: ctx.input.after,
      before: ctx.input.before
    });

    let contacts = (result.results || []).map(mapContact);

    return {
      output: {
        contacts,
        pagination: result.pagination
      },
      message: `Retrieved **${contacts.length}** contact(s).`
    };
  })
  .build();

export let searchContacts = SlateTool.create(spec, {
  name: 'Search Contacts',
  key: 'search_contacts',
  description: `Search for contacts by phone number or email address. Returns matching contacts.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      field: z.enum(['phone', 'mail']).describe('Field to search by'),
      value: z.string().describe('Value to search for (phone number or email)')
    })
  )
  .output(
    z.object({
      contacts: z.array(contactResponseSchema).describe('Matching contacts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SuperchatClient({ token: ctx.auth.token });
    let result = await client.searchContacts(ctx.input.field, ctx.input.value);

    let contacts = (result.results || []).map(mapContact);

    return {
      output: { contacts },
      message: `Found **${contacts.length}** contact(s) matching ${ctx.input.field}=\`${ctx.input.value}\`.`
    };
  })
  .build();
