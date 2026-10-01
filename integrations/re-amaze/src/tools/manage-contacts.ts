import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let contactSchema = z.object({
  name: z.string().nullable().optional().describe('Contact name'),
  email: z.string().nullable().optional().describe('Contact email'),
  mobile: z.string().nullable().optional().describe('Contact mobile number'),
  externalId: z.string().nullable().optional().describe('External contact identifier'),
  friendlyName: z.string().nullable().optional().describe('Friendly display name'),
  createdAt: z.string().optional().describe('ISO 8601 creation timestamp'),
  externalAvatarUrl: z.string().nullable().optional().describe('External avatar URL'),
  customAttributes: z
    .record(z.string(), z.string())
    .optional()
    .describe('Custom data attributes')
});

let mapContact = (c: any) => ({
  name: c.name,
  email: c.email,
  mobile: c.mobile,
  externalId: c.id == null ? c.id : String(c.id),
  friendlyName: c.friendly_name,
  createdAt: c.created_at,
  externalAvatarUrl: c.external_avatar_url,
  customAttributes: c.data
});

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `Search and list customer contacts across the account. Supports searching by name or email, filtering by contact type (email or mobile), and custom attribute matching. Results are paginated.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Search by name or email'),
      type: z
        .enum(['email', 'mobile'])
        .optional()
        .describe('Filter contacts by contact method type'),
      sort: z.enum(['date']).optional().describe('Sort by creation date descending'),
      customAttributes: z
        .record(z.string(), z.string())
        .optional()
        .describe('Filter by custom data attributes (key-value pairs)'),
      page: z.number().int().positive().optional().describe('Page number, starting at 1')
    })
  )
  .output(
    z.object({
      pageSize: z.number().describe('Number of items per page'),
      pageCount: z.number().describe('Total number of pages'),
      totalCount: z.number().describe('Total number of matching contacts'),
      contacts: z.array(contactSchema).describe('List of contacts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      loginEmail: ctx.auth.loginEmail,
      brandSubdomain: ctx.config.brandSubdomain
    });

    let result = await client.listContacts({
      q: ctx.input.query,
      type: ctx.input.type,
      sort: ctx.input.sort,
      data: ctx.input.customAttributes,
      page: ctx.input.page
    });

    let contacts = (result.contacts || []).map(mapContact);

    return {
      output: {
        pageSize: result.page_size,
        pageCount: result.page_count,
        totalCount: result.total_count,
        contacts
      },
      message: `Found **${result.total_count}** contacts.`
    };
  })
  .build();

export let createContact = SlateTool.create(spec, {
  name: 'Create Contact',
  key: 'create_contact',
  description: `Create a new customer contact record with a name and either an email address or mobile phone number (E.164 format). Optionally set custom attributes and notes.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Contact name'),
      email: z
        .string()
        .optional()
        .describe('Contact email address (provide either email or mobile)'),
      mobile: z
        .string()
        .optional()
        .describe('Mobile number in E.164 format, e.g., +12223334444'),
      externalId: z
        .string()
        .optional()
        .describe('External unique identifier from your system'),
      externalAvatarUrl: z
        .string()
        .optional()
        .describe('Absolute URL to the contact avatar image'),
      notes: z.array(z.string()).optional().describe('Initial notes to attach to the contact'),
      customAttributes: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom data attributes (single-level key-value pairs)')
    })
  )
  .output(contactSchema)
  .handleInvocation(async ctx => {
    if (!ctx.input.email && !ctx.input.mobile) {
      throw createApiServiceError(
        'Provide an email address or mobile number to create a contact.'
      );
    }
    if (ctx.input.email !== undefined && !z.email().safeParse(ctx.input.email).success) {
      throw createApiServiceError('Provide a valid contact email address.');
    }
    if (ctx.input.mobile !== undefined && !/^\+[1-9]\d{1,14}$/.test(ctx.input.mobile)) {
      throw createApiServiceError(
        'Provide a mobile number in E.164 format, such as +12223334444.'
      );
    }
    if (
      ctx.input.externalAvatarUrl !== undefined &&
      !z.url().safeParse(ctx.input.externalAvatarUrl).success
    ) {
      throw createApiServiceError('Provide an absolute URL for externalAvatarUrl.');
    }

    let client = new Client({
      token: ctx.auth.token,
      loginEmail: ctx.auth.loginEmail,
      brandSubdomain: ctx.config.brandSubdomain
    });

    let result = await client.createContact({
      name: ctx.input.name,
      email: ctx.input.email,
      mobile: ctx.input.mobile,
      id: ctx.input.externalId,
      externalAvatarUrl: ctx.input.externalAvatarUrl,
      notes: ctx.input.notes,
      data: ctx.input.customAttributes
    });

    let c = result.contact || result;

    return {
      output: mapContact(c),
      message: `Created contact **${c.name}** (${c.email || c.mobile}).`
    };
  })
  .build();

export let updateContact = SlateTool.create(spec, {
  name: 'Update Contact',
  key: 'update_contact',
  description: `Update an existing contact's name, friendly name, avatar, custom attributes, or add new notes. Contacts are identified by email, mobile, or social identifier.`,
  constraints: ['Cannot change the email, mobile, or other identifier of a contact.'],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      contactIdentifier: z
        .string()
        .describe('The contact identifier (email, phone number, or social handle)'),
      identifierType: z
        .enum(['email', 'mobile', 'facebook', 'twitter', 'instagram'])
        .optional()
        .describe('Type of identifier provided (defaults to email)'),
      name: z.string().optional().describe('Updated contact name'),
      friendlyName: z.string().optional().describe('Updated friendly display name'),
      externalAvatarUrl: z.string().optional().describe('Updated avatar URL'),
      notes: z.array(z.string()).optional().describe('New notes to add to the contact'),
      customAttributes: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom data attributes to update')
    })
  )
  .output(contactSchema)
  .handleInvocation(async ctx => {
    if (!ctx.input.contactIdentifier.trim()) {
      throw createApiServiceError('Provide the contact identifier to update.');
    }
    if (
      ctx.input.name === undefined &&
      ctx.input.friendlyName === undefined &&
      ctx.input.externalAvatarUrl === undefined &&
      ctx.input.notes === undefined &&
      ctx.input.customAttributes === undefined
    ) {
      throw createApiServiceError('Provide at least one contact field to update.');
    }
    if (
      ctx.input.externalAvatarUrl !== undefined &&
      !z.url().safeParse(ctx.input.externalAvatarUrl).success
    ) {
      throw createApiServiceError('Provide an absolute URL for externalAvatarUrl.');
    }

    let client = new Client({
      token: ctx.auth.token,
      loginEmail: ctx.auth.loginEmail,
      brandSubdomain: ctx.config.brandSubdomain
    });

    let result = await client.updateContact(ctx.input.contactIdentifier, {
      name: ctx.input.name,
      friendlyName: ctx.input.friendlyName,
      externalAvatarUrl: ctx.input.externalAvatarUrl,
      notes: ctx.input.notes,
      data: ctx.input.customAttributes,
      identifierType: ctx.input.identifierType
    });

    let c = result.contact || result;

    return {
      output: mapContact(c),
      message: `Updated contact **${c.name || ctx.input.contactIdentifier}**.`
    };
  })
  .build();
