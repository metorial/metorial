import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let contactOutputSchema = z.object({
  contactId: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  avatarUrl: z.string().optional(),
  isSpammer: z.boolean(),
  handles: z.array(
    z.object({
      handle: z.string(),
      source: z.string()
    })
  ),
  customFields: z.record(z.string(), z.string()).optional()
});

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `List and search contacts in Front. Supports filtering by search query and pagination.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      query: z.string().optional().describe('Search query to filter contacts'),
      pageToken: z.string().optional().describe('Pagination token'),
      limit: z.number().optional().describe('Maximum number of results'),
      sortBy: z.string().optional().describe('Field to sort by'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort order')
    })
  )
  .output(
    z.object({
      contacts: z.array(contactOutputSchema),
      nextPageToken: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listContacts({
      q: ctx.input.query,
      page_token: ctx.input.pageToken,
      limit: ctx.input.limit,
      sort_by: ctx.input.sortBy,
      sort_order: ctx.input.sortOrder
    });

    let contacts = result._results.map(c => ({
      contactId: c.id,
      name: c.name,
      description: c.description,
      avatarUrl: c.avatar_url,
      isSpammer: c.is_spammer,
      handles: c.handles,
      customFields: c.custom_fields
    }));

    return {
      output: { contacts, nextPageToken: result._pagination?.next || undefined },
      message: `Found **${contacts.length}** contacts${ctx.input.query ? ` matching "${ctx.input.query}"` : ''}.`
    };
  });

export let getContact = SlateTool.create(spec, {
  name: 'Get Contact',
  key: 'get_contact',
  description: `Retrieve detailed information about a specific contact, including their handles, custom fields, and optionally their conversations.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      contactId: z
        .string()
        .describe(
          'ID of the contact (e.g., crd_abc123) or an email handle alias like alt:email:user@example.com'
        ),
      includeConversations: z
        .boolean()
        .optional()
        .describe('Whether to also fetch recent conversations with this contact')
    })
  )
  .output(
    z.object({
      contact: contactOutputSchema,
      conversations: z
        .array(
          z.object({
            conversationId: z.string(),
            subject: z.string(),
            status: z.string()
          })
        )
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let contact = await client.getContact(ctx.input.contactId);

    let conversations: any;
    if (ctx.input.includeConversations) {
      let convResult = await client.listContactConversations(ctx.input.contactId);
      conversations = convResult._results.map(c => ({
        conversationId: c.id,
        subject: c.subject,
        status: c.status
      }));
    }

    return {
      output: {
        contact: {
          contactId: contact.id,
          name: contact.name,
          description: contact.description,
          avatarUrl: contact.avatar_url,
          isSpammer: contact.is_spammer,
          handles: contact.handles,
          customFields: contact.custom_fields
        },
        conversations
      },
      message: `Retrieved contact **${contact.name || contact.id}**${conversations ? ` with ${conversations.length} conversations` : ''}.`
    };
  });

export let createContact = SlateTool.create(spec, {
  name: 'Create Contact',
  key: 'create_contact',
  description: `Create a new contact in Front with specified handles (email, phone, etc.), name, and custom fields.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      name: z.string().optional().describe('Contact name'),
      description: z.string().optional().describe('Contact description'),
      handles: z
        .array(
          z.object({
            handle: z.string().describe('Handle value (email, phone, etc.)'),
            source: z.string().describe('Handle source type (e.g., email, phone, twitter)')
          })
        )
        .optional()
        .describe('Contact handles'),
      groupNames: z.array(z.string()).optional().describe('Contact group names to assign'),
      customFields: z.record(z.string(), z.string()).optional().describe('Custom field values')
    })
  )
  .output(contactOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let contact = await client.createContact({
      name: ctx.input.name,
      description: ctx.input.description,
      handles: ctx.input.handles,
      group_names: ctx.input.groupNames,
      custom_fields: ctx.input.customFields
    });

    return {
      output: {
        contactId: contact.id,
        name: contact.name,
        description: contact.description,
        avatarUrl: contact.avatar_url,
        isSpammer: contact.is_spammer,
        handles: contact.handles,
        customFields: contact.custom_fields
      },
      message: `Created contact **${contact.name || contact.id}**.`
    };
  });

export let updateContact = SlateTool.create(spec, {
  name: 'Update Contact',
  key: 'update_contact',
  description: `Update an existing contact's information including name, description, handles, and custom fields. Supports adding and removing individual handles.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      contactId: z.string().describe('ID of the contact to update'),
      name: z.string().optional().describe('Updated name'),
      description: z.string().optional().describe('Updated description'),
      isSpammer: z.boolean().optional().describe('Mark/unmark as spammer'),
      groupNames: z.array(z.string()).optional().describe('Updated group names'),
      customFields: z
        .record(z.string(), z.string())
        .optional()
        .describe('Updated custom field values'),
      addHandles: z
        .array(
          z.object({
            handle: z.string(),
            source: z.string()
          })
        )
        .optional()
        .describe('Handles to add to the contact'),
      removeHandles: z
        .array(
          z.object({
            handle: z.string(),
            source: z.string()
          })
        )
        .optional()
        .describe('Handles to remove from the contact')
    })
  )
  .output(contactOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let contact = await client.updateContact(ctx.input.contactId, {
      name: ctx.input.name,
      description: ctx.input.description,
      is_spammer: ctx.input.isSpammer,
      group_names: ctx.input.groupNames,
      custom_fields: ctx.input.customFields
    });

    if (ctx.input.addHandles) {
      for (let h of ctx.input.addHandles) {
        await client.addContactHandle(ctx.input.contactId, h.handle, h.source);
      }
    }

    if (ctx.input.removeHandles) {
      for (let h of ctx.input.removeHandles) {
        await client.deleteContactHandle(ctx.input.contactId, h);
      }
    }

    return {
      output: {
        contactId: contact.id,
        name: contact.name,
        description: contact.description,
        avatarUrl: contact.avatar_url,
        isSpammer: contact.is_spammer,
        handles: contact.handles,
        customFields: contact.custom_fields
      },
      message: `Updated contact **${contact.name || contact.id}**.`
    };
  });

export let deleteContact = SlateTool.create(spec, {
  name: 'Delete Contact',
  key: 'delete_contact',
  description: `Permanently delete a contact from Front. This action cannot be undone.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      contactId: z.string().describe('ID of the contact to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteContact(ctx.input.contactId);

    return {
      output: { deleted: true },
      message: `Deleted contact ${ctx.input.contactId}.`
    };
  });
