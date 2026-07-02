import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createOrUpdateContact = SlateTool.create(spec, {
  name: 'Create or Update Contact',
  key: 'create_or_update_contact',
  description: `Create a new contact or update an existing one in Brevo. Supports setting email, custom attributes, list membership, and blacklist status.
When updating, identify the contact by email, contact ID, or external ID.`,
  instructions: [
    'Attribute names must be capitalized (e.g., FIRSTNAME, LASTNAME) and must exist in your Brevo account.',
    'To update an existing contact during creation, set updateEnabled to true.',
    'At least one of email or extId must be provided when creating.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      email: z.string().optional().describe('Contact email address'),
      extId: z.string().optional().describe('External ID for the contact'),
      attributes: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom attributes (keys must be capitalized, e.g., FIRSTNAME, LASTNAME)'),
      listIds: z.array(z.number()).optional().describe('List IDs to add the contact to'),
      emailBlacklisted: z
        .boolean()
        .optional()
        .describe('Whether to blacklist the contact for emails'),
      smsBlacklisted: z
        .boolean()
        .optional()
        .describe('Whether to blacklist the contact for SMS'),
      updateEnabled: z
        .boolean()
        .optional()
        .describe('If true, update existing contact if already present')
    })
  )
  .output(
    z.object({
      contactId: z.number().describe('ID of the created or updated contact')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    let result = await client.createContact({
      email: ctx.input.email,
      extId: ctx.input.extId,
      attributes: ctx.input.attributes,
      listIds: ctx.input.listIds,
      emailBlacklisted: ctx.input.emailBlacklisted,
      smsBlacklisted: ctx.input.smsBlacklisted,
      updateEnabled: ctx.input.updateEnabled
    });

    let action = ctx.input.updateEnabled ? 'created/updated' : 'created';
    return {
      output: result,
      message: `Contact ${action} successfully. Contact ID: **${result.contactId}**`
    };
  });

export let getContact = SlateTool.create(spec, {
  name: 'Get Contact',
  key: 'get_contact',
  description: `Retrieve detailed information about a specific contact, including attributes, list memberships, and email statistics.
Look up by email, contact ID, external ID, phone number, or WhatsApp ID.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      identifier: z
        .string()
        .describe('Contact email, contact ID, external ID, phone number, or WhatsApp ID'),
      identifierType: z
        .enum([
          'email_id',
          'contact_id',
          'ext_id',
          'phone_id',
          'whatsapp_id',
          'landline_number_id'
        ])
        .optional()
        .describe(
          'Type of identifier provided. Required for ext_id, phone_id, whatsapp_id, landline_number_id'
        )
    })
  )
  .output(
    z.object({
      contactId: z.number().describe('Contact ID'),
      email: z.string().optional().describe('Contact email address'),
      emailBlacklisted: z.boolean().describe('Whether email is blacklisted'),
      smsBlacklisted: z.boolean().describe('Whether SMS is blacklisted'),
      createdAt: z.string().describe('Contact creation timestamp'),
      modifiedAt: z.string().describe('Last modification timestamp'),
      attributes: z.record(z.string(), z.any()).optional().describe('Custom attributes'),
      listIds: z.array(z.number()).describe('IDs of lists the contact belongs to'),
      listUnsubscribed: z
        .array(z.number())
        .optional()
        .describe('IDs of lists the contact unsubscribed from'),
      statistics: z.any().optional().describe('Campaign statistics for this contact')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    let contact = await client.getContact(ctx.input.identifier, ctx.input.identifierType);

    return {
      output: {
        contactId: contact.id,
        email: contact.email,
        emailBlacklisted: contact.emailBlacklisted,
        smsBlacklisted: contact.smsBlacklisted,
        createdAt: contact.createdAt,
        modifiedAt: contact.modifiedAt,
        attributes: contact.attributes,
        listIds: contact.listIds ?? [],
        listUnsubscribed: contact.listUnsubscribed,
        statistics: contact.statistics
      },
      message: `Retrieved contact **${contact.email || ctx.input.identifier}** (ID: ${contact.id})`
    };
  });

export let updateContact = SlateTool.create(spec, {
  name: 'Update Contact',
  key: 'update_contact',
  description: `Update an existing contact's attributes, list memberships, or blacklist status. Identify the contact by email, contact ID, external ID, or phone number.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      identifier: z
        .string()
        .describe('Contact email, contact ID, ext_id, phone, or WhatsApp ID'),
      identifierType: z
        .enum([
          'email_id',
          'contact_id',
          'ext_id',
          'phone_id',
          'whatsapp_id',
          'landline_number_id'
        ])
        .optional()
        .describe(
          'Type of identifier. Required for ext_id, phone_id, whatsapp_id, landline_number_id'
        ),
      attributes: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom attributes to update (keys must be capitalized)'),
      emailBlacklisted: z.boolean().optional().describe('Set email blacklist status'),
      smsBlacklisted: z.boolean().optional().describe('Set SMS blacklist status'),
      listIds: z.array(z.number()).optional().describe('List IDs to add the contact to'),
      unlinkListIds: z
        .array(z.number())
        .optional()
        .describe('List IDs to remove the contact from'),
      extId: z.string().optional().describe('Set or update external ID')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the update was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    await client.updateContact(ctx.input.identifier, {
      identifierType: ctx.input.identifierType,
      attributes: ctx.input.attributes,
      emailBlacklisted: ctx.input.emailBlacklisted,
      smsBlacklisted: ctx.input.smsBlacklisted,
      listIds: ctx.input.listIds,
      unlinkListIds: ctx.input.unlinkListIds,
      extId: ctx.input.extId
    });

    return {
      output: { success: true },
      message: `Contact **${ctx.input.identifier}** updated successfully.`
    };
  });

export let deleteContact = SlateTool.create(spec, {
  name: 'Delete Contact',
  key: 'delete_contact',
  description: `Permanently delete a contact from Brevo. This action is irreversible.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      identifier: z
        .string()
        .describe('Contact email, contact ID, ext_id, phone, or WhatsApp ID'),
      identifierType: z
        .enum([
          'email_id',
          'contact_id',
          'ext_id',
          'phone_id',
          'whatsapp_id',
          'landline_number_id'
        ])
        .optional()
        .describe('Type of identifier')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    await client.deleteContact(ctx.input.identifier, ctx.input.identifierType);

    return {
      output: { success: true },
      message: `Contact **${ctx.input.identifier}** deleted permanently.`
    };
  });

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `Retrieve a paginated list of contacts. Filter by modification date, creation date, list membership, or segment.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Number of contacts per page (default: 50)'),
      offset: z.number().optional().describe('Index of the first contact (default: 0)'),
      modifiedSince: z
        .string()
        .optional()
        .describe(
          'Filter contacts modified after this UTC date-time (YYYY-MM-DDTHH:mm:ss.SSSZ)'
        ),
      createdSince: z
        .string()
        .optional()
        .describe('Filter contacts created after this UTC date-time'),
      sort: z
        .enum(['asc', 'desc'])
        .optional()
        .describe('Sort order by creation date (default: desc)'),
      segmentId: z
        .number()
        .optional()
        .describe('Filter by segment ID (mutually exclusive with listIds)'),
      listIds: z
        .array(z.number())
        .optional()
        .describe('Filter by list IDs (mutually exclusive with segmentId)')
    })
  )
  .output(
    z.object({
      contacts: z
        .array(
          z.object({
            contactId: z.number().describe('Contact ID'),
            email: z.string().optional().describe('Contact email'),
            emailBlacklisted: z.boolean().describe('Email blacklist status'),
            smsBlacklisted: z.boolean().describe('SMS blacklist status'),
            createdAt: z.string().describe('Creation timestamp'),
            modifiedAt: z.string().describe('Last modification timestamp'),
            listIds: z.array(z.number()).describe('Associated list IDs'),
            attributes: z.record(z.string(), z.any()).optional().describe('Custom attributes')
          })
        )
        .describe('List of contacts'),
      count: z.number().describe('Total number of contacts matching the filter')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    let result = await client.listContacts({
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      modifiedSince: ctx.input.modifiedSince,
      createdSince: ctx.input.createdSince,
      sort: ctx.input.sort,
      segmentId: ctx.input.segmentId,
      listIds: ctx.input.listIds
    });

    let contacts = (result.contacts ?? []).map((c: any) => ({
      contactId: c.id,
      email: c.email,
      emailBlacklisted: c.emailBlacklisted,
      smsBlacklisted: c.smsBlacklisted,
      createdAt: c.createdAt,
      modifiedAt: c.modifiedAt,
      listIds: c.listIds ?? [],
      attributes: c.attributes
    }));

    return {
      output: { contacts, count: result.count },
      message: `Retrieved **${contacts.length}** contacts (${result.count} total).`
    };
  });
