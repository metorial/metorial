import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { SmsAlertClient, type SmsAlertResponse } from '../lib/client';
import {
  contactIdSchema,
  groupIdSchema,
  limitSchema,
  orderSchema,
  pageSchema
} from '../lib/schemas';
import { spec } from '../spec';

export let manageContacts = SlateTool.create(spec, {
  name: 'Manage Contacts',
  key: 'manage_contacts',
  description: `List, create, edit, or delete contacts within contact groups. Contacts are organized by groups. Use manage_groups action list to discover group IDs, then list contacts to discover contact IDs; existing name and number inputs can also discover IDs.`,
  instructions: [
    'To list contacts, use action "list". Optionally filter by group name.',
    'To create a contact, provide the group name, contact name, and mobile number.',
    'To edit, use contactId and the new name and number, or a group plus contact ID/current number to preserve unspecified values.',
    'To delete, supply contactId, or a group and mobile number to discover the contact.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'create', 'edit', 'delete'])
        .describe('Action to perform on contacts.'),
      groupId: groupIdSchema,
      contactId: contactIdSchema,
      page: pageSchema,
      limit: limitSchema,
      order: orderSchema,
      groupName: z
        .string()
        .optional()
        .describe(
          'Group name (required for create). For list or contact discovery, use this or groupId from manage_groups action list.'
        ),
      contactName: z
        .string()
        .optional()
        .describe('Name of the contact (required for create, optional for edit).'),
      mobileNumber: z
        .string()
        .optional()
        .describe(
          'Mobile number: required for create, a new number for edit, or a lookup number for delete when contactId is omitted.'
        ),
      oldMobileNumber: z
        .string()
        .optional()
        .describe(
          'Current mobile number to discover the contact for edit when contactId is not supplied.'
        )
    })
  )
  .output(
    z.object({
      status: z.string().describe('Status of the API response.'),
      description: z.any().describe('Response details including contact data or confirmation.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SmsAlertClient(ctx.auth);

    let result: SmsAlertResponse;

    if (ctx.input.action === 'list') {
      ctx.info('Listing contacts');
      result = await client.listContacts(ctx.input);
      return {
        output: {
          status: result.status || 'unknown',
          description: result.description ?? result
        },
        message:
          ctx.input.groupName || ctx.input.groupId
            ? `Retrieved a page of contacts from group **${ctx.input.groupName || ctx.input.groupId}**`
            : `Retrieved a page of contacts across groups`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.groupName)
        throw createApiServiceError('Group name is required to create a contact.');
      if (!ctx.input.contactName) throw createApiServiceError('Contact name is required.');
      if (!ctx.input.mobileNumber) throw createApiServiceError('Mobile number is required.');

      ctx.info(`Creating contact ${ctx.input.contactName} in group ${ctx.input.groupName}`);
      result = await client.createContact({
        groupName: ctx.input.groupName,
        name: ctx.input.contactName,
        mobileNo: ctx.input.mobileNumber
      });

      return {
        output: {
          status: result.status || 'unknown',
          description: result.description ?? result
        },
        message: `Contact **${ctx.input.contactName}** created in group **${ctx.input.groupName}**`
      };
    }

    if (ctx.input.action === 'edit') {
      if (!ctx.input.contactId && !ctx.input.groupName && !ctx.input.groupId)
        throw createApiServiceError('Provide contactId or a group to discover the contact.');
      if (!ctx.input.oldMobileNumber && !ctx.input.contactId)
        throw createApiServiceError(
          'Current mobile number (oldMobileNumber) is required to identify the contact.'
        );

      if (!ctx.input.contactName && !ctx.input.mobileNumber)
        throw createApiServiceError('Provide contactName or mobileNumber to update.');

      ctx.info(`Editing contact ${ctx.input.oldMobileNumber} in group ${ctx.input.groupName}`);
      result = await client.editContact({
        groupName: ctx.input.groupName,
        groupId: ctx.input.groupId,
        contactId: ctx.input.contactId,
        oldMobileNo: ctx.input.oldMobileNumber,
        newMobileNo: ctx.input.mobileNumber,
        name: ctx.input.contactName
      });

      return {
        output: {
          status: result.status || 'unknown',
          description: result.description ?? result
        },
        message: `Contact **${ctx.input.contactId || ctx.input.oldMobileNumber}** updated`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.contactId && !ctx.input.groupName && !ctx.input.groupId)
        throw createApiServiceError('Provide contactId or a group to discover the contact.');
      if (!ctx.input.mobileNumber && !ctx.input.contactId)
        throw createApiServiceError('Mobile number is required to delete a contact.');

      ctx.info(`Deleting contact ${ctx.input.mobileNumber} from group ${ctx.input.groupName}`);
      result = await client.deleteContact({
        groupName: ctx.input.groupName,
        groupId: ctx.input.groupId,
        contactId: ctx.input.contactId,
        mobileNo: ctx.input.mobileNumber
      });

      return {
        output: {
          status: result.status || 'unknown',
          description: result.description ?? result
        },
        message: `Contact **${ctx.input.mobileNumber || ctx.input.contactId}** deleted`
      };
    }

    throw createApiServiceError(`Invalid action: ${ctx.input.action}`);
  })
  .build();
