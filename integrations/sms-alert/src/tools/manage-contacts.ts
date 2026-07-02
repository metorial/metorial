import { SlateTool } from 'slates';
import { z } from 'zod';
import { SmsAlertClient } from '../lib/client';
import { spec } from '../spec';

export let manageContacts = SlateTool.create(spec, {
  name: 'Manage Contacts',
  key: 'manage_contacts',
  description: `List, create, edit, or delete contacts within contact groups. Contacts are organized by groups and identified by their mobile number.`,
  instructions: [
    'To list contacts, use action "list". Optionally filter by group name.',
    'To create a contact, provide the group name, contact name, and mobile number.',
    'To edit, provide the group name, the current mobile number (oldMobileNumber), and the new values.',
    'To delete, provide the group name and mobile number of the contact to remove.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'create', 'edit', 'delete'])
        .describe('Action to perform on contacts.'),
      groupName: z
        .string()
        .optional()
        .describe(
          'Group name the contact belongs to (required for create, edit, delete; optional filter for list).'
        ),
      contactName: z
        .string()
        .optional()
        .describe('Name of the contact (required for create, optional for edit).'),
      mobileNumber: z
        .string()
        .optional()
        .describe('Mobile number of the contact (required for create and delete).'),
      oldMobileNumber: z
        .string()
        .optional()
        .describe('Current mobile number of the contact to edit (required for edit).')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Status of the API response.'),
      description: z.any().describe('Response details including contact data or confirmation.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SmsAlertClient({ token: ctx.auth.token });

    let result: any;

    if (ctx.input.action === 'list') {
      ctx.info('Listing contacts');
      result = await client.listContacts({ groupName: ctx.input.groupName });
      return {
        output: {
          status: result.status || 'unknown',
          description: result.description || result
        },
        message: ctx.input.groupName
          ? `Retrieved contacts from group **${ctx.input.groupName}**`
          : `Retrieved all contacts`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.groupName) throw new Error('Group name is required to create a contact.');
      if (!ctx.input.contactName) throw new Error('Contact name is required.');
      if (!ctx.input.mobileNumber) throw new Error('Mobile number is required.');

      ctx.info(`Creating contact ${ctx.input.contactName} in group ${ctx.input.groupName}`);
      result = await client.createContact({
        groupName: ctx.input.groupName,
        name: ctx.input.contactName,
        mobileNo: ctx.input.mobileNumber
      });

      return {
        output: {
          status: result.status || 'unknown',
          description: result.description || result
        },
        message: `Contact **${ctx.input.contactName}** created in group **${ctx.input.groupName}**`
      };
    }

    if (ctx.input.action === 'edit') {
      if (!ctx.input.groupName) throw new Error('Group name is required to edit a contact.');
      if (!ctx.input.oldMobileNumber)
        throw new Error(
          'Current mobile number (oldMobileNumber) is required to identify the contact.'
        );

      ctx.info(`Editing contact ${ctx.input.oldMobileNumber} in group ${ctx.input.groupName}`);
      result = await client.editContact({
        groupName: ctx.input.groupName,
        oldMobileNo: ctx.input.oldMobileNumber,
        newMobileNo: ctx.input.mobileNumber,
        name: ctx.input.contactName
      });

      return {
        output: {
          status: result.status || 'unknown',
          description: result.description || result
        },
        message: `Contact updated in group **${ctx.input.groupName}**`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.groupName) throw new Error('Group name is required to delete a contact.');
      if (!ctx.input.mobileNumber)
        throw new Error('Mobile number is required to delete a contact.');

      ctx.info(`Deleting contact ${ctx.input.mobileNumber} from group ${ctx.input.groupName}`);
      result = await client.deleteContact({
        groupName: ctx.input.groupName,
        mobileNo: ctx.input.mobileNumber
      });

      return {
        output: {
          status: result.status || 'unknown',
          description: result.description || result
        },
        message: `Contact **${ctx.input.mobileNumber}** deleted from group **${ctx.input.groupName}**`
      };
    }

    throw new Error(`Invalid action: ${ctx.input.action}`);
  })
  .build();
