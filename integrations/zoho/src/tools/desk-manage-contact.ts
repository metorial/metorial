import { SlateTool } from 'slates';
import { z } from 'zod';
import { ZohoDeskClient } from '../lib/client';
import { zohoServiceError } from '../lib/errors';
import type { Datacenter } from '../lib/urls';
import { spec } from '../spec';

export let deskManageContact = SlateTool.create(spec, {
  name: 'Desk Manage Contact',
  key: 'desk_manage_contact',
  description:
    'List, get, create, update, or delete Zoho Desk contacts. Useful for managing requesters before creating support tickets.',
  instructions: [
    'The orgId parameter is required for all contact operations.',
    'For create, provide at least lastName or email depending on your Desk portal requirements.',
    'For update, get, and delete, provide contactId.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      orgId: z.string().describe('Zoho Desk organization ID'),
      action: z.enum(['list', 'get', 'create', 'update', 'delete']).describe('Operation'),
      contactId: z.string().optional().describe('Contact ID for get, update, and delete'),
      firstName: z.string().optional().describe('Contact first name'),
      lastName: z.string().optional().describe('Contact last name'),
      email: z.string().optional().describe('Contact email address'),
      phone: z.string().optional().describe('Contact phone number'),
      mobile: z.string().optional().describe('Contact mobile number'),
      accountId: z.string().optional().describe('Associated Desk account ID'),
      description: z.string().optional().describe('Contact description'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom field values as key-value pairs'),
      from: z.number().optional().describe('Starting index for list pagination'),
      limit: z.number().optional().describe('Number of contacts to list, max 100'),
      sortBy: z
        .string()
        .optional()
        .describe('Sort field, e.g. "firstName", "lastName", "email", or "modifiedTime"')
    })
  )
  .output(
    z.object({
      contact: z.record(z.string(), z.any()).optional().describe('Contact record'),
      contacts: z.array(z.record(z.string(), z.any())).optional().describe('Contact records'),
      contactId: z.string().optional().describe('Contact ID'),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let dc = (ctx.auth.datacenter || ctx.config.datacenter || 'us') as Datacenter;
    let client = new ZohoDeskClient({
      token: ctx.auth.token,
      datacenter: dc,
      orgId: ctx.input.orgId
    });

    if (ctx.input.action === 'list') {
      let result = await client.listContacts({
        from: ctx.input.from,
        limit: ctx.input.limit,
        sortBy: ctx.input.sortBy
      });
      let contacts = result?.data || result || [];
      return {
        output: { contacts: Array.isArray(contacts) ? contacts : [] },
        message: `Retrieved **${Array.isArray(contacts) ? contacts.length : 0}** Desk contacts.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.contactId) throw zohoServiceError('contactId is required for get');
      let contact = await client.getContact(ctx.input.contactId);
      return {
        output: { contact, contactId: contact?.id || ctx.input.contactId },
        message: `Fetched Desk contact **${contact?.lastName || ctx.input.contactId}**.`
      };
    }

    let buildData = () => {
      let data: Record<string, any> = {};
      if (ctx.input.firstName) data.firstName = ctx.input.firstName;
      if (ctx.input.lastName) data.lastName = ctx.input.lastName;
      if (ctx.input.email) data.email = ctx.input.email;
      if (ctx.input.phone) data.phone = ctx.input.phone;
      if (ctx.input.mobile) data.mobile = ctx.input.mobile;
      if (ctx.input.accountId) data.accountId = ctx.input.accountId;
      if (ctx.input.description) data.description = ctx.input.description;
      if (ctx.input.customFields) data.cf = ctx.input.customFields;
      return data;
    };

    if (ctx.input.action === 'create') {
      let contact = await client.createContact(buildData());
      return {
        output: { contact, contactId: contact?.id },
        message: `Created Desk contact **${contact?.lastName || contact?.email || contact?.id}**.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.contactId) throw zohoServiceError('contactId is required for update');
      let contact = await client.updateContact(ctx.input.contactId, buildData());
      return {
        output: { contact, contactId: contact?.id || ctx.input.contactId },
        message: `Updated Desk contact **${ctx.input.contactId}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.contactId) throw zohoServiceError('contactId is required for delete');
      await client.deleteContact(ctx.input.contactId);
      return {
        output: { contactId: ctx.input.contactId, deleted: true },
        message: `Deleted Desk contact **${ctx.input.contactId}**.`
      };
    }

    throw zohoServiceError('Invalid Desk contact action.');
  })
  .build();
